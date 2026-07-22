import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, ConnectConfig, SFTPWrapper } from 'ssh2';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ServersService } from '../servers/servers.service';
import { AddSshDto } from './dto/add-ssh.dto';
import { AddAwsDto } from './dto/add-aws.dto';

const SSH_TIMEOUT_MS = 180_000;
const SSH_READY_TIMEOUT_MS = 30_000;

@Injectable()
export class SshInstallService {
  private readonly logger = new Logger(SshInstallService.name);

  constructor(
    private readonly serversService: ServersService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Install path resolution ───────────────────────────────────────────────

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
      return p.replace(/\/+$/, '');
    }

    return sshUser === 'root' ? '/opt/opswatch' : `/home/${sshUser}/opswatch`;
  }

  // ─── Key normalization ─────────────────────────────────────────────────────

  private normalizePrivateKey(raw: string): Buffer {
    let key = raw.trim();

    if (key.includes('\\n')) {
      key = key.replace(/\\n/g, '\n');
    }
    key = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!key.endsWith('\n')) key += '\n';

    return Buffer.from(key, 'utf-8');
  }

  // ─── Private / loopback URL detection ──────────────────────────────────────

  private isUnreachableFromInternet(apiUrl: string): boolean {
    try {
      const { hostname } = new URL(apiUrl);
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.endsWith('.local')
      ) {
        return true;
      }
      // RFC1918 + link-local
      if (/^10\./.test(hostname)) return true;
      if (/^192\.168\./.test(hostname)) return true;
      if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
      if (/^169\.254\./.test(hostname)) return true;
      return false;
    } catch {
      return false;
    }
  }

  // ─── Local agent binary lookup ─────────────────────────────────────────────

  private resolveLocalBinary(os: string, arch: string): string {
    const filename = `opswatch-agent-${os}-${arch}`;
    const filePath = join(process.cwd(), 'downloads', filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException(
        `Agent binary "${filename}" is not available on this OpsWatch server. ` +
          'Rebuild the API image with: docker compose build api',
      );
    }
    return filePath;
  }

  // ─── SSH helpers ───────────────────────────────────────────────────────────

  private connect(config: ConnectConfig): Promise<Client> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let debugLog = '';

      const timeout = setTimeout(() => {
        conn.destroy();
        reject(new Error(`SSH connection timed out after ${SSH_READY_TIMEOUT_MS / 1000}s`));
      }, SSH_READY_TIMEOUT_MS);

      conn.on('ready', () => {
        clearTimeout(timeout);
        this.logger.debug(`SSH handshake complete for ${config.host}`);
        resolve(conn);
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

  private exec(
    conn: Client,
    command: string,
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);

        let stdout = '';
        let stderr = '';

        stream
          .on('close', (code: number) => {
            resolve({ stdout, stderr, code: code ?? 0 });
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString();
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
      });
    });
  }

  private sftp(conn: Client): Promise<SFTPWrapper> {
    return new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        resolve(sftp);
      });
    });
  }

  private sftpWrite(
    sftp: SFTPWrapper,
    remotePath: string,
    data: Buffer,
    mode = 0o755,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = sftp.createWriteStream(remotePath, { mode });
      stream.on('error', reject);
      stream.on('close', () => resolve());
      stream.end(data);
    });
  }

  private sftpMkdir(sftp: SFTPWrapper, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      sftp.mkdir(remotePath, (err) => {
        // Ignore "already exists" — directory may already be created via shell/sudo
        if (err) {
          const msg = String(err.message || '').toLowerCase();
          const code = String((err as NodeJS.ErrnoException).code ?? '');
          if (msg.includes('exist') || code === '4' || code === 'EEXIST') {
            return resolve();
          }
          return reject(err);
        }
        resolve();
      });
    });
  }

  // ─── Detect remote OS / arch ───────────────────────────────────────────────

  private async detectRemotePlatform(conn: Client): Promise<{ os: string; arch: string }> {
    const { stdout, code, stderr } = await this.exec(
      conn,
      'uname -s | tr "[:upper:]" "[:lower:]"; uname -m',
    );
    if (code !== 0) {
      throw new Error(`Failed to detect remote OS/arch: ${stderr || stdout}`);
    }

    const [osRaw, archRaw] = stdout.trim().split('\n').map((s) => s.trim());
    if (osRaw !== 'linux') {
      throw new Error(`Only Linux is supported for agent install (detected: ${osRaw})`);
    }

    let arch: string;
    switch (archRaw) {
      case 'x86_64':
        arch = 'amd64';
        break;
      case 'aarch64':
        arch = 'arm64';
        break;
      case 'armv7l':
        arch = 'arm';
        break;
      default:
        throw new Error(`Unsupported architecture: ${archRaw}`);
    }

    return { os: 'linux', arch };
  }

  // ─── Build remote setup script (env + systemd; binary already uploaded) ────

  private buildSetupScript(
    apiKey: string,
    apiUrl: string,
    sshUser: string,
    installPath: string,
  ): string {
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

    return `#!/bin/bash
set -euo pipefail

INSTALL_DIR="${installPath}"
SERVICE_NAME="opswatch-agent"
BINARY_NAME="opswatch-agent"

echo "[OpsWatch] Install path: \$INSTALL_DIR"
echo "[OpsWatch] Running as user: \$(whoami)"

PRIV=""
if [ "\$(id -u)" != "0" ]; then
  if command -v sudo >/dev/null 2>&1; then
    PRIV="sudo"
    echo "[OpsWatch] Will use sudo for privileged operations"
  else
    echo "[OpsWatch] WARNING: Not root and sudo not found. systemd steps may fail."
  fi
fi

if [ ! -x "\$INSTALL_DIR/\$BINARY_NAME" ]; then
  echo "[OpsWatch] ERROR: Agent binary missing at \$INSTALL_DIR/\$BINARY_NAME"
  exit 1
fi
echo "[OpsWatch] Binary present: \$INSTALL_DIR/\$BINARY_NAME"

echo "${envContent}" | base64 -d > "\$INSTALL_DIR/.env"
chmod 600 "\$INSTALL_DIR/.env"
echo "[OpsWatch] Config written: \$INSTALL_DIR/.env"

echo "${serviceContent}" | base64 -d | \$PRIV tee "/etc/systemd/system/\$SERVICE_NAME.service" > /dev/null
\$PRIV chmod 644 "/etc/systemd/system/\$SERVICE_NAME.service"
echo "[OpsWatch] Systemd service created"

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

    if (this.isUnreachableFromInternet(resolvedApiUrl)) {
      // Still allow install (SFTP no longer needs callback), but agent won't report
      // unless the API is reachable from the remote host.
      this.logger.warn(
        `API URL "${resolvedApiUrl}" looks like a private/local address. ` +
          `The agent will install, but may not be able to push metrics from ${host}. ` +
          `Set PUBLIC_API_URL (or the form "OpsWatch API URL") to an address reachable from the remote server.`,
      );
    }

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

    let conn: Client | null = null;
    const installLog: string[] = [];
    const log = (line: string) => {
      installLog.push(line);
      this.logger.log(line);
    };

    const overallTimeout = setTimeout(() => {
      conn?.destroy();
    }, SSH_TIMEOUT_MS);

    try {
      conn = await this.connect(connectConfig);

      // 1) Detect platform
      const { os, arch } = await this.detectRemotePlatform(conn);
      log(`[OpsWatch] Detected remote platform: ${os}/${arch}`);

      // 2) Resolve + read local binary
      const localBinary = this.resolveLocalBinary(os, arch);
      const binaryBuf = readFileSync(localBinary);
      log(`[OpsWatch] Uploading agent binary (${(binaryBuf.length / 1024 / 1024).toFixed(1)} MB) via SFTP…`);

      // 3) Ensure install dir exists (may need sudo for /opt)
      const mkdirResult = await this.exec(
        conn,
        `mkdir -p "${installPath}" 2>/dev/null || sudo mkdir -p "${installPath}"; ` +
          `sudo chown "$(id -u):$(id -g)" "${installPath}" 2>/dev/null || true`,
      );
      if (mkdirResult.code !== 0) {
        throw new Error(
          `Cannot create install directory ${installPath}: ${mkdirResult.stderr || mkdirResult.stdout}`,
        );
      }

      // 4) SFTP upload binary
      const sftp = await this.sftp(conn);
      try {
        await this.sftpMkdir(sftp, installPath);
        await this.sftpWrite(sftp, `${installPath}/opswatch-agent`, binaryBuf, 0o755);
      } finally {
        sftp.end();
      }
      log(`[OpsWatch] Binary uploaded to ${installPath}/opswatch-agent`);

      // 5) Write config + systemd + start (binary already on disk via SFTP)
      const setupScript = this.buildSetupScript(
        server.apiKey,
        resolvedApiUrl,
        sshUser,
        installPath,
      );
      const setupResult = await new Promise<{
        stdout: string;
        stderr: string;
        code: number;
      }>((resolve, reject) => {
        conn!.exec('bash -s', (err, stream) => {
          if (err) return reject(err);
          let stdout = '';
          let stderr = '';
          stream
            .on('close', (code: number) => {
              resolve({ stdout, stderr, code: code ?? 0 });
            })
            .on('data', (d: Buffer) => {
              stdout += d.toString();
            })
            .stderr.on('data', (d: Buffer) => {
              stderr += d.toString();
            });
          stream.write(setupScript);
          stream.end();
        });
      });

      if (setupResult.stdout) {
        setupResult.stdout
          .split('\n')
          .filter(Boolean)
          .forEach((line) => log(line));
      }

      if (setupResult.code !== 0) {
        const detail = (setupResult.stderr || setupResult.stdout).slice(-2000);
        await this.serversService.delete(server.id);
        throw new InternalServerErrorException(
          `Agent installation failed (exit code ${setupResult.code}):\n${detail}`,
        );
      }

      let message = `Agent installed and started — path: ${installPath}`;
      if (this.isUnreachableFromInternet(resolvedApiUrl)) {
        message +=
          `. Warning: API URL "${resolvedApiUrl}" is a private/local address — ` +
          `the agent may not reach OpsWatch from this host. Set PUBLIC_API_URL to a publicly reachable URL ` +
          `(or pass "OpsWatch API URL" in the install form), then restart the agent.`;
      }

      this.logger.log(`Agent installed on ${host} at ${installPath} (server ${server.id})`);
      return {
        server,
        installLog: installLog.join('\n'),
        installPath,
        message,
      };
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      try {
        await this.serversService.delete(server.id);
      } catch {
        this.logger.warn(`Could not roll back server ${server.id} after install failure`);
      }
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      clearTimeout(overallTimeout);
      conn?.end();
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
