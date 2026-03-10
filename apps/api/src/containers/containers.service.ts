import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Container } from './entities/container.entity';
import { AlertsService } from '../alerts/alerts.service';
import { EventsGateway } from '../websocket/events.gateway';

@Injectable()
export class ContainersService {
  constructor(
    @InjectRepository(Container) private containerRepo: Repository<Container>,
    private alertsService: AlertsService,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll(serverId?: string) {
    const where = serverId ? { serverId } : {};
    return this.containerRepo.find({ where, order: { updatedAt: 'DESC' } });
  }

  async findById(id: string) {
    return this.containerRepo.findOne({ where: { id } });
  }

  async findByDockerId(dockerId: string) {
    return this.containerRepo.findOne({ where: { dockerId }, relations: ['server'] });
  }

  async syncFromAgent(serverId: string, containers: any[]) {
    // Get existing containers for this server
    const existing = await this.containerRepo.find({ where: { serverId } });
    const existingMap = new Map(existing.map((c) => [c.dockerId, c]));

    const updates = [];
    for (const c of containers) {
      const prev = existingMap.get(c.dockerId);

      // Alert if container went from running to stopped
      if (prev && prev.status === 'running' && c.status !== 'running') {
        await this.alertsService.triggerContainerDown(serverId, c.name, c.dockerId);
      }

      const entity = this.containerRepo.create({
        ...prev,
        serverId,
        dockerId: c.dockerId,
        name: c.name,
        image: c.image,
        status: c.status,
        cpuPercent: c.cpuPercent,
        memoryUsage: c.memoryUsage,
        memoryLimit: c.memoryLimit,
        restartCount: c.restartCount,
        startedAt: c.startedAt,
        ports: c.ports,
        networkRx: c.networkRx,
        networkTx: c.networkTx,
      });
      updates.push(entity);
      existingMap.delete(c.dockerId);
    }

    await this.containerRepo.save(updates);

    // Remove containers no longer present
    const removed = Array.from(existingMap.values());
    if (removed.length) {
      for (const r of removed) {
        if (r.status === 'running') {
          await this.alertsService.triggerContainerDown(serverId, r.name, r.dockerId);
        }
      }
      await this.containerRepo.remove(removed);
    }

    const all = await this.findAll(serverId);
    this.eventsGateway.emitContainersUpdate(serverId, all);
    return all;
  }

  async getStats() {
    const total = await this.containerRepo.count();
    const running = await this.containerRepo.count({ where: { status: 'running' } });
    const stopped = await this.containerRepo.count({ where: { status: 'exited' } });
    return { total, running, stopped };
  }
}
