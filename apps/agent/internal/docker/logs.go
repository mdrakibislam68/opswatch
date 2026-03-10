package docker

import (
	"context"
	"fmt"
	"io"
	"log"
	"strings"

	"github.com/docker/docker/api/types/container"
)

// ResolveContainerID looks up a proper full container ID from a short ID or name
func (c *Client) ResolveContainerID(ctx context.Context, idOrName string) (string, error) {
	if c.cli == nil {
		return "", fmt.Errorf("Docker client not initialized")
	}

	// Try inspect first (works for full IDs and some names/short IDs natively)
	insp, err := c.cli.ContainerInspect(ctx, idOrName)
	if err == nil {
		return insp.ID, nil
	}

	log.Printf("Direct inspect failed for '%s', attempting lookup...", idOrName)

	// Fallback lookup step as requested for short IDs
	containers, err := c.cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return "", fmt.Errorf("failed to list containers for lookup: %w", err)
	}

	for _, ct := range containers {
		// Match full ID or short ID (prefix)
		if ct.ID == idOrName || strings.HasPrefix(ct.ID, idOrName) {
			return ct.ID, nil
		}
		// Match name (which usually has a leading slash)
		for _, name := range ct.Names {
			cleanName := strings.TrimPrefix(name, "/")
			if cleanName == idOrName {
				return ct.ID, nil
			}
		}
	}

	return "", fmt.Errorf("container %s not found in lookup", idOrName)
}

// GetContainerLogs returns a stream to the container logs
func (c *Client) GetContainerLogs(ctx context.Context, idOrName string, tail string, timestamps bool, follow bool) (io.ReadCloser, error) {
	log.Printf("Requested container: %s", idOrName)

	fullID, err := c.ResolveContainerID(ctx, idOrName)
	if err != nil {
		return nil, fmt.Errorf("container lookup failed: %w", err)
	}

	log.Printf("Resolved to full container ID: %s (tail=%s, follow=%v)", fullID, tail, follow)

	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Timestamps: timestamps,
		Follow:     follow,
		Tail:       tail,
	}

	logsReader, err := c.cli.ContainerLogs(ctx, fullID, options)
	if err != nil {
		return nil, fmt.Errorf("failed to get container logs: %w", err)
	}

	return logsReader, nil
}
