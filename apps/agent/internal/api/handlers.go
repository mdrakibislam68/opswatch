package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/opswatch/agent/internal/docker"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for the agent proxying
	},
}

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

	if endpoint == "terminal" {
		s.handleTerminal(w, r, containerID)
		return
	}

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

func (s *Server) handleTerminal(w http.ResponseWriter, r *http.Request, containerID string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Use a smart shell command that tries bash and falls back to sh
	// We use /bin/sh to run a small script that checks for /bin/bash
	cmd := []string{"/bin/sh", "-c", "if [ -x /bin/bash ]; then exec /bin/bash; else exec /bin/sh; fi"}
	resp, err := s.dockerClient.ExecTerminal(r.Context(), containerID, cmd)
	if err != nil {
		log.Printf("Failed to create exec: %v", err)
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Failed to start terminal: %v\r\n", err)))
		return
	}
	defer resp.Close()

	// Session timeout and activity tracking
	timeout := 15 * time.Minute
	activity := make(chan struct{}, 1)
	
	// Copy from WebSocket to Docker Stdin
	go func() {
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			resp.Conn.Write(msg)
			
			// Update activity
			select {
			case activity <- struct{}{}:
			default:
			}
		}
	}()

	// Copy from Docker Stdout to WebSocket
	go func() {
		buf := make([]byte, 8192)
		for {
			n, err := resp.Reader.Read(buf)
			if n > 0 {
				err = conn.WriteMessage(websocket.BinaryMessage, buf[:n])
				if err != nil {
					return
				}
				
				// Update activity
				select {
				case activity <- struct{}{}:
				default:
				}
			}
			if err != nil {
				return
			}
		}
	}()

	// Inactivity monitor
	timer := time.NewTimer(timeout)
	for {
		select {
		case <-activity:
			if !timer.Stop() {
				<-timer.C
			}
			timer.Reset(timeout)
		case <-timer.C:
			log.Printf("Terminal session for %s timed out due to inactivity", containerID)
			conn.WriteMessage(websocket.TextMessage, []byte("\r\nSession timed out due to inactivity.\r\n"))
			return
		case <-r.Context().Done():
			return
		}
	}
}
