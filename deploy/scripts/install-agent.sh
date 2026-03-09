#!/usr/bin/env bash
# ============================================================
# OpsWatch Agent Installer
# Usage: curl -fsSL https://your-opswatch.com/install-agent.sh | bash
# Or:    OPSWATCH_API_URL=http://10.0.0.1:4000/api/v1 \
#        OPSWATCH_API_KEY=agent_xxx \
#        bash install-agent.sh
# ============================================================
set -euo pipefail

AGENT_VERSION="${OPSWATCH_AGENT_VERSION:-latest}"
INSTALL_DIR="/opt/opswatch"
SERVICE_NAME="opswatch-agent"
BINARY_NAME="opswatch-agent"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

log()    { echo -e "${CYAN}[OpsWatch]${NC} $1"; }
success(){ echo -e "${GREEN}[✓]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ─── Banner ─────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║       OpsWatch Agent Installer        ║"
echo "  ║   Self-hosted DevOps Monitoring       ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# ─── Check root ─────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "This script must be run as root. Try: sudo bash install-agent.sh"
fi

# ─── Detect OS & arch ───────────────────────────────────────
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)  ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  armv7l)  ARCH="arm" ;;
  *)       error "Unsupported architecture: $ARCH" ;;
esac

[[ "$OS" != "linux" ]] && error "Only Linux is supported. Use Docker for other platforms."
log "Detected: ${OS}/${ARCH}"

# ─── Prompt for config if not set ───────────────────────────
if [[ -z "${OPSWATCH_API_URL:-}" ]]; then
  read -rp "$(echo -e "${CYAN}Enter OpsWatch API URL${NC} [http://localhost:4000/api/v1]: ")" OPSWATCH_API_URL
  OPSWATCH_API_URL="${OPSWATCH_API_URL:-http://localhost:4000/api/v1}"
fi

if [[ -z "${OPSWATCH_API_KEY:-}" ]]; then
  read -rsp "$(echo -e "${CYAN}Enter Agent API Key${NC}: ")" OPSWATCH_API_KEY
  echo
fi

OPSWATCH_INTERVAL="${OPSWATCH_INTERVAL:-10}"

# ─── Install dependencies ────────────────────────────────────
log "Checking dependencies..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq curl wget systemd >/dev/null
elif command -v yum >/dev/null 2>&1; then
  yum install -y -q curl wget systemd >/dev/null
fi

# ─── Download binary ─────────────────────────────────────────
log "Downloading OpsWatch agent..."
mkdir -p "$INSTALL_DIR"

DOWNLOAD_URL="https://github.com/opswatch/agent/releases/${AGENT_VERSION}/download/opswatch-agent-${OS}-${ARCH}"

if ! wget -qO "${INSTALL_DIR}/${BINARY_NAME}" "$DOWNLOAD_URL" 2>/dev/null; then
  warn "GitHub release not found. Building from Docker instead..."
  if command -v docker >/dev/null 2>&1; then
    docker pull opswatch/agent:latest >/dev/null 2>&1 || true
    warn "Docker image available. Use docker run method instead."
    echo -e "\n${BOLD}Run agent with Docker:${NC}"
    echo -e "${CYAN}docker run -d \\"
    echo -e "  --name opswatch-agent \\"
    echo -e "  --restart unless-stopped \\"
    echo -e "  -e OPSWATCH_API_URL=${OPSWATCH_API_URL} \\"
    echo -e "  -e OPSWATCH_API_KEY=${OPSWATCH_API_KEY} \\"
    echo -e "  -v /var/run/docker.sock:/var/run/docker.sock \\"
    echo -e "  opswatch/agent:latest${NC}\n"
    exit 0
  else
    error "Neither binary nor Docker available. Please install Docker or build from source."
  fi
fi

chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
success "Binary downloaded to ${INSTALL_DIR}/${BINARY_NAME}"

# ─── Write environment file ──────────────────────────────────
cat > "${INSTALL_DIR}/.env" <<EOF
OPSWATCH_API_URL=${OPSWATCH_API_URL}
OPSWATCH_API_KEY=${OPSWATCH_API_KEY}
OPSWATCH_INTERVAL=${OPSWATCH_INTERVAL}
EOF
chmod 600 "${INSTALL_DIR}/.env"
success "Config written to ${INSTALL_DIR}/.env"

# ─── Create systemd service ──────────────────────────────────
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=OpsWatch Monitoring Agent
Documentation=https://github.com/opswatch/agent
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=${INSTALL_DIR}/${BINARY_NAME}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=opswatch-agent

# Security
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${INSTALL_DIR}
SupplementaryGroups=docker

[Install]
WantedBy=multi-user.target
EOF

# ─── Enable & start ──────────────────────────────────────────
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}" >/dev/null 2>&1
systemctl restart "${SERVICE_NAME}"

sleep 2
if systemctl is-active --quiet "${SERVICE_NAME}"; then
  success "OpsWatch agent is running!"
else
  warn "Agent may have failed to start. Check logs:"
  echo "  journalctl -u ${SERVICE_NAME} -n 50"
fi

# ─── Done ────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}Installation complete!${NC}\n"
echo -e "  ${CYAN}View logs:${NC}    journalctl -u ${SERVICE_NAME} -f"
echo -e "  ${CYAN}Stop agent:${NC}   systemctl stop ${SERVICE_NAME}"
echo -e "  ${CYAN}Uninstall:${NC}    systemctl disable ${SERVICE_NAME} && rm -rf ${INSTALL_DIR}"
echo -e "  ${CYAN}Config:${NC}       ${INSTALL_DIR}/.env\n"
