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
exports.Container = void 0;
const typeorm_1 = require("typeorm");
const server_entity_1 = require("../../servers/entities/server.entity");
let Container = class Container {
};
exports.Container = Container;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Container.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => server_entity_1.Server, (server) => server.containers, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'serverId' }),
    __metadata("design:type", server_entity_1.Server)
], Container.prototype, "server", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Container.prototype, "serverId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Container.prototype, "dockerId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Container.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Container.prototype, "image", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'unknown' }),
    __metadata("design:type", String)
], Container.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], Container.prototype, "cpuPercent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    __metadata("design:type", Number)
], Container.prototype, "memoryUsage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    __metadata("design:type", Number)
], Container.prototype, "memoryLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Container.prototype, "restartCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Container.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Container.prototype, "ports", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Container.prototype, "networkRx", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Container.prototype, "networkTx", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Container.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Container.prototype, "createdAt", void 0);
exports.Container = Container = __decorate([
    (0, typeorm_1.Entity)('containers')
], Container);
//# sourceMappingURL=container.entity.js.map