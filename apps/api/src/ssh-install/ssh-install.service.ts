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

  // ─── Key normalization ─────────────────────────────────────────────────────
  // Private keys pasted in a browser textarea or sent via JSON can arrive with:
  //   • literal  \n  (backslash-n text) instead of real newline characters
  //   • Windows  \r\n  line endings
  //   • leading/trailing whitespace
  // ssh2 must receive the key with real Unix newlines or it silently fails auth.

  private normalizePrivateKey(raw: string): Buffer {
    let key = raw.trim();

    // Replace literal backslash-n sequences (common when JSON round-trips go wrong
    // or the user copies from a config that stored it as a single-line string).
    if (key.includes('\\n')) {
      key = key.replace(/\\n/g, '\n');
    }

    // Normalize Windows line endings
    key = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Ensure there is exactly one trailing newline after the closing footer
    if (!key.endsWith('\n')) {
      key += '\n';
    }

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
        // Pipe the entire install script to a remote bash process via stdin.
        // This avoids any need for SFTP and sidesteps shell-escaping complexity.
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

        // Translate ssh2 error levels into user-friendly messages
        let userMessage = err.message;
        if (err.level === 'client-authentication') {
          userMessage =
            'Authentication failed — verify that the private key matches an entry in ~/.ssh/authorized_keys on the remote server, ' +
            'and that the correct SSH user was specified. If the key is passphrase-protected, provide the passphrase.';
        } else if (err.level === 'client-socket') {
          userMessage = `Cannot reach ${config.host}:${config.port} — check the host/IP and that port ${config.port} is open.`;
        } else if (err.level === 'client-timeout') {
          userMessage = `Connection to ${config.host}:${config.port} timed out — the host may be unreachable or blocking the port.`;
        }

        reject(new Error(userMessage));
      });

      // Capture detailed ssh2 debug output — available in development or when LOG_LEVEL=debug
      conn.on('banner', (msg) => {
        this.logger.debug(`[SSH banner] ${msg}`);
      });

      conn.connect({
        ...config,
        debug: (msg: string) => {
          debugLog += msg + '\n';
          // Log key negotiation lines at debug level to help diagnose failures
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

  // ─── Install script builder ────────────────────────────────────────────────

  // Derive the base URL (scheme+host+port) from the configured API URL.
  // e.g. "http://89.116.191.92:4000/api/v1"  → "http://89.116.191.92:4000"
  private apiBaseUrl(apiUrl: string): string {
    try {
      const u = new URL(apiUrl);
      return `${u.protocol}//${u.host}`;
    } catch {
      // Fallback: strip trailing path segments
      return apiUrl.replace(/\/api\/v1\/?$/, '');
    }
  }

  private buildInstallScript(apiKey: string, apiUrl: string): string {
    // Use base64 to safely embed file contents — avoids all shell-escaping issues.
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
        'User=root',
        'WorkingDirectory=/opt/opswatch',
        'EnvironmentFile=/opt/opswatch/.env',
        'ExecStart=/opt/opswatch/opswatch-agent',
        'Restart=always',
        'RestartSec=10',
        'StandardOutput=journal',
        'StandardError=journal',
        'SyslogIdentifier=opswatch-agent',
        'NoNewPrivileges=true',
        'ProtectSystem=strict',
        'ReadWritePaths=/opt/opswatch',
        'SupplementaryGroups=docker',
        '',
        '[Install]',
        'WantedBy=multi-user.target',
        '',
      ].join('\n'),
    ).toString('base64');

    const apiBase = this.apiBaseUrl(apiUrl);

    // Bash variables are escaped as \$VAR / \${VAR} to prevent TypeScript
    // template-literal interpolation while still expanding correctly in bash.
    return `#!/bin/bash
set -euo pipefail

INSTALL_DIR="/opt/opswatch"
SERVICE_NAME="opswatch-agent"
BINARY_NAME="opswatch-agent"

echo "[OpsWatch] Starting agent installation..."

# ── Create install directory ──────────────────────────────────────────────────
mkdir -p "\$INSTALL_DIR"

# ── Detect architecture ───────────────────────────────────────────────────────
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
# Primary:  OpsWatch API server (always available — binary is bundled in the image)
# Fallback: GitHub releases (for future public releases)
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
  echo "[OpsWatch] All download sources failed. Neither wget nor curl is available, or URLs are unreachable."
  exit 1
fi

chmod +x "\$INSTALL_DIR/\$BINARY_NAME"
echo "[OpsWatch] Binary installed at \$INSTALL_DIR/\$BINARY_NAME"

# ── Write environment config ──────────────────────────────────────────────────
echo "${envContent}" | base64 -d > "\$INSTALL_DIR/.env"
chmod 600 "\$INSTALL_DIR/.env"
echo "[OpsWatch] Config written to \$INSTALL_DIR/.env"

# ── Write systemd service unit ────────────────────────────────────────────────
echo "${serviceContent}" | base64 -d > "/etc/systemd/system/\$SERVICE_NAME.service"
echo "[OpsWatch] Systemd service created"

# ── Enable and start service ──────────────────────────────────────────────────
systemctl daemon-reload
systemctl enable "\$SERVICE_NAME" >/dev/null 2>&1
systemctl restart "\$SERVICE_NAME"

sleep 2
if systemctl is-active --quiet "\$SERVICE_NAME"; then
  echo "[OpsWatch] Agent is running!"
else
  echo "[OpsWatch] Warning: agent may have failed to start. Check: journalctl -u \$SERVICE_NAME -n 50"
  exit 1
fi

echo "[OpsWatch] Installation complete"
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
    apiUrl?: string;
    connectionType: 'ssh' | 'aws-pem';
  }) {
    const { name, hostname, host, sshUser, sshPort, connectionType } = params;

    const resolvedApiUrl =
      params.apiUrl ||
      this.configService.get<string>('PUBLIC_API_URL') ||
      this.configService.get<string>('OPSWATCH_API_URL') ||
      'http://localhost:4000/api/v1';

    // Normalize the private key before handing it to ssh2.
    // Corrupted newlines are the #1 cause of "All configured authentication methods failed".
    const privateKey = this.normalizePrivateKey(params.privateKey);

    // 1. Register the server — generates the apiKey the agent will use
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
      // Accept any host key (equivalent to StrictHostKeyChecking=no).
      // We use the explicit callback form for full ssh2 v1.x compatibility.
      hostVerifier: (_keyHash, callback) => {
        callback(true);
      },
    };

    const script = this.buildInstallScript(server.apiKey, resolvedApiUrl);

    try {
      const result = await this.runScript(connectConfig, script);

      if (result.code !== 0) {
        await this.serversService.delete(server.id);
        const detail = (result.stderr || result.stdout).slice(-2000);
        throw new InternalServerErrorException(
          `Agent installation failed (exit code ${result.code}):\n${detail}`,
        );
      }

      this.logger.log(`Agent successfully installed on ${host} for server ${server.id}`);
      return {
        server,
        installLog: result.stdout,
        message: 'Agent installed and started successfully',
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
      apiUrl: dto.apiUrl,
      connectionType: 'aws-pem',
    });
  }
}
