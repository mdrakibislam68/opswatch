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
exports.UptimeMonitor = void 0;
const typeorm_1 = require("typeorm");
let UptimeMonitor = class UptimeMonitor {
};
exports.UptimeMonitor = UptimeMonitor;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UptimeMonitor.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], UptimeMonitor.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], UptimeMonitor.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'http' }),
    __metadata("design:type", String)
], UptimeMonitor.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 60 }),
    __metadata("design:type", Number)
], UptimeMonitor.prototype, "intervalSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 200 }),
    __metadata("design:type", Number)
], UptimeMonitor.prototype, "expectedStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 5000 }),
    __metadata("design:type", Number)
], UptimeMonitor.prototype, "timeoutMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'unknown' }),
    __metadata("design:type", String)
], UptimeMonitor.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], UptimeMonitor.prototype, "responseTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], UptimeMonitor.prototype, "uptime24h", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], UptimeMonitor.prototype, "uptime7d", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], UptimeMonitor.prototype, "lastCheckedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], UptimeMonitor.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UptimeMonitor.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], UptimeMonitor.prototype, "updatedAt", void 0);
exports.UptimeMonitor = UptimeMonitor = __decorate([
    (0, typeorm_1.Entity)('uptime_monitors')
], UptimeMonitor);
//# sourceMappingURL=uptime-monitor.entity.js.map