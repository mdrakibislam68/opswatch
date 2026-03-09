"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const container_entity_1 = require("./entities/container.entity");
const alerts_service_1 = require("../alerts/alerts.service");
const events_gateway_1 = require("../websocket/events.gateway");
let ContainersService = class ContainersService {
    constructor(containerRepo, alertsService, eventsGateway) {
        this.containerRepo = containerRepo;
        this.alertsService = alertsService;
        this.eventsGateway = eventsGateway;
    }
    async findAll(serverId) {
        const where = serverId ? { serverId } : {};
        return this.containerRepo.find({ where, order: { updatedAt: 'DESC' } });
    }
    async findById(id) {
        return this.containerRepo.findOne({ where: { id } });
    }
    async syncFromAgent(serverId, containers) {
        const existing = await this.containerRepo.find({ where: { serverId } });
        const existingMap = new Map(existing.map((c) => [c.dockerId, c]));
        const updates = [];
        for (const c of containers) {
            const prev = existingMap.get(c.dockerId);
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
        const removed = Array.from(existingMap.values());
        if (removed.length)
            await this.containerRepo.remove(removed);
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
};
exports.ContainersService = ContainersService;
exports.ContainersService = ContainersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(container_entity_1.Container)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        alerts_service_1.AlertsService,
        events_gateway_1.EventsGateway])
], ContainersService);
//# sourceMappingURL=containers.service.js.map