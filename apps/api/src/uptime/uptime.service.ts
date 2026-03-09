import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import * as axios from 'axios';
import { UptimeMonitor } from './entities/uptime-monitor.entity';
import { UptimeEvent } from './entities/uptime-event.entity';
import { AlertsService } from '../alerts/alerts.service';
import { EventsGateway } from '../websocket/events.gateway';

@Injectable()
export class UptimeService {
  private readonly logger = new Logger(UptimeService.name);

  constructor(
    @InjectRepository(UptimeMonitor) private monitorRepo: Repository<UptimeMonitor>,
    @InjectRepository(UptimeEvent) private eventRepo: Repository<UptimeEvent>,
    private alertsService: AlertsService,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll() { return this.monitorRepo.find({ order: { createdAt: 'DESC' } }); }
  async findById(id: string) { return this.monitorRepo.findOne({ where: { id } }); }

  async create(data: Partial<UptimeMonitor>) {
    const monitor = this.monitorRepo.create(data);
    return this.monitorRepo.save(monitor);
  }

  async update(id: string, data: Partial<UptimeMonitor>) {
    await this.monitorRepo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string) { return this.monitorRepo.delete(id); }

  async getHistory(monitorId: string, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.eventRepo.find({
      where: { monitorId, createdAt: MoreThan(since) },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  // Runs every 30 seconds and checks each monitor
  @Cron('*/30 * * * * *')
  async runChecks() {
    const monitors = await this.monitorRepo.find({ where: { isActive: true } });
    await Promise.allSettled(monitors.map((m) => this.checkMonitor(m)));
  }

  private async checkMonitor(monitor: UptimeMonitor) {
    const start = Date.now();
    let status = 'down';
    let statusCode: number;
    let errorMessage: string;

    try {
      const res = await (axios as any).default.get(monitor.url, {
        timeout: monitor.timeoutMs,
        validateStatus: () => true,
      });
      statusCode = res.status;
      const responseTime = Date.now() - start;
      status = statusCode === monitor.expectedStatus ? 'up' : 'down';

      // Save event
      const event = this.eventRepo.create({
        monitorId: monitor.id,
        status,
        responseTime,
        statusCode,
      });
      await this.eventRepo.save(event);

      // Alert on transition to down
      if (status === 'down' && monitor.status === 'up') {
        await this.alertsService.triggerHttpDown(monitor.id, monitor.name, monitor.url, statusCode);
      }

      // Update monitor state
      const uptime24h = await this.computeUptime(monitor.id, 24);
      await this.monitorRepo.update(monitor.id, {
        status,
        responseTime,
        lastCheckedAt: new Date(),
        uptime24h,
      });
    } catch (e) {
      errorMessage = e.message;
      const event = this.eventRepo.create({ monitorId: monitor.id, status: 'down', errorMessage });
      await this.eventRepo.save(event);

      if (monitor.status !== 'down') {
        await this.alertsService.triggerHttpDown(monitor.id, monitor.name, monitor.url);
      }
      await this.monitorRepo.update(monitor.id, { status: 'down', lastCheckedAt: new Date() });
    }

    this.eventsGateway.emitUptimeUpdate({ monitorId: monitor.id, status, statusCode });
  }

  private async computeUptime(monitorId: string, hours: number) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const events = await this.eventRepo.find({ where: { monitorId, createdAt: MoreThan(since) } });
    if (!events.length) return null;
    const upCount = events.filter((e) => e.status === 'up').length;
    return (upCount / events.length) * 100;
  }
}
