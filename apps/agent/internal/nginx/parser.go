package nginx

import (
	"bufio"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

var (
	serverBlockRe  = regexp.MustCompile(`^\s*server\s*\{`)
	serverNameRe   = regexp.MustCompile(`^\s*server_name\s+(.+?)\s*;`)
	proxyPassRe    = regexp.MustCompile(`^\s*proxy_pass\s+(.+?)\s*;`)
	listenSSLRe    = regexp.MustCompile(`^\s*listen\s+.*\bssl\b`)
	sslCertRe      = regexp.MustCompile(`^\s*ssl_certificate\s+`)
	includeRe      = regexp.MustCompile(`^\s*include\s+(.+?)\s*;`)
	upstreamRe     = regexp.MustCompile(`^\s*upstream\s+(\S+)\s*\{`)
	upstreamServerRe = regexp.MustCompile(`^\s*server\s+(.+?)\s*;`)
)

type serverBlock struct {
	ServerNames []string
	ProxyPass   string
	SSL         bool
	ConfigFile  string
}

type upstreamBlock struct {
	Name    string
	Servers []string
}

func parseConfigFile(path string, visited map[string]bool) ([]serverBlock, map[string]upstreamBlock, error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, nil, err
	}
	if visited[absPath] {
		return nil, nil, nil
	}
	visited[absPath] = true

	file, err := os.Open(absPath)
	if err != nil {
		return nil, nil, err
	}
	defer file.Close()

	var (
		blocks    []serverBlock
		upstreams = make(map[string]upstreamBlock)
		lines     []string
	)

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		return nil, nil, err
	}

	i := 0
	for i < len(lines) {
		line := lines[i]

		if m := includeRe.FindStringSubmatch(line); m != nil {
			includePath := strings.TrimSpace(m[1])
			resolvedPaths := resolveInclude(includePath, filepath.Dir(absPath))
			for _, p := range resolvedPaths {
				incBlocks, incUpstreams, err := parseConfigFile(p, visited)
				if err != nil {
					continue
				}
				blocks = append(blocks, incBlocks...)
				for k, v := range incUpstreams {
					upstreams[k] = v
				}
			}
			i++
			continue
		}

		if upstreamRe.MatchString(line) {
			ub, endIdx := parseUpstreamBlock(lines, i)
			if ub.Name != "" {
				upstreams[ub.Name] = ub
			}
			i = endIdx + 1
			continue
		}

		if serverBlockRe.MatchString(line) {
			sb, endIdx := parseServerBlock(lines, i, absPath)
			if len(sb.ServerNames) > 0 {
				blocks = append(blocks, sb)
			}
			i = endIdx + 1
			continue
		}

		i++
	}

	return blocks, upstreams, nil
}

func parseServerBlock(lines []string, startIdx int, configFile string) (serverBlock, int) {
	sb := serverBlock{ConfigFile: configFile}
	depth := 0

	for i := startIdx; i < len(lines); i++ {
		line := lines[i]

		depth += strings.Count(line, "{") - strings.Count(line, "}")

		if m := serverNameRe.FindStringSubmatch(line); m != nil {
			names := strings.Fields(m[1])
			for _, n := range names {
				if n != "_" && n != "" && n != "localhost" {
					sb.ServerNames = append(sb.ServerNames, n)
				}
			}
		}

		if m := proxyPassRe.FindStringSubmatch(line); m != nil {
			sb.ProxyPass = strings.TrimSpace(m[1])
		}

		if listenSSLRe.MatchString(line) || sslCertRe.MatchString(line) {
			sb.SSL = true
		}

		if depth <= 0 && i > startIdx {
			return sb, i
		}
	}

	return sb, len(lines) - 1
}

func parseUpstreamBlock(lines []string, startIdx int) (upstreamBlock, int) {
	ub := upstreamBlock{}
	depth := 0

	if m := upstreamRe.FindStringSubmatch(lines[startIdx]); m != nil {
		ub.Name = m[1]
	}

	for i := startIdx; i < len(lines); i++ {
		line := lines[i]
		depth += strings.Count(line, "{") - strings.Count(line, "}")

		if m := upstreamServerRe.FindStringSubmatch(line); m != nil && i != startIdx {
			ub.Servers = append(ub.Servers, strings.TrimSpace(m[1]))
		}

		if depth <= 0 && i > startIdx {
			return ub, i
		}
	}

	return ub, len(lines) - 1
}

func resolveInclude(pattern string, baseDir string) []string {
	if !filepath.IsAbs(pattern) {
		pattern = filepath.Join(baseDir, pattern)
	}

	matches, err := filepath.Glob(pattern)
	if err != nil || len(matches) == 0 {
		return nil
	}
	return matches
}

// ScanNginxConfigs parses all nginx config locations and returns discovered server blocks.
func ScanNginxConfigs() ([]serverBlock, map[string]upstreamBlock) {
	configPaths := []string{
		"/etc/nginx/nginx.conf",
		"/etc/nginx/sites-enabled",
		"/etc/nginx/sites-available",
	}

	visited := make(map[string]bool)
	var allBlocks []serverBlock
	allUpstreams := make(map[string]upstreamBlock)

	for _, p := range configPaths {
		info, err := os.Stat(p)
		if err != nil {
			continue
		}

		if info.IsDir() {
			entries, err := os.ReadDir(p)
			if err != nil {
				continue
			}
			for _, entry := range entries {
				if entry.IsDir() {
					continue
				}
				filePath := filepath.Join(p, entry.Name())
				blocks, upstreams, err := parseConfigFile(filePath, visited)
				if err != nil {
					continue
				}
				allBlocks = append(allBlocks, blocks...)
				for k, v := range upstreams {
					allUpstreams[k] = v
				}
			}
		} else {
			blocks, upstreams, err := parseConfigFile(p, visited)
			if err != nil {
				continue
			}
			allBlocks = append(allBlocks, blocks...)
			for k, v := range upstreams {
				allUpstreams[k] = v
			}
		}
	}

	return allBlocks, allUpstreams
}

// ResolveProxyPort extracts the target port from a proxy_pass value,
// resolving upstream names if needed.
func ResolveProxyPort(proxyPass string, upstreams map[string]upstreamBlock) int {
	if proxyPass == "" {
		return 0
	}

	parsed, err := url.Parse(proxyPass)
	if err != nil {
		return 0
	}

	host := parsed.Host
	if host == "" {
		host = parsed.Opaque
	}

	// Check if host references an upstream block
	hostOnly := host
	if idx := strings.LastIndex(host, ":"); idx != -1 {
		hostOnly = host[:idx]
	}
	if ub, ok := upstreams[hostOnly]; ok && len(ub.Servers) > 0 {
		host = ub.Servers[0]
	}
	if ub, ok := upstreams[host]; ok && len(ub.Servers) > 0 {
		host = ub.Servers[0]
	}

	_, portStr, _ := splitHostPort(host)
	if portStr == "" {
		if parsed.Scheme == "https" {
			return 443
		}
		return 80
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return 0
	}
	return port
}

func splitHostPort(hostport string) (string, string, error) {
	idx := strings.LastIndex(hostport, ":")
	if idx < 0 {
		return hostport, "", nil
	}
	// Handle IPv6 [::1]:port
	if strings.Contains(hostport, "[") {
		end := strings.Index(hostport, "]")
		if end < 0 {
			return hostport, "", fmt.Errorf("invalid host:port")
		}
		if end+1 < len(hostport) && hostport[end+1] == ':' {
			return hostport[:end+1], hostport[end+2:], nil
		}
		return hostport[:end+1], "", nil
	}
	return hostport[:idx], hostport[idx+1:], nil
}
