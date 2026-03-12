package sender

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/opswatch/agent/internal/collectors"
	"github.com/opswatch/agent/internal/docker"
	"github.com/opswatch/agent/internal/nginx"
)

type Sender struct {
	apiURL     string
	apiKey     string
	httpClient *http.Client
}

func New(apiURL, apiKey string) *Sender {
	return &Sender{
		apiURL: apiURL,
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *Sender) SendMetrics(metrics *collectors.SystemMetrics) error {
	return s.post("/metrics/ingest", metrics)
}

func (s *Sender) SyncContainers(containers []docker.ContainerInfo) error {
	payload := map[string]interface{}{"containers": containers}
	return s.post("/containers/sync", payload)
}

func (s *Sender) SyncDomains(domains []nginx.DomainInfo) error {
	payload := map[string]interface{}{"domains": domains}
	return s.post("/domains/sync", payload)
}

func (s *Sender) post(path string, data interface{}) error {
	body, err := json.Marshal(data)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", s.apiURL+path, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-KEY", s.apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("API error: HTTP %d", resp.StatusCode)
	}

	return nil
}
