package collectors

import (
	"runtime"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type SystemMetrics struct {
	CPUUsage     float64 `json:"cpuUsage"`
	RAMUsage     float64 `json:"ramUsage"`
	DiskUsage    float64 `json:"diskUsage"`
	LoadAvg      float64 `json:"loadAvg"`
	NetRx        uint64  `json:"netRx"`
	NetTx        uint64  `json:"netTx"`
	UptimeSeconds uint64  `json:"uptimeSeconds"`
	OS           string  `json:"os"`
	Arch         string  `json:"arch"`
	TotalRAM     uint64  `json:"totalRam"`
	TotalDisk    uint64  `json:"totalDisk"`
	AgentVersion string  `json:"agentVersion"`
}

const AgentVersion = "1.0.0"

func CollectSystem() (*SystemMetrics, error) {
	// CPU
	cpuPcts, err := cpu.Percent(500*time.Millisecond, false)
	if err != nil {
		return nil, err
	}
	cpuUsage := 0.0
	if len(cpuPcts) > 0 {
		cpuUsage = cpuPcts[0]
	}

	// RAM
	vmStat, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}
	ramUsage := vmStat.UsedPercent

	// Disk (root partition)
	diskStat, err := disk.Usage("/")
	if err != nil {
		// Try Windows drive
		diskStat, err = disk.Usage("C:\\")
		if err != nil {
			return nil, err
		}
	}

	// Load average
	loadStat, _ := load.Avg()
	loadAvg := 0.0
	if loadStat != nil {
		loadAvg = loadStat.Load1
	}

	// Network
	netStats, _ := net.IOCounters(false)
	var netRx, netTx uint64
	if len(netStats) > 0 {
		netRx = netStats[0].BytesRecv
		netTx = netStats[0].BytesSent
	}

	// Host info
	hostInfo, _ := host.Info()
	uptimeSeconds := uint64(0)
	osName := runtime.GOOS
	if hostInfo != nil {
		uptimeSeconds = hostInfo.Uptime
		osName = hostInfo.OS
	}

	return &SystemMetrics{
		CPUUsage:      cpuUsage,
		RAMUsage:      ramUsage,
		DiskUsage:     diskStat.UsedPercent,
		LoadAvg:       loadAvg,
		NetRx:         netRx,
		NetTx:         netTx,
		UptimeSeconds: uptimeSeconds,
		OS:            osName,
		Arch:          runtime.GOARCH,
		TotalRAM:      vmStat.Total,
		TotalDisk:     diskStat.Total,
		AgentVersion:  AgentVersion,
	}, nil
}
