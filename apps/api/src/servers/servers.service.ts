import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from './entities/server.entity';
import { v4 as uuidv4 } from 'uuid';
import { EventsGateway } from '../websocket/events.gateway';

@Injectable()
export class ServersService {
  constructor(
    @InjectRepository(Server) private serverRepo: Repository<Server>,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll() {
    return this.serverRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string) {
    const server = await this.serverRepo.findOne({ where: { id } });
    if (!server) throw new NotFoundException('Server not found');
    return server;
  }

  async findByApiKey(apiKey: string) {
    return this.serverRepo.findOne({ where: { apiKey } });
  }

  async create(data: { name: string; hostname: string }) {
    const apiKey = `agent_${uuidv4().replace(/-/g, '')}`;
    const server = this.serverRepo.create({ ...data, apiKey, status: 'offline' });
    return this.serverRepo.save(server);
  }

  async update(id: string, data: Partial<Server>) {
    await this.serverRepo.update(id, data);
    const updated = await this.findById(id);
    this.eventsGateway.emitServerUpdate(updated);
    return updated;
  }

  async updateHeartbeat(id: string, metrics: Partial<Server>) {
    const now = new Date();
    await this.serverRepo.update(id, {
      ...metrics,
      status: 'online',
      lastSeenAt: now,
    });
    const updated = await this.findById(id);
    this.eventsGateway.emitServerUpdate(updated);
    return updated;
  }

  async markOffline(id: string) {
    await this.serverRepo.update(id, { status: 'offline' });
    this.eventsGateway.emitServerUpdate({ id, status: 'offline' });
  }

  async delete(id: string) {
    const server = await this.findById(id);
    return this.serverRepo.remove(server);
  }

  async getStats() {
    const total = await this.serverRepo.count();
    const online = await this.serverRepo.count({ where: { status: 'online' } });
    const offline = await this.serverRepo.count({ where: { status: 'offline' } });
    const warning = await this.serverRepo.count({ where: { status: 'warning' } });
    return { total, online, offline, warning };
  }
}
