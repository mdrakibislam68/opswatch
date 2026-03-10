package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/opswatch/agent/internal/docker"
)

// Server represents the API server for the agent
type Server struct {
	dockerClient *docker.Client
}

// NewServer initializes the API server
func NewServer(dc *docker.Client) *Server {
	return &Server{dockerClient: dc}
}

// Start begins listening on the specified port
func (s *Server) Start(port string) error {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/containers/", s.handleContainers)

	log.Printf("Agent API server starting on port %s", port)
	return http.ListenAndServe(":"+port, mux)
}

func (s *Server) handleContainers(w http.ResponseWriter, r *http.Request) {
	// Path should be /api/containers/{id}/logs or /api/containers/{id}/logs/stream
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 || pathParts[0] != "api" || pathParts[1] != "containers" {
		http.NotFound(w, r)
		return
	}

	containerID := pathParts[2]
	endpoint := pathParts[3]

	if endpoint != "logs" {
		http.NotFound(w, r)
		return
	}

	isStream := len(pathParts) > 4 && pathParts[4] == "stream"

	tail := r.URL.Query().Get("tail")
	if tail == "" {
		tail = "100"
	}

	timestamps := true
	if r.URL.Query().Get("timestamps") == "false" {
		timestamps = false
	}

	logsReader, err := s.dockerClient.GetContainerLogs(r.Context(), containerID, tail, timestamps, isStream)
	if err != nil {
		log.Printf("Error getting container logs: %v", err)
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	defer logsReader.Close()

	if isStream {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		// Stream logs line by line
		// The Docker API multiplexes stdout/stderr, we use io.Copy for simplicity,
		// or parse the mux headers for clean SSE messages.
		// For robustness, io.Copy will just dump the bytes to the client.
		
		// To format as SSE precisely, we read chunks and split by newline.
		// A simple flushing mechanism:
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
			return
		}

		buf := make([]byte, 4096)
		for {
			n, err := logsReader.Read(buf)
			if n > 0 {
				chunk := buf[:n]
				// Basic fallback string conversion (ignores the 8-byte multiplex header for simplicity or sends format to client)
				// The Next.js frontend handles this by splitting lines.
				payload, _ := json.Marshal(map[string]string{"line": string(chunk)})
				fmt.Fprintf(w, "data:%s\n\n", payload)
				flusher.Flush()
			}
			if err != nil {
				if err != io.EOF {
					log.Printf("Stream error: %v", err)
				}
				break
			}
		}
		fmt.Fprintf(w, "data:{\"done\":true}\n\n")
		flusher.Flush()
		return
	}

	// Static logs request
	w.Header().Set("Content-Type", "application/json")
	
	bytes, err := io.ReadAll(logsReader)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"dockerId": containerID,
		"tail":     tail,
		"lines":    strings.Split(string(bytes), "\n"),
	}

	json.NewEncoder(w).Encode(response)
}
