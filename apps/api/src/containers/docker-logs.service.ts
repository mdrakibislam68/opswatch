import { Injectable, Logger, NotFoundException, BadGatewayException } from '@nestjs/common';
import { Response } from 'express';
import { ContainersService } from './containers.service';
import axios from 'axios';
import * as http from 'http';
import * as https from 'https';

@Injectable()
export class DockerLogsService {
  private readonly logger = new Logger(DockerLogsService.name);

  constructor(private containersService: ContainersService) {}

  private async getAgentUrl(dockerId: string, path: string): Promise<string> {
    const container = await this.containersService.findByDockerId(dockerId);
    if (!container) {
      throw new NotFoundException(`Container "${dockerId}" not found in database`);
    }
    const server = container.server;
    if (!server || !server.ip) {
      throw new BadGatewayException(`Server IP unknown for container "${dockerId}"`);
    }

    // Proxy to Agent API on port 4001
    return `http://${server.ip}:4001/api/containers/${dockerId}${path}`;
  }

  // ─── Fetch static logs ──────────────────────────────────────────────────────
  async getContainerLogs(
    dockerId: string,
    tail = 100,
    timestamps = true,
  ): Promise<string[]> {
    const url = await this.getAgentUrl(dockerId, `/logs?tail=${tail}&timestamps=${timestamps}`);
    
    try {
      const response = await axios.get(url, { timeout: 10000 });
      return response.data?.lines || [];
    } catch (err) {
      this.logger.error(`Failed to fetch logs from agent: ${err.message}`);
      throw new BadGatewayException(`Failed to reach agent at ${url}`);
    }
  }

  // ─── SSE streaming ──────────────────────────────────────────────────────────
  async streamContainerLogs(
    dockerId: string,
    res: Response,
    tail = 50,
  ): Promise<void> {
    let url: string;
    try {
      url = await this.getAgentUrl(dockerId, `/logs/stream?tail=${tail}&timestamps=true`);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
      return;
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders();

    const clientReq = (url.startsWith('https:') ? https : http).get(url, (agentRes) => {
      if (agentRes.statusCode !== 200) {
        this.logger.error(`Agent stream error: HTTP ${agentRes.statusCode}`);
        res.write(`data:${JSON.stringify({ error: `Agent responded with HTTP ${agentRes.statusCode}` })}\n\n`);
        res.end();
        return;
      }

      agentRes.on('data', (chunk) => {
        // Just pipe the chunk over
        res.write(chunk);
      });

      agentRes.on('end', () => {
        res.end();
      });
      
      agentRes.on('error', (err) => {
        this.logger.error(`Stream error: ${err.message}`);
        res.write(`data:${JSON.stringify({ error: 'Stream error' })}\n\n`);
        res.end();
      });
    });

    clientReq.on('error', (err) => {
      this.logger.error(`Failed to connect to agent stream: ${err.message}`);
      res.write(`data:${JSON.stringify({ error: 'Failed to connect to agent' })}\n\n`);
      res.end();
    });

    // Cleanup on client disconnect
    res.on('close', () => {
      clientReq.destroy();
    });
  }
}

