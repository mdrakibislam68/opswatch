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
exports.ServersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const server_entity_1 = require("./entities/server.entity");
const uuid_1 = require("uuid");
const events_gateway_1 = require("../websocket/events.gateway");
let ServersService = class ServersService {
    constructor(serverRepo, eventsGateway) {
        this.serverRepo = serverRepo;
        this.eventsGateway = eventsGateway;
    }
    async findAll() {
        return this.serverRepo.find({ order: { createdAt: 'DESC' } });
    }
    async findById(id) {
        const server = await this.serverRepo.findOne({ where: { id } });
        if (!server)
            throw new common_1.NotFoundException('Server not found');
        return server;
    }
    async findByApiKey(apiKey) {
        return this.serverRepo.findOne({ where: { apiKey } });
    }
    async create(data) {
        const apiKey = `agent_${(0, uuid_1.v4)().replace(/-/g, '')}`;
        const server = this.serverRepo.create({ ...data, apiKey, status: 'offline' });
        return this.serverRepo.save(server);
    }
    async update(id, data) {
        await this.serverRepo.update(id, data);
        const updated = await this.findById(id);
        this.eventsGateway.emitServerUpdate(updated);
        return updated;
    }
    async updateHeartbeat(id, metrics) {
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
    async markOffline(id) {
        await this.serverRepo.update(id, { status: 'offline' });
        this.eventsGateway.emitServerUpdate({ id, status: 'offline' });
    }
    async delete(id) {
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
};
exports.ServersService = ServersService;
exports.ServersService = ServersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(server_entity_1.Server)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        events_gateway_1.EventsGateway])
], ServersService);
//# sourceMappingURL=servers.service.js.map