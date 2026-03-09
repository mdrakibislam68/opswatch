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
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const metric_entity_1 = require("./entities/metric.entity");
const servers_service_1 = require("../servers/servers.service");
const alerts_service_1 = require("../alerts/alerts.service");
const schedule_1 = require("@nestjs/schedule");
let MetricsService = class MetricsService {
    constructor(metricRepo, serversService, alertsService) {
        this.metricRepo = metricRepo;
        this.serversService = serversService;
        this.alertsService = alertsService;
    }
    async ingest(payload) {
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
        await this.alertsService.evaluateServerMetrics(payload.serverId, payload);
        return { ok: true };
    }
    async getHistory(serverId, hours = 24) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.metricRepo.find({
            where: { serverId, createdAt: (0, typeorm_2.MoreThan)(since) },
            order: { createdAt: 'ASC' },
            select: ['id', 'cpuUsage', 'ramUsage', 'diskUsage', 'loadAvg', 'netRx', 'netTx', 'createdAt'],
        });
    }
    async getLatest(serverId) {
        return this.metricRepo.findOne({
            where: { serverId },
            order: { createdAt: 'DESC' },
        });
    }
    async purgeOldMetrics() {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await this.metricRepo
            .createQueryBuilder()
            .delete()
            .where('createdAt < :cutoff', { cutoff })
            .execute();
    }
    async checkOfflineServers() {
        const cutoff = new Date(Date.now() - 60 * 1000);
        const servers = await this.serversService.findAll();
        for (const server of servers) {
            if (server.status === 'online' &&
                server.lastSeenAt &&
                new Date(server.lastSeenAt) < cutoff) {
                await this.serversService.markOffline(server.id);
                await this.alertsService.triggerServerOffline(server.id, server.name);
            }
        }
    }
};
exports.MetricsService = MetricsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsService.prototype, "purgeOldMetrics", null);
__decorate([
    (0, schedule_1.Cron)('*/30 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsService.prototype, "checkOfflineServers", null);
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(metric_entity_1.Metric)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        servers_service_1.ServersService,
        alerts_service_1.AlertsService])
], MetricsService);
//# sourceMappingURL=metrics.service.js.map