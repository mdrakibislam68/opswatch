package docker

import (
	"context"
	"encoding/json"
	"io"
	"strings"
	"fmt"

	dockerTypes "github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	dockerClient "github.com/docker/docker/client"
)

type ContainerInfo struct {
	DockerID     string   `json:"dockerId"`
	Name         string   `json:"name"`
	Image        string   `json:"image"`
	Status       string   `json:"status"`
	CPUPercent   float64  `json:"cpuPercent"`
	MemoryUsage  int64    `json:"memoryUsage"`
	MemoryLimit  int64    `json:"memoryLimit"`
	RestartCount int      `json:"restartCount"`
	StartedAt    string   `json:"startedAt"`
	Ports        []string `json:"ports"`
	NetworkRx    uint64   `json:"networkRx"`
	NetworkTx    uint64   `json:"networkTx"`
}

type Client struct {
	cli *dockerClient.Client
}

func New() *Client {
	cli, err := dockerClient.NewClientWithOpts(
		dockerClient.FromEnv,
		dockerClient.WithAPIVersionNegotiation(),
	)
	if err != nil {
		return &Client{}
	}
	return &Client{cli: cli}
}

func (c *Client) ListContainers() ([]ContainerInfo, error) {
	if c.cli == nil {
		return nil, nil
	}

	ctx := context.Background()
	containers, err := c.cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, err
	}

	var result []ContainerInfo
	for _, ct := range containers {
		info := ContainerInfo{
			DockerID:     ct.ID[:12],
			Name:         strings.TrimPrefix(ct.Names[0], "/"),
			Image:        ct.Image,
			Status:       ct.State,
			RestartCount: 0,
		}

		// Ports
		for _, p := range ct.Ports {
			if p.PublicPort > 0 {
				info.Ports = append(info.Ports, formatPort(p))
			}
		}

		// Stats (CPU + Memory)
		if ct.State == "running" {
			stats, err := c.cli.ContainerStats(ctx, ct.ID, false)
			if err == nil {
				defer stats.Body.Close()
				var s dockerTypes.StatsJSON
				body, _ := io.ReadAll(stats.Body)
				json.Unmarshal(body, &s)

				info.CPUPercent = calculateCPUPercent(&s)
				info.MemoryUsage = int64(s.MemoryStats.Usage)
				info.MemoryLimit = int64(s.MemoryStats.Limit)

				for _, n := range s.Networks {
					info.NetworkRx += n.RxBytes
					info.NetworkTx += n.TxBytes
				}
			}

			// Inspect for restart count
			insp, err := c.cli.ContainerInspect(ctx, ct.ID)
			if err == nil {
				info.RestartCount = insp.RestartCount
				info.StartedAt = insp.State.StartedAt
			}
		}

		result = append(result, info)
	}

	return result, nil
}

func calculateCPUPercent(stats *dockerTypes.StatsJSON) float64 {
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage) - float64(stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage) - float64(stats.PreCPUStats.SystemUsage)
	if systemDelta == 0 || cpuDelta == 0 {
		return 0
	}
	numCPUs := float64(stats.CPUStats.OnlineCPUs)
	if numCPUs == 0 {
		numCPUs = float64(len(stats.CPUStats.CPUUsage.PercpuUsage))
	}
	return (cpuDelta / systemDelta) * numCPUs * 100.0
}

func formatPort(p dockerTypes.Port) string {
	if p.IP != "" {
		return strings.Join([]string{p.IP, ":", string(rune(p.PublicPort)), "->", string(rune(p.PrivatePort)), "/", p.Type}, "")
	}
	return ""
}

func (c *Client) ExecTerminal(ctx context.Context, idOrName string, cmd []string) (dockerTypes.HijackedResponse, error) {
	// First verify container is running and resolve full ID
	fullID, err := c.ResolveContainerID(ctx, idOrName)
	if err != nil {
		return dockerTypes.HijackedResponse{}, err
	}

	containerInfo, err := c.cli.ContainerInspect(ctx, fullID)
	if err != nil {
		return dockerTypes.HijackedResponse{}, err
	}
	if !containerInfo.State.Running {
		return dockerTypes.HijackedResponse{}, fmt.Errorf("container is not running")
	}

	execConfig := dockerTypes.ExecConfig{
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
		Cmd:          cmd,
	}

	execCreateResponse, err := c.cli.ContainerExecCreate(ctx, fullID, execConfig)
	if err != nil {
		return dockerTypes.HijackedResponse{}, err
	}

	attachConfig := dockerTypes.ExecStartCheck{
		Tty: true,
	}
	resp, err := c.cli.ContainerExecAttach(ctx, execCreateResponse.ID, attachConfig)
	if err != nil {
		return dockerTypes.HijackedResponse{}, err
	}

	err = c.cli.ContainerExecStart(ctx, execCreateResponse.ID, dockerTypes.ExecStartCheck{Tty: true})
	if err != nil {
		resp.Close()
		return dockerTypes.HijackedResponse{}, err
	}

	return resp, nil
}
