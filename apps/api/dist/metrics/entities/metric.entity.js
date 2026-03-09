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
exports.Metric = void 0;
const typeorm_1 = require("typeorm");
const server_entity_1 = require("../../servers/entities/server.entity");
let Metric = class Metric {
};
exports.Metric = Metric;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Metric.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => server_entity_1.Server, (server) => server.metrics, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'serverId' }),
    __metadata("design:type", server_entity_1.Server)
], Metric.prototype, "server", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Metric.prototype, "serverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], Metric.prototype, "cpuUsage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], Metric.prototype, "ramUsage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], Metric.prototype, "diskUsage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Metric.prototype, "loadAvg", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    __metadata("design:type", Number)
], Metric.prototype, "netRx", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    __metadata("design:type", Number)
], Metric.prototype, "netTx", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Metric.prototype, "uptimeSeconds", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Metric.prototype, "createdAt", void 0);
exports.Metric = Metric = __decorate([
    (0, typeorm_1.Entity)('metrics'),
    (0, typeorm_1.Index)(['serverId', 'createdAt'])
], Metric);
//# sourceMappingURL=metric.entity.js.map