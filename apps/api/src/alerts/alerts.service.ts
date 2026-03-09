import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule } from './entities/alert-rule.entity';
import { AlertEvent } from './entities/alert-event.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertRule) private ruleRepo: Repository<AlertRule>,
    @InjectRepository(AlertEvent) private eventRepo: Repository<AlertEvent>,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Rules CRUD ───────────────────────────────────────────────────────────
  async getRules() { return this.ruleRepo.find({ order: { createdAt: 'DESC' } }); }

  async createRule(data: Partial<AlertRule>) {
    const rule = this.ruleRepo.create(data);
    return this.ruleRepo.save(rule);
  }

  async updateRule(id: string, data: Partial<AlertRule>) {
    await this.ruleRepo.update(id, data);
    return this.ruleRepo.findOne({ where: { id } });
  }

  async deleteRule(id: string) {
    return this.ruleRepo.delete(id);
  }

  // ─── Events ───────────────────────────────────────────────────────────────
  async getEvents(limit = 50) {
    return this.eventRepo.find({ order: { createdAt: 'DESC' }, take: limit });
  }

  // ─── Evaluators ───────────────────────────────────────────────────────────
  async evaluateServerMetrics(serverId: string, metrics: any) {
    const rules = await this.ruleRepo.find({
      where: [{ serverId }, { serverId: null }],
      order: { createdAt: 'ASC' },
    });

    for (const rule of rules) {
      if (!rule.isActive) continue;

      let value: number;
      if (rule.type === 'cpu') value = metrics.cpuUsage;
      else if (rule.type === 'ram') value = metrics.ramUsage;
      else if (rule.type === 'disk') value = metrics.diskUsage;
      else continue;

      const breached = this.compare(value, rule.operator, rule.threshold);
      if (breached) {
        await this.fireAlert(rule, {
          serverId,
          severity: 'warning',
          message: `${rule.type.toUpperCase()} usage is ${value.toFixed(1)}% (threshold: ${rule.threshold}%)`,
          value,
        });
      }
    }
  }

  async triggerServerOffline(serverId: string, serverName: string) {
    const rules = await this.ruleRepo.find({
      where: [{ type: 'server_offline', serverId }, { type: 'server_offline', serverId: null }],
    });

    for (const rule of rules) {
      if (!rule.isActive) continue;
      await this.fireAlert(rule, {
        serverId,
        serverName,
        severity: 'critical',
        message: `Server "${serverName}" is OFFLINE`,
        value: 0,
      });
    }
  }

  async triggerContainerDown(serverId: string, containerName: string, containerId: string) {
    const rules = await this.ruleRepo.find({ where: { type: 'container_down' } });
    for (const rule of rules) {
      if (!rule.isActive) continue;
      await this.fireAlert(rule, {
        serverId,
        containerName,
        severity: 'critical',
        message: `Container "${containerName}" stopped`,
        value: 0,
      });
    }
  }

  async triggerHttpDown(monitorId: string, monitorName: string, url: string, statusCode?: number) {
    const rules = await this.ruleRepo.find({
      where: [{ type: 'http_down', monitorId }, { type: 'http_down', monitorId: null }],
    });
    for (const rule of rules) {
      if (!rule.isActive) continue;
      await this.fireAlert(rule, {
        monitorId,
        severity: 'critical',
        message: `HTTP monitor "${monitorName}" is DOWN - ${url}${statusCode ? ` (HTTP ${statusCode})` : ''}`,
        value: statusCode || 0,
      });
    }
  }

  // ─── Internal ─────────────────────────────────────────────────────────────
  private compare(value: number, operator: string, threshold: number): boolean {
    if (operator === '>') return value > threshold;
    if (operator === '<') return value < threshold;
    if (operator === '>=') return value >= threshold;
    if (operator === '<=') return value <= threshold;
    if (operator === '==') return value === threshold;
    return false;
  }

  private async fireAlert(rule: AlertRule, data: any) {
    const event = this.eventRepo.create({
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      serverId: data.serverId,
      serverName: data.serverName,
      containerId: data.containerId,
      containerName: data.containerName,
      monitorId: data.monitorId,
      severity: data.severity,
      message: data.message,
      value: data.value,
      status: 'firing',
    });
    await this.eventRepo.save(event);

    // Send notifications via configured channels
    await this.notificationsService.send(rule, event);
  }
}
