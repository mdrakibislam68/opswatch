# ─── Build stage ──────────────────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM golang:1.24-alpine AS builder
WORKDIR /app

# Use arguments provided by Docker buildx
ARG TARGETOS
ARG TARGETARCH

# Enable automatic toolchain upgrades
ENV GOTOOLCHAIN=auto

# Install build essentials
RUN apk add --no-cache git ca-certificates

# Copy everything first
COPY . .

# Generate go.sum and download dependencies
RUN go mod tidy

# Build the binary specifically for the target OS and Architecture
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} \
    go build -ldflags="-w -s" -o /opswatch-agent ./cmd/main.go

# ─── Minimal runtime image ────────────────────────────────────────────────────
FROM alpine:3.19
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /opswatch-agent .

# Environment variables (passed at runtime)
ENV OPSWATCH_API_URL=http://api:4000/api/v1
ENV OPSWATCH_INTERVAL=10

VOLUME ["/var/run/docker.sock"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD pgrep opswatch-agent || exit 1

CMD ["./opswatch-agent"]
