package nginx

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/opswatch/agent/internal/docker"
)

type DomainInfo struct {
	Domain        string `json:"domain"`
	ProxyPass     string `json:"proxyPass"`
	Port          int    `json:"port"`
	SSL           bool   `json:"ssl"`
	ConfigFile    string `json:"configFile"`
	ConfigContent string `json:"configContent"`
	ContainerID   string `json:"containerId"`
	ContainerName string `json:"containerName"`
}

// ScanDomains discovers all nginx-configured domains and matches them
// to Docker containers by port mapping. Results are deduplicated by
// domain name — entries from sites-enabled take priority over
// sites-available since the latter are often symlinks of the former.
func ScanDomains(dockerClient *docker.Client) []DomainInfo {
	blocks, upstreams := ScanNginxConfigs()

	containers, err := dockerClient.ListContainers()
	if err != nil {
		log.Printf("Domain scan: failed to list containers: %v", err)
		containers = nil
	}

	portMap := buildPortMap(containers)

	// Use a map to deduplicate: prefer sites-enabled entries.
	seen := make(map[string]DomainInfo)

	for _, block := range blocks {
		port := ResolveProxyPort(block.ProxyPass, upstreams)
		configContent := readConfigFile(block.ConfigFile)
		containerID, containerName := matchContainer(port, portMap)

		// sites-enabled has priority over sites-available
		isSitesEnabled := strings.Contains(block.ConfigFile, "sites-enabled")

		for _, name := range block.ServerNames {
			existing, alreadySeen := seen[name]
			// Only overwrite if this is the first time, or if this
			// entry comes from sites-enabled (higher priority).
			if !alreadySeen || isSitesEnabled || !strings.Contains(existing.ConfigFile, "sites-enabled") {
				seen[name] = DomainInfo{
					Domain:        name,
					ProxyPass:     block.ProxyPass,
					Port:          port,
					SSL:           block.SSL,
					ConfigFile:    block.ConfigFile,
					ConfigContent: configContent,
					ContainerID:   containerID,
					ContainerName: containerName,
				}
			}
		}
	}

	domains := make([]DomainInfo, 0, len(seen))
	for _, d := range seen {
		domains = append(domains, d)
	}
	return domains
}

type containerPortInfo struct {
	DockerID string
	Name     string
}

func buildPortMap(containers []docker.ContainerInfo) map[int]containerPortInfo {
	pm := make(map[int]containerPortInfo)
	for _, c := range containers {
		for _, portStr := range c.Ports {
			port := extractPublicPort(portStr)
			if port > 0 {
				pm[port] = containerPortInfo{
					DockerID: c.DockerID,
					Name:     c.Name,
				}
			}
		}
	}
	return pm
}

func extractPublicPort(portMapping string) int {
	// Formats: "0.0.0.0:4001->4001/tcp", "4001/tcp", "4001"
	parts := strings.Split(portMapping, "->")
	var hostPart string
	if len(parts) == 2 {
		hostPart = parts[0]
	} else {
		hostPart = strings.Split(portMapping, "/")[0]
	}

	// Extract the port number from host part (e.g. "0.0.0.0:4001" -> "4001")
	if idx := strings.LastIndex(hostPart, ":"); idx >= 0 {
		hostPart = hostPart[idx+1:]
	}

	port, err := strconv.Atoi(strings.TrimSpace(hostPart))
	if err != nil {
		return 0
	}
	return port
}

func matchContainer(port int, portMap map[int]containerPortInfo) (string, string) {
	if port <= 0 {
		return "", ""
	}
	if info, ok := portMap[port]; ok {
		return info.DockerID, info.Name
	}
	return "", ""
}

func readConfigFile(path string) string {
	if path == "" {
		return ""
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Sprintf("# Error reading config: %v", err)
	}
	const maxSize = 64 * 1024
	if len(data) > maxSize {
		return string(data[:maxSize]) + "\n# ... truncated ..."
	}
	return string(data)
}
