import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Metric } from './entities/metric.entity';
import { ServersService } from '../servers/servers.service';
import { AlertsService } from '../alerts/alerts.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface AgentPayload {
  serverId: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  loadAvg: number;
  netRx: number;
  netTx: number;
  uptimeSeconds: number;
  os?: string;
  arch?: string;
  totalRam?: number;
  totalDisk?: number;
  agentVersion?: string;
}

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(Metric) private metricRepo: Repository<Metric>,
    private serversService: ServersService,
    private alertsService: AlertsService,
  ) {}

  async ingest(payload: AgentPayload) {
    // Save metric snapshot
    const metric = this.metricRepo.create({
      serverId: payload.serverId,
      cpuUsage: payload.cpuUsage,
      ramUsage: payload.ramUsage,
      diskUsage: payload.diskUsage,
      loadAvg: payload.loadAvg,
      netRx: payload.netRx,
      netTx: payload.netTx,
      uptimeSeconds: payload.uptimeSeconds,
    });
    await this.metricRepo.save(metric);

    // Update server current state
    await this.serversService.updateHeartbeat(payload.serverId, {
      cpuUsage: payload.cpuUsage,
      ramUsage: payload.ramUsage,
      diskUsage: payload.diskUsage,
      loadAvg: payload.loadAvg,
      os: payload.os,
      arch: payload.arch,
      totalRam: payload.totalRam,
      totalDisk: payload.totalDisk,
      uptimeSeconds: payload.uptimeSeconds,
      agentVersion: payload.agentVersion,
    });

    // Evaluate alert rules
    await this.alertsService.evaluateServerMetrics(payload.serverId, payload);

    return { ok: true };
  }

  async getHistory(serverId: string, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricRepo.find({
      where: { serverId, createdAt: MoreThan(since) },
      order: { createdAt: 'ASC' },
      select: ['id', 'cpuUsage', 'ramUsage', 'diskUsage', 'loadAvg', 'netRx', 'netTx', 'createdAt'],
    });
  }

  async getLatest(serverId: string) {
    return this.metricRepo.findOne({
      where: { serverId },
      order: { createdAt: 'DESC' },
    });
  }

  // Clean up old metrics after 30 days
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeOldMetrics() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.metricRepo
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoff', { cutoff })
      .execute();
  }

  // Check servers offline (not seen in 30s)
  @Cron('*/30 * * * * *')
  async checkOfflineServers() {
    const cutoff = new Date(Date.now() - 60 * 1000);
    const servers = await this.serversService.findAll();
    for (const server of servers) {
      if (
        server.status === 'online' &&
        server.lastSeenAt &&
        new Date(server.lastSeenAt) < cutoff
      ) {
        await this.serversService.markOffline(server.id);
        await this.alertsService.triggerServerOffline(server.id, server.name);
      }
    }
  }
}
