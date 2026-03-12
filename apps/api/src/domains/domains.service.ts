import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Domain } from './entities/domain.entity';
import { EventsGateway } from '../websocket/events.gateway';

@Injectable()
export class DomainsService {
  constructor(
    @InjectRepository(Domain) private domainRepo: Repository<Domain>,
    private eventsGateway: EventsGateway,
  ) {}

  async findAll(filters: {
    serverId?: string;
    containerName?: string;
    port?: number;
  }) {
    const qb = this.domainRepo
      .createQueryBuilder('domain')
      .leftJoinAndSelect('domain.server', 'server')
      .orderBy('domain.domain', 'ASC');

    if (filters.serverId) {
      qb.andWhere('domain.serverId = :serverId', {
        serverId: filters.serverId,
      });
    }

    if (filters.containerName) {
      qb.andWhere('domain.containerName ILIKE :containerName', {
        containerName: `%${filters.containerName}%`,
      });
    }

    if (filters.port) {
      qb.andWhere('domain.port = :port', { port: filters.port });
    }

    return qb.getMany();
  }

  async findById(id: string) {
    return this.domainRepo.findOne({
      where: { id },
      relations: ['server'],
    });
  }

  async syncFromAgent(serverId: string, domains: any[]) {
    // Deduplicate by domain name — last writer wins (agent already
    // prefers sites-enabled, but guard here too).
    const dedupedMap = new Map<string, any>();
    for (const d of domains) {
      if (d.domain) dedupedMap.set(d.domain, d);
    }
    const deduped = Array.from(dedupedMap.values());

    const existing = await this.domainRepo.find({ where: { serverId } });
    const existingMap = new Map(existing.map((d) => [d.domain, d]));

    const now = new Date();
    const updates: Domain[] = [];

    for (const d of deduped) {
      const prev = existingMap.get(d.domain);

      const entity = this.domainRepo.create({
        // Carry existing id so TypeORM does UPDATE not INSERT
        ...(prev ? { id: prev.id } : {}),
        serverId,
        domain: d.domain,
        proxyPass: d.proxyPass ?? null,
        port: d.port ?? null,
        ssl: !!d.ssl,
        configFile: d.configFile ?? null,
        configContent: d.configContent ?? null,
        containerId: d.containerId ?? null,
        containerName: d.containerName ?? null,
        status: 'active',
        lastSeenAt: now,
      });

      updates.push(entity);
      existingMap.delete(d.domain);
    }

    // Save one by one to avoid batch insert conflicts on the unique index.
    for (const entity of updates) {
      await this.domainRepo.save(entity);
    }

    // Mark domains no longer present as stale
    const stale = Array.from(existingMap.values());
    if (stale.length) {
      const staleIds = stale.map((s) => s.id);
      await this.domainRepo
        .createQueryBuilder()
        .update(Domain)
        .set({ status: 'stale' })
        .whereInIds(staleIds)
        .execute();
    }

    const all = await this.findAll({ serverId });
    this.eventsGateway.emitDomainsUpdate(serverId, all);
    return all;
  }

  async getStats() {
    const total = await this.domainRepo.count();
    const withSSL = await this.domainRepo.count({ where: { ssl: true } });
    const active = await this.domainRepo.count({
      where: { status: 'active' },
    });

    const uniqueServers = await this.domainRepo
      .createQueryBuilder('domain')
      .select('COUNT(DISTINCT domain.serverId)', 'count')
      .getRawOne();

    return {
      total,
      withSSL,
      active,
      servers: parseInt(uniqueServers?.count || '0', 10),
    };
  }
}
