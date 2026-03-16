# ─── Stage 1: Compile agent binaries for all supported platforms ──────────────
# These binaries are served from the API's /downloads endpoint so remote servers
# can download the agent during SSH-based installation without needing GitHub releases.
FROM golang:1.24-alpine AS agent-builder
WORKDIR /agent

RUN apk add --no-cache git ca-certificates
ENV GOTOOLCHAIN=auto

COPY apps/agent/ .
RUN go mod tidy

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
      go build -ldflags="-w -s" -o /agent-bins/opswatch-agent-linux-amd64 ./cmd/main.go && \
    CGO_ENABLED=0 GOOS=linux GOARCH=arm64 \
      go build -ldflags="-w -s" -o /agent-bins/opswatch-agent-linux-arm64 ./cmd/main.go && \
    CGO_ENABLED=0 GOOS=linux GOARCH=arm \
      go build -ldflags="-w -s" -o /agent-bins/opswatch-agent-linux-arm ./cmd/main.go

# ─── Stage 2: Build NestJS API ────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY apps/api/package*.json ./
RUN npm ci

COPY apps/api/ .
RUN npm run build

# ─── Stage 3: Minimal production image ────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY apps/api/package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Bundle compiled agent binaries so the /downloads endpoint can serve them.
# The downloads folder is readable by the `node` user.
COPY --from=agent-builder /agent-bins ./downloads
RUN chown -R node:node /app

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/main"]
