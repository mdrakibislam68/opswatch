package main

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	"github.com/opswatch/agent/internal/collectors"
	"github.com/opswatch/agent/internal/docker"
	"github.com/opswatch/agent/internal/sender"
)

func main() {
	// Load .env if present
	_ = godotenv.Load()

	apiURL := getEnv("OPSWATCH_API_URL", "http://localhost:4000/api/v1")
	apiKey := getEnv("OPSWATCH_API_KEY", "")
	intervalStr := getEnv("OPSWATCH_INTERVAL", "10")
	interval, _ := strconv.Atoi(intervalStr)

	if apiKey == "" {
		log.Fatal("OPSWATCH_API_KEY is required")
	}

	log.Printf("🚀 OpsWatch Agent starting - reporting every %ds to %s", interval, apiURL)

	s := sender.New(apiURL, apiKey)
	dockerClient := docker.New()

	ticker := time.NewTicker(time.Duration(interval) * time.Second)
	defer ticker.Stop()

	for {
		<-ticker.C

		// Collect system metrics
		sysMetrics, err := collectors.CollectSystem()
		if err != nil {
			log.Printf("System metrics error: %v", err)
			continue
		}

		// Send metrics
		if err := s.SendMetrics(sysMetrics); err != nil {
			log.Printf("Failed to send metrics: %v", err)
		}

		// Collect and send container metrics
		containers, err := dockerClient.ListContainers()
		if err != nil {
			log.Printf("Docker error: %v", err)
		} else {
			if err := s.SyncContainers(containers); err != nil {
				log.Printf("Failed to sync containers: %v", err)
			}
		}
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
