# OpsWatch 🚀

**Self-hosted DevOps monitoring platform** combining server monitoring, Docker container management, uptime checking, and multi-channel alerting in one unified dashboard.

> Think Grafana + Uptime Kuma + Portainer — lightweight and self-hosted.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Server Monitoring** | CPU, RAM, Disk, Load Average, Network I/O, Uptime |
| **Docker Monitoring** | Container status, CPU/Memory, restart count, logs |
| **Uptime Monitoring** | HTTP endpoint checks every 30s with history |
| **Alerting** | Email, Telegram, Discord webhook, Slack webhook |
| **Real-time Dashboard** | WebSocket-powered live updates |
| **Multi-server** | Unlimited agents, one central dashboard |
| **RBAC** | JWT auth for dashboard, API key auth for agents |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              OpsWatch Dashboard (Next.js 14)         │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS + WSS
┌──────────────────────▼──────────────────────────────┐
│               API Server (NestJS)                    │
│  Auth │ Metrics │ Containers │ Alerts │ Uptime       │
│  PostgreSQL │ Redis │ WebSocket Gateway               │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS + X-API-KEY
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Agent           Agent        Agent
    (Server A)      (Server B)   (Server C)
    Go binary       Go binary    Go binary
 CPU/RAM/Disk    Docker socket   Docker socket
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- (Optional) Go 1.21+ for agent development

### 1. Clone & Configure

```bash
git clone https://github.com/yourorg/opswatch.git
cd opswatch

# Copy and edit environment files
make setup

# Edit API config (required)
nano apps/api/.env

# Edit frontend config
nano apps/web/.env
```

### 2. Start Everything

```bash
make build
make up

# View logs
make logs
```

Dashboard: **http://localhost:3000**
API Docs: **http://localhost:4000/api/docs**

### 3. Register Your First Server

1. Open the dashboard → **Servers** → **Add Server**
2. Give it a name and hostname
3. Copy the generated **API key**

### 4. Install Agent on Your Server

```bash
# One-liner install (Linux)
curl -fsSL https://your-opswatch.com/install-agent.sh | \
  OPSWATCH_API_URL=http://your-opswatch:4000/api/v1 \
  OPSWATCH_API_KEY=agent_xxxx \
  bash

# Or Docker
docker run -d \
  --name opswatch-agent \
  --restart unless-stopped \
  -e OPSWATCH_API_URL=http://your-opswatch:4000/api/v1 \
  -e OPSWATCH_API_KEY=agent_xxxx \
  -v /var/run/docker.sock:/var/run/docker.sock \
  opswatch/agent:latest
```

---

## 📁 Project Structure

```
opswatch/
├── apps/
│   ├── api/                    # NestJS backend
│   │   └── src/
│   │       ├── auth/           # JWT + API key auth
│   │       ├── servers/        # Server management
│   │       ├── metrics/        # Time-series metrics
│   │       ├── containers/     # Docker container state
│   │       ├── alerts/         # Alert rules + events
│   │       ├── uptime/         # HTTP uptime checks
│   │       ├── notifications/  # Email/Telegram/Discord/Slack
│   │       └── websocket/      # Socket.IO gateway
│   │
│   ├── web/                    # Next.js 14 frontend
│   │   └── src/
│   │       ├── app/            # App router pages
│   │       ├── components/     # UI components
│   │       ├── lib/            # API client, socket, utils
│   │       └── stores/         # Zustand state
│   │
│   └── agent/                  # Go lightweight agent
│       ├── cmd/main.go         # Entry point
│       └── internal/
│           ├── collectors/     # CPU/RAM/Disk/Network
│           ├── docker/         # Docker Engine API
│           └── sender/         # HTTP metric pusher
│
├── deploy/
│   ├── docker-compose.yml      # Production compose
│   ├── nginx/nginx.conf        # Reverse proxy
│   └── scripts/
│       └── install-agent.sh   # Agent install script
│
├── docker-compose.yml          # Root compose
└── Makefile                    # Dev commands
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/login` | Public | Login |
| `POST` | `/api/v1/auth/register` | Public | Register |
| `GET` | `/api/v1/servers` | JWT | List servers |
| `POST` | `/api/v1/servers` | JWT | Create server |
| `POST` | `/api/v1/metrics/ingest` | **API Key** | Agent push metrics |
| `GET` | `/api/v1/metrics/:id/history` | JWT | Metric history |
| `POST` | `/api/v1/containers/sync` | **API Key** | Agent sync containers |
| `GET` | `/api/v1/containers` | JWT | List containers |
| `GET` | `/api/v1/uptime` | JWT | List monitors |
| `POST` | `/api/v1/uptime` | JWT | Create monitor |
| `GET` | `/api/v1/alerts/rules` | JWT | Alert rules |
| `POST` | `/api/v1/alerts/rules` | JWT | Create rule |
| `GET` | `/api/v1/alerts/events` | JWT | Alert history |
| `GET` | `/api/v1/health` | Public | Health check |

Full interactive docs: `/api/docs` (Swagger)

---

## 🔔 Alert Configuration

Alert rules live in the dashboard → **Alerts** → **Add Rule**.

**Trigger types:**
- `cpu` – CPU % exceeds threshold
- `ram` – RAM % exceeds threshold
- `disk` – Disk % exceeds threshold
- `server_offline` – Agent stops reporting
- `container_down` – Container exits
- `http_down` – HTTP monitor returns non-200

**Notification channels** (configure per rule):
- **Email** – SMTP via `SMTP_HOST` env var
- **Telegram** – Set `TELEGRAM_BOT_TOKEN` + Chat ID
- **Discord** – Webhook URL
- **Slack** – Webhook URL

---

## 🔐 Security

- JWT tokens (7-day expiry) for dashboard users
- Per-server API keys for agents (rotatable from dashboard)
- Rate limiting on API endpoints via Nginx
- HTTPS ready (add certs to `deploy/nginx/certs/`)
- Non-root Docker containers

---

## 🛠️ Development

```bash
# Install dependencies
make install

# Start services (DB + Redis only)
docker compose up -d postgres redis

# Run API in dev mode (hot reload)
make dev-api

# Run frontend in dev mode
make dev-web

# Build & run Go agent locally
make agent-run
```

### Environment Variables

**API** (`apps/api/.env`):

| Variable | Description | Default |
|---|---|---|
| `JWT_SECRET` | JWT signing key | required |
| `DB_HOST` | PostgreSQL host | `postgres` |
| `DB_PASS` | PostgreSQL password | required |
| `REDIS_HOST` | Redis host | `redis` |
| `SMTP_HOST` | SMTP server | optional |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | optional |

**Agent** (env vars or `.env`):

| Variable | Description | Default |
|---|---|---|
| `OPSWATCH_API_URL` | API URL | required |
| `OPSWATCH_API_KEY` | Server API key | required |
| `OPSWATCH_INTERVAL` | Push interval (seconds) | `10` |

---

## 📊 Database Schema

```sql
servers         -- Registered agents (id, name, apiKey, status, metrics...)
users           -- Dashboard users (id, email, password, role)
metrics         -- Time-series snapshots (serverId, cpu, ram, disk, timestamp)
containers      -- Docker container state (serverId, dockerId, name, status...)
uptime_monitors -- HTTP monitors (id, url, interval, status, uptime24h)
uptime_events   -- Check results (monitorId, status, responseTime, timestamp)
alert_rules     -- Alert configuration (type, threshold, channels, webhooks)
alert_events    -- Triggered alerts history (ruleId, severity, message, status)
```

---

## 📜 License

MIT License — free for personal and commercial use.
