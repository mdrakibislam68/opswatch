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
var UptimeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UptimeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const axios = require("axios");
const uptime_monitor_entity_1 = require("./entities/uptime-monitor.entity");
const uptime_event_entity_1 = require("./entities/uptime-event.entity");
const alerts_service_1 = require("../alerts/alerts.service");
const events_gateway_1 = require("../websocket/events.gateway");
let UptimeService = UptimeService_1 = class UptimeService {
    constructor(monitorRepo, eventRepo, alertsService, eventsGateway) {
        this.monitorRepo = monitorRepo;
        this.eventRepo = eventRepo;
        this.alertsService = alertsService;
        this.eventsGateway = eventsGateway;
        this.logger = new common_1.Logger(UptimeService_1.name);
    }
    async findAll() { return this.monitorRepo.find({ order: { createdAt: 'DESC' } }); }
    async findById(id) { return this.monitorRepo.findOne({ where: { id } }); }
    async create(data) {
        const monitor = this.monitorRepo.create(data);
        return this.monitorRepo.save(monitor);
    }
    async update(id, data) {
        await this.monitorRepo.update(id, data);
        return this.findById(id);
    }
    async delete(id) { return this.monitorRepo.delete(id); }
    async getHistory(monitorId, hours = 24) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.eventRepo.find({
            where: { monitorId, createdAt: (0, typeorm_2.MoreThan)(since) },
            order: { createdAt: 'DESC' },
            take: 200,
        });
    }
    async runChecks() {
        const monitors = await this.monitorRepo.find({ where: { isActive: true } });
        await Promise.allSettled(monitors.map((m) => this.checkMonitor(m)));
    }
    async checkMonitor(monitor) {
        const start = Date.now();
        let status = 'down';
        let statusCode;
        let errorMessage;
        try {
            const res = await axios.default.get(monitor.url, {
                timeout: monitor.timeoutMs,
                validateStatus: () => true,
            });
            statusCode = res.status;
            const responseTime = Date.now() - start;
            status = statusCode === monitor.expectedStatus ? 'up' : 'down';
            const event = this.eventRepo.create({
                monitorId: monitor.id,
                status,
                responseTime,
                statusCode,
            });
            await this.eventRepo.save(event);
            if (status === 'down' && monitor.status === 'up') {
                await this.alertsService.triggerHttpDown(monitor.id, monitor.name, monitor.url, statusCode);
            }
            const uptime24h = await this.computeUptime(monitor.id, 24);
            await this.monitorRepo.update(monitor.id, {
                status,
                responseTime,
                lastCheckedAt: new Date(),
                uptime24h,
            });
        }
        catch (e) {
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
    async computeUptime(monitorId, hours) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        const events = await this.eventRepo.find({ where: { monitorId, createdAt: (0, typeorm_2.MoreThan)(since) } });
        if (!events.length)
            return null;
        const upCount = events.filter((e) => e.status === 'up').length;
        return (upCount / events.length) * 100;
    }
};
exports.UptimeService = UptimeService;
__decorate([
    (0, schedule_1.Cron)('*/30 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UptimeService.prototype, "runChecks", null);
exports.UptimeService = UptimeService = UptimeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(uptime_monitor_entity_1.UptimeMonitor)),
    __param(1, (0, typeorm_1.InjectRepository)(uptime_event_entity_1.UptimeEvent)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        alerts_service_1.AlertsService,
        events_gateway_1.EventsGateway])
], UptimeService);
//# sourceMappingURL=uptime.service.js.map