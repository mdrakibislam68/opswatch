# Connecting Servers to OpsWatch

This guide explains how to install the OpsWatch monitoring agent on your servers and begin collecting metrics, container data, and domain information.

---

## Overview

The **OpsWatch Agent** is a lightweight background service that runs on each server you want to monitor. Once installed, it continuously collects:

- CPU, RAM, disk, and load metrics
- Running Docker containers and their states
- Nginx domain and virtual host configuration
- System uptime and OS information

The agent communicates with your OpsWatch API server over HTTP using a unique per-server API key. All data flows from the agent **outward** to OpsWatch — no inbound ports need to be opened on the monitored server.

OpsWatch supports three ways to install the agent:

| Method | Best for |
|---|---|
| [Agent Install Script](#method-1--agent-install-script) | Servers you already have SSH access to |
| [SSH Private Key](#method-2--ssh-private-key) | Automated provisioning with an existing key pair |
| [AWS PEM File](#method-3--aws-pem-file) | AWS EC2 instances using a downloaded `.pem` key |

---

## Prerequisites

Before connecting a server, confirm the following:

- **OS:** Ubuntu 20.04+, Debian 10+, or any modern Linux distribution with `systemd`
- **Access:** Root or a user with `sudo` privileges
- **Outbound connectivity:** The server must be able to reach your OpsWatch API server (default port `4000`)
- **Tools:** `wget` or `curl` must be installed (present by default on most distributions)
- **Docker** _(optional)_ — required only if you want to monitor containers
- **Nginx** _(optional)_ — required only if you want to monitor domains and virtual hosts

> **Note:** The agent does not require any inbound firewall rules. It only makes outbound HTTP requests to the OpsWatch API.

---

## Method 1 — Agent Install Script

Use this method when you can SSH into the server yourself and want to run the install command manually.

### Steps

**1.** Open the OpsWatch Dashboard and go to **Servers**.

**2.** Click **Add Server**.

**3.** In the modal, select the **Agent Script** tab.

**4.** Fill in:
- **Server Name** — a label for this server (e.g. `prod-web-01`)
- **Hostname / IP** — the server's IP address or FQDN

**5.** Click **Register**. OpsWatch generates a unique API key for this server.

**6.** Copy the API key that appears.

**7.** SSH into your server and run the install command, substituting your values:

```bash
curl -fsSL https://your-opswatch-server/install-agent.sh | \
  OPSWATCH_API_URL=http://your-opswatch-server:4000/api/v1 \
  OPSWATCH_API_KEY=agent_xxxxxxxxxxxxxxxx \
  bash
```

Or, if you prefer to set the variables separately first:

```bash
export OPSWATCH_API_URL="http://your-opswatch-server:4000/api/v1"
export OPSWATCH_API_KEY="agent_xxxxxxxxxxxxxxxx"

curl -fsSL https://your-opswatch-server/install-agent.sh | bash
```

### What the install script does

The script performs these steps automatically:

1. Detects the OS and CPU architecture (`amd64`, `arm64`, or `arm`)
2. Downloads the correct agent binary to `/opt/opswatch/opswatch-agent`
3. Writes the configuration to `/opt/opswatch/.env`
4. Creates a systemd service at `/etc/systemd/system/opswatch-agent.service`
5. Enables the service to start on boot
6. Starts the agent immediately

After a few seconds, the server status in the OpsWatch dashboard changes from **offline** to **online** and metrics begin appearing.

---

## Method 2 — SSH Private Key

Use this method when you want OpsWatch to connect to the server automatically using an SSH private key and install the agent on your behalf. You do not need to run any commands on the remote server.

### Supported key formats

- **OpenSSH** — keys beginning with `-----BEGIN OPENSSH PRIVATE KEY-----`
- **RSA PEM** — keys beginning with `-----BEGIN RSA PRIVATE KEY-----`
- **EC** — keys beginning with `-----BEGIN EC PRIVATE KEY-----`

The public key corresponding to your private key must already be present in `~/.ssh/authorized_keys` on the remote server for the target user.

### Steps

**1.** Go to **Servers → Add Server**.

**2.** Select the **SSH Key** tab.

**3.** Fill in the connection details:

| Field | Description | Example |
|---|---|---|
| Server Name | Label for this server | `prod-db-01` |
| Host / IP | IP address or hostname of the server | `192.168.1.10` |
| SSH User | The user to connect as | `root` |
| SSH Port | SSH port (default: 22) | `22` |
| Private Key | Full text of your private key | *(paste below)* |
| Key Passphrase | Only if the key is encrypted | *(optional)* |
| OpsWatch API URL | Leave blank to use the default | *(optional)* |

**4.** Paste your private key into the **Private Key** field. Include the full header and footer lines:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAA...
...your key content...
-----END OPENSSH PRIVATE KEY-----
```

> **Tip:** On macOS/Linux, copy your key to the clipboard with:
> ```bash
> pbcopy < ~/.ssh/id_rsa        # macOS
> xclip -selection c < ~/.ssh/id_rsa  # Linux
> ```

**5.** Click **Install Agent**.

### What OpsWatch does automatically

Once you click **Install Agent**, OpsWatch performs these steps in sequence:

1. Opens an SSH connection to the server using the provided key
2. Registers the server in the database and generates a unique API key
3. Detects the remote OS and CPU architecture
4. Downloads the agent binary from the OpsWatch server directly to the remote machine
5. Writes `/opt/opswatch/.env` with the API URL and key
6. Creates and enables the `opswatch-agent` systemd service
7. Starts the agent

The process takes approximately 30–90 seconds depending on network speed. You will see a live install log in the modal when it completes.

---

## Method 3 — AWS PEM File

Use this method to connect AWS EC2 instances using the `.pem` key file downloaded from the AWS console. This is functionally identical to Method 2 but accepts a file upload instead of a pasted key.

### Before you start

- Locate the `.pem` key file that was associated with the EC2 instance at launch time
- Know the public DNS name or IP of the instance (available in the EC2 console)
- Know the default SSH user for your AMI:

| AMI | Default user |
|---|---|
| Ubuntu | `ubuntu` |
| Amazon Linux 2 / AL2023 | `ec2-user` |
| Debian | `admin` |
| CentOS / RHEL | `centos` or `ec2-user` |
| SUSE | `ec2-user` |

### Steps

**1.** In the AWS EC2 Console, find your instance and copy its **Public IPv4 DNS** or **Public IP**.

**2.** Open the OpsWatch Dashboard and go to **Servers → Add Server**.

**3.** Select the **AWS PEM** tab.

**4.** Fill in the connection details:

| Field | Description | Example |
|---|---|---|
| Server Name | Label for this server | `ec2-prod-api` |
| Host / IP | EC2 public DNS or IP | `ec2-3-44-55-66.compute.amazonaws.com` |
| SSH User | Default AMI user | `ubuntu` |
| SSH Port | Usually 22 | `22` |
| PEM Key File | Click to upload your `.pem` file | `my-key.pem` |
| OpsWatch API URL | Leave blank to use the default | *(optional)* |

**5.** Click the **PEM file upload area** and select your `.pem` file.

**6.** Click **Install Agent**.

OpsWatch connects to the EC2 instance via SSH using the PEM key and runs the full agent installation automatically — the same process as [Method 2](#what-opswatch-does-automatically).

### EC2 Security Group requirements

Ensure the EC2 instance's security group allows **outbound** traffic on port `4000` (or whichever port your OpsWatch API runs on) so the agent can send data. No inbound rules are needed for the agent itself.

> The OpsWatch server needs to be able to **initiate** the SSH connection on port 22. If your EC2 security group restricts inbound SSH, temporarily allow inbound TCP on port 22 from the OpsWatch server's IP during installation, then remove the rule.

---

## Verifying the Agent

After installation (by any method), verify the agent is running on the server:

```bash
systemctl status opswatch-agent
```

Expected output:

```
● opswatch-agent.service - OpsWatch Monitoring Agent
     Loaded: loaded (/etc/systemd/system/opswatch-agent.service; enabled; vendor preset: enabled)
     Active: active (running) since Wed 2026-03-12 10:00:00 UTC; 5s ago
   Main PID: 12345 (opswatch-agent)
```

View live agent logs:

```bash
journalctl -u opswatch-agent -f
```

Check the agent configuration:

```bash
cat /opt/opswatch/.env
```

Expected:

```
OPSWATCH_API_URL=http://your-opswatch-server:4000/api/v1
OPSWATCH_API_KEY=agent_xxxxxxxxxxxxxxxx
OPSWATCH_INTERVAL=10
OPSWATCH_DOMAIN_INTERVAL=60
OPSWATCH_AGENT_PORT=4001
```

Within 10–15 seconds, the server card in the OpsWatch dashboard should show **online** with live CPU, RAM, and disk metrics.

---

## Troubleshooting

### SSH connection failed — "All configured authentication methods failed"

**Cause:** The private key does not match any entry in `~/.ssh/authorized_keys` on the remote server, or the key was corrupted during copy-paste.

**Fix:**
1. Verify you are using the correct private key for the target user and server
2. Make sure the full key text is pasted, including the `-----BEGIN` and `-----END` lines
3. Check that there are no missing newlines — paste the key exactly as it appears in the file
4. If the key has a passphrase, enter it in the **Key Passphrase** field
5. Test the connection locally first:
   ```bash
   ssh -i ~/.ssh/your_key user@your-server
   ```

---

### Permission denied (publickey)

**Cause:** The public key is not in `~/.ssh/authorized_keys` for the specified user on the remote server.

**Fix:**
1. On the remote server, check the authorized keys file:
   ```bash
   cat ~/.ssh/authorized_keys
   ```
2. Add the public key if it is missing:
   ```bash
   echo "ssh-rsa AAAA... your-comment" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```
3. Ensure the `.ssh` directory has correct permissions:
   ```bash
   chmod 700 ~/.ssh
   ```

---

### Agent not starting after installation

**Cause:** The binary may not be executable, or the `.env` file may be missing or malformed.

**Fix:**
1. Check the service status and recent logs:
   ```bash
   systemctl status opswatch-agent
   journalctl -u opswatch-agent -n 50
   ```
2. Verify the binary is executable:
   ```bash
   ls -la /opt/opswatch/opswatch-agent
   chmod +x /opt/opswatch/opswatch-agent
   ```
3. Verify the environment file:
   ```bash
   cat /opt/opswatch/.env
   ```
4. Restart the service:
   ```bash
   systemctl restart opswatch-agent
   ```

---

### Cannot connect to server — host or port unreachable

**Cause:** A firewall is blocking the SSH connection (port 22) or the OpsWatch server cannot reach the target host.

**Fix:**
1. Test TCP connectivity from the OpsWatch server:
   ```bash
   nc -zv 192.168.1.10 22
   ```
2. On the remote server, ensure SSH is listening:
   ```bash
   ss -tlnp | grep ':22'
   ```
3. Check `ufw` or `iptables`:
   ```bash
   ufw status
   iptables -L INPUT -n
   ```
4. For AWS EC2, verify the Security Group allows inbound TCP on port 22 from the OpsWatch server's IP.

---

### Agent installed but server stays offline in dashboard

**Cause:** The agent is running but cannot reach the OpsWatch API server, or the API key is incorrect.

**Fix:**
1. From the monitored server, test outbound connectivity to the API:
   ```bash
   curl -v http://your-opswatch-server:4000/api/v1/health
   ```
2. Verify the API key in `/opt/opswatch/.env` matches the key shown in the OpsWatch dashboard for that server
3. Check if a firewall on the OpsWatch server is blocking inbound connections on port 4000
4. Check the agent logs for error messages:
   ```bash
   journalctl -u opswatch-agent -n 100 --no-pager
   ```

---

### Uninstalling the agent

To remove the agent from a server:

```bash
systemctl stop opswatch-agent
systemctl disable opswatch-agent
rm -f /etc/systemd/system/opswatch-agent.service
rm -rf /opt/opswatch
systemctl daemon-reload
```

Then delete the server from the OpsWatch dashboard using the **Delete** button on the server card.
