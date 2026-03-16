import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ConnectConfig } from 'ssh2';
import { ServersService } from '../servers/servers.service';
import { AddSshDto } from './dto/add-ssh.dto';
import { AddAwsDto } from './dto/add-aws.dto';

const SSH_TIMEOUT_MS = 120_000;
const SSH_READY_TIMEOUT_MS = 30_000;

@Injectable()
export class SshInstallService {
  private readonly logger = new Logger(SshInstallService.name);

  constructor(
    private readonly serversService: ServersService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Install path resolution ───────────────────────────────────────────────
  //
  // Rules (applied in order):
  //   1. If the caller supplied an explicit installPath → validate and use it.
  //   2. If the SSH user is "root" → /opt/opswatch  (standard system path)
  //   3. Otherwise → /home/{sshUser}/opswatch  (safe for ubuntu, ec2-user, etc.)

  private resolveInstallPath(sshUser: string, customPath?: string): string {
    if (customPath?.trim()) {
      const p = customPath.trim();
      if (!p.startsWith('/')) {
        throw new BadRequestException(
          'Install path must be an absolute path starting with /',
        );
      }
      if (p.includes('..')) {
        throw new BadRequestException('Install path must not contain ".."');
      }
      if (p.length > 200) {
        throw new BadRequestException('Install path is too long');
      }
      return p.replace(/\/+$/, ''); // strip trailing slashes
    }

    return sshUser === 'root' ? '/opt/opswatch' : `/home/${sshUser}/opswatch`;
  }

  // ─── Key normalization ─────────────────────────────────────────────────────
  // Private keys pasted in a browser textarea or sent via JSON can arrive with:
  //   • literal  \n  (backslash-n text) instead of real newline characters
  //   • Windows  \r\n  line endings
  //   • leading/trailing whitespace
  // ssh2 must receive the key with real Unix newlines or it silently fails auth.

  private normalizePrivateKey(raw: string): Buffer {
    let key = raw.trim();

    if (key.includes('\\n')) {
      key = key.replace(/\\n/g, '\n');
    }
    key = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!key.endsWith('\n')) key += '\n';

    return Buffer.from(key, 'utf-8');
  }

  // ─── SSH script execution ──────────────────────────────────────────────────

  private runScript(
    config: ConnectConfig,
    script: string,
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = '';
      let stderr = '';
      let debugLog = '';

      const timeout = setTimeout(() => {
        conn.destroy();
        reject(new Error(`SSH operation timed out after ${SSH_TIMEOUT_MS / 1000}s`));
      }, SSH_TIMEOUT_MS);

      conn.on('ready', () => {
        this.logger.debug(`SSH handshake complete for ${config.host}`);
        conn.exec('bash -s', (err, stream) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            return reject(err);
          }

          stream
            .on('close', (code: number) => {
              clearTimeout(timeout);
              conn.end();
              resolve({ stdout, stderr, code: code ?? 0 });
            })
            .on('data', (data: Buffer) => {
              stdout += data.toString();
            })
            .stderr.on('data', (data: Buffer) => {
              stderr += data.toString();
            });

          stream.write(script);
          stream.end();
        });
      });

      conn.on('error', (err: Error & { level?: string }) => {
        clearTimeout(timeout);
        this.logger.error(`SSH error [level=${err.level ?? 'unknown'}]: ${err.message}`);
        this.logger.debug(`SSH debug log:\n${debugLog}`);

        let userMessage = err.message;
        if (err.level === 'client-authentication') {
          userMessage =
            'Authentication failed — verify that the private key matches an entry in ' +
            '~/.ssh/authorized_keys on the remote server, and that the correct SSH user ' +
            'was specified. If the key is passphrase-protected, provide the passphrase.';
        } else if (err.level === 'client-socket') {
          userMessage = `Cannot reach ${config.host}:${config.port} — check the host/IP and that port ${config.port} is open.`;
        } else if (err.level === 'client-timeout') {
          userMessage = `Connection to ${config.host}:${config.port} timed out — the host may be unreachable or blocking the port.`;
        }

        reject(new Error(userMessage));
      });

      conn.on('banner', (msg) => {
        this.logger.debug(`[SSH banner] ${msg}`);
      });

      conn.connect({
        ...config,
        debug: (msg: string) => {
          debugLog += msg + '\n';
          if (
            msg.includes('Handshake') ||
            msg.includes('KEX') ||
            msg.includes('Authentication') ||
            msg.includes('USERAUTH') ||
            msg.includes('error') ||
            msg.includes('fail')
          ) {
            this.logger.verbose(`[SSH2] ${msg}`);
          }
        },
      });
    });
  }

  // ─── URL helpers ───────────────────────────────────────────────────────────

  private apiBaseUrl(apiUrl: string): string {
    try {
      const u = new URL(apiUrl);
      return `${u.protocol}//${u.host}`;
    } catch {
      return apiUrl.replace(/\/api\/v1\/?$/, '');
    }
  }

  // ─── Install script builder ────────────────────────────────────────────────
  //
  // All paths come from the resolved installPath so the agent can be placed
  // in /home/{user}/opswatch when the SSH user is not root.
  //
  // Privilege handling:
  //   - File operations under installPath: no sudo needed (user owns the dir)
  //   - /opt/... paths: automatically uses sudo if available
  //   - systemd service management: always runs through $PRIV (sudo or "")

  private buildInstallScript(
    apiKey: string,
    apiUrl: string,
    sshUser: string,
    installPath: string,
  ): string {
    const apiBase = this.apiBaseUrl(apiUrl);

    // Build file contents as base64 to safely embed them — no shell-escaping needed.
    const envContent = Buffer.from(
      [
        `OPSWATCH_API_URL=${apiUrl}`,
        `OPSWATCH_API_KEY=${apiKey}`,
        `OPSWATCH_INTERVAL=10`,
        `OPSWATCH_DOMAIN_INTERVAL=60`,
        `OPSWATCH_AGENT_PORT=4001`,
        '',
      ].join('\n'),
    ).toString('base64');

    // Service unit uses the resolved paths and the actual SSH user.
    const serviceContent = Buffer.from(
      [
        '[Unit]',
        'Description=OpsWatch Monitoring Agent',
        'Documentation=https://github.com/opswatch/agent',
        'After=network-online.target docker.service',
        'Wants=network-online.target',
        '',
        '[Service]',
        'Type=simple',
        `User=${sshUser}`,
        `WorkingDirectory=${installPath}`,
        `EnvironmentFile=${installPath}/.env`,
        `ExecStart=${installPath}/opswatch-agent`,
        'Restart=always',
        'RestartSec=10',
        'StandardOutput=journal',
        'StandardError=journal',
        'SyslogIdentifier=opswatch-agent',
        'NoNewPrivileges=true',
        'ProtectSystem=strict',
        `ReadWritePaths=${installPath}`,
        'SupplementaryGroups=docker',
        '',
        '[Install]',
        'WantedBy=multi-user.target',
        '',
      ].join('\n'),
    ).toString('base64');

    // Bash variables use \$VAR / \${VAR} to avoid TypeScript template interpolation.
    return `#!/bin/bash
set -euo pipefail

INSTALL_DIR="${installPath}"
SERVICE_NAME="opswatch-agent"
BINARY_NAME="opswatch-agent"

echo "[OpsWatch] Install path: \$INSTALL_DIR"
echo "[OpsWatch] Running as user: \$(whoami)"

# ── Privilege escalation helper ───────────────────────────────────────────────
# systemd and /etc/systemd writes always need root.  File operations inside
# INSTALL_DIR generally don't (the user owns that directory).
PRIV=""
if [ "\$(id -u)" != "0" ]; then
  if command -v sudo >/dev/null 2>&1; then
    PRIV="sudo"
    echo "[OpsWatch] Will use sudo for privileged operations"
  else
    echo "[OpsWatch] WARNING: Not root and sudo not found. systemd steps may fail."
  fi
fi

# ── Create install directory ──────────────────────────────────────────────────
if ! mkdir -p "\$INSTALL_DIR" 2>/dev/null; then
  echo "[OpsWatch] Cannot create \$INSTALL_DIR as \$(whoami) — trying with sudo..."
  if command -v sudo >/dev/null 2>&1; then
    sudo mkdir -p "\$INSTALL_DIR"
    sudo chown "\$(id -u):\$(id -g)" "\$INSTALL_DIR"
  else
    echo "[OpsWatch] ERROR: Cannot create \$INSTALL_DIR and sudo is unavailable."
    echo "[OpsWatch] Tip: set Install Path to a directory you own, e.g. /home/\$(whoami)/opswatch"
    exit 1
  fi
fi
echo "[OpsWatch] Install directory ready: \$INSTALL_DIR"

# ── Detect OS and architecture ────────────────────────────────────────────────
ARCH="\$(uname -m)"
case "\$ARCH" in
  x86_64)  ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  armv7l)  ARCH="arm" ;;
  *) echo "[OpsWatch] Unsupported architecture: \$ARCH"; exit 1 ;;
esac

OS="\$(uname -s | tr '[:upper:]' '[:lower:]')"
echo "[OpsWatch] Detected: \${OS}/\${ARCH}"

# ── Download agent binary ─────────────────────────────────────────────────────
# Primary:  OpsWatch server (binary is bundled in the Docker image)
# Fallback: GitHub releases
OPSWATCH_BASE="${apiBase}"
PRIMARY_URL="\${OPSWATCH_BASE}/api/v1/downloads/opswatch-agent-\${OS}-\${ARCH}"
FALLBACK_URL="https://github.com/opswatch/agent/releases/latest/download/opswatch-agent-\${OS}-\${ARCH}"

download_binary() {
  local url="\$1"
  echo "[OpsWatch] Trying: \$url"
  if command -v wget >/dev/null 2>&1; then
    wget -qO "\$INSTALL_DIR/\$BINARY_NAME" "\$url" && return 0
  elif command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "\$INSTALL_DIR/\$BINARY_NAME" "\$url" && return 0
  fi
  return 1
}

if download_binary "\$PRIMARY_URL"; then
  echo "[OpsWatch] Downloaded from OpsWatch server"
elif download_binary "\$FALLBACK_URL"; then
  echo "[OpsWatch] Downloaded from GitHub releases"
else
  echo "[OpsWatch] ERROR: All download sources failed."
  exit 1
fi

chmod +x "\$INSTALL_DIR/\$BINARY_NAME"
echo "[OpsWatch] Binary installed: \$INSTALL_DIR/\$BINARY_NAME"

# ── Write environment config ──────────────────────────────────────────────────
echo "${envContent}" | base64 -d > "\$INSTALL_DIR/.env"
chmod 600 "\$INSTALL_DIR/.env"
echo "[OpsWatch] Config written: \$INSTALL_DIR/.env"

# ── Write systemd service unit ────────────────────────────────────────────────
# tee is used so that \$PRIV (sudo) applies to the write, not just the echo.
echo "${serviceContent}" | base64 -d | \$PRIV tee "/etc/systemd/system/\$SERVICE_NAME.service" > /dev/null
\$PRIV chmod 644 "/etc/systemd/system/\$SERVICE_NAME.service"
echo "[OpsWatch] Systemd service created"

# ── Enable and start service ──────────────────────────────────────────────────
\$PRIV systemctl daemon-reload
\$PRIV systemctl enable "\$SERVICE_NAME" >/dev/null 2>&1
\$PRIV systemctl restart "\$SERVICE_NAME"

sleep 2
if \$PRIV systemctl is-active --quiet "\$SERVICE_NAME"; then
  echo "[OpsWatch] Agent is running!"
else
  echo "[OpsWatch] Warning: agent may have failed to start."
  echo "[OpsWatch] Check logs: journalctl -u \$SERVICE_NAME -n 50"
  exit 1
fi

echo "[OpsWatch] Installation complete — path: \$INSTALL_DIR"
`;
  }

  // ─── PEM validation ────────────────────────────────────────────────────────

  validatePem(buffer: Buffer): string {
    const content = buffer.toString('utf-8').trim();
    if (!content.startsWith('-----BEGIN')) {
      throw new BadRequestException(
        'Invalid PEM file — must start with "-----BEGIN ... -----". ' +
          'Make sure you selected the correct .pem or private-key file.',
      );
    }
    return content;
  }

  // ─── Core install logic ────────────────────────────────────────────────────

  private async performInstall(params: {
    name: string;
    hostname: string;
    host: string;
    sshUser: string;
    sshPort: number;
    privateKey: string;
    passphrase?: string;
    installPath?: string;
    apiUrl?: string;
    connectionType: 'ssh' | 'aws-pem';
  }) {
    const { name, hostname, host, sshUser, sshPort, connectionType } = params;

    const resolvedApiUrl =
      params.apiUrl ||
      this.configService.get<string>('PUBLIC_API_URL') ||
      this.configService.get<string>('OPSWATCH_API_URL') ||
      'http://localhost:4000/api/v1';

    // Resolve the install path: custom → root default → user home default
    const installPath = this.resolveInstallPath(sshUser, params.installPath);

    this.logger.log(
      `Install path resolved to: "${installPath}" for user "${sshUser}"`,
    );

    const privateKey = this.normalizePrivateKey(params.privateKey);

    const server = await this.serversService.create({ name, hostname, connectionType });
    this.logger.log(
      `Registered server "${name}" (${server.id}), starting SSH install on ${host}:${sshPort}`,
    );

    const connectConfig: ConnectConfig = {
      host,
      port: sshPort,
      username: sshUser,
      privateKey,
      ...(params.passphrase ? { passphrase: params.passphrase } : {}),
      readyTimeout: SSH_READY_TIMEOUT_MS,
      hostVerifier: (_keyHash, callback) => {
        callback(true);
      },
    };

    const script = this.buildInstallScript(
      server.apiKey,
      resolvedApiUrl,
      sshUser,
      installPath,
    );

    try {
      const result = await this.runScript(connectConfig, script);

      if (result.code !== 0) {
        await this.serversService.delete(server.id);
        const detail = (result.stderr || result.stdout).slice(-2000);
        throw new InternalServerErrorException(
          `Agent installation failed (exit code ${result.code}):\n${detail}`,
        );
      }

      this.logger.log(`Agent installed on ${host} at ${installPath} (server ${server.id})`);
      return {
        server,
        installLog: result.stdout,
        installPath,
        message: `Agent installed and started — path: ${installPath}`,
      };
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      try {
        await this.serversService.delete(server.id);
      } catch {
        this.logger.warn(`Could not roll back server ${server.id} after install failure`);
      }
      throw new InternalServerErrorException(err.message);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async installViaSsh(dto: AddSshDto) {
    return this.performInstall({
      name: dto.name,
      hostname: dto.hostname,
      host: dto.host,
      sshUser: dto.sshUser,
      sshPort: dto.sshPort ?? 22,
      privateKey: dto.privateKey,
      passphrase: dto.passphrase,
      installPath: dto.installPath,
      apiUrl: dto.apiUrl,
      connectionType: 'ssh',
    });
  }

  async installViaAwsPem(dto: AddAwsDto, pemBuffer: Buffer) {
    const privateKey = this.validatePem(pemBuffer);
    return this.performInstall({
      name: dto.name,
      hostname: dto.hostname,
      host: dto.host,
      sshUser: dto.sshUser,
      sshPort: dto.sshPort ?? 22,
      privateKey,
      passphrase: dto.passphrase,
      installPath: dto.installPath,
      apiUrl: dto.apiUrl,
      connectionType: 'aws-pem',
    });
  }
}
