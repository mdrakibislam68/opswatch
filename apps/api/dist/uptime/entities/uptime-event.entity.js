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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UptimeEvent = void 0;
const typeorm_1 = require("typeorm");
const uptime_monitor_entity_1 = require("./uptime-monitor.entity");
let UptimeEvent = class UptimeEvent {
};
exports.UptimeEvent = UptimeEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UptimeEvent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => uptime_monitor_entity_1.UptimeMonitor, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'monitorId' }),
    __metadata("design:type", uptime_monitor_entity_1.UptimeMonitor)
], UptimeEvent.prototype, "monitor", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], UptimeEvent.prototype, "monitorId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], UptimeEvent.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], UptimeEvent.prototype, "responseTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], UptimeEvent.prototype, "statusCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], UptimeEvent.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UptimeEvent.prototype, "createdAt", void 0);
exports.UptimeEvent = UptimeEvent = __decorate([
    (0, typeorm_1.Entity)('uptime_events')
], UptimeEvent);
//# sourceMappingURL=uptime-event.entity.js.map