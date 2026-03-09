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
exports.MetricsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const metrics_service_1 = require("./metrics.service");
const auth_guard_1 = require("../auth/guards/auth.guard");
let MetricsController = class MetricsController {
    constructor(metricsService) {
        this.metricsService = metricsService;
    }
    ingest(req, body) {
        return this.metricsService.ingest({ ...body, serverId: req.user.id });
    }
    history(serverId, hours) {
        return this.metricsService.getHistory(serverId, hours || 24);
    }
    latest(serverId) {
        return this.metricsService.getLatest(serverId);
    }
};
exports.MetricsController = MetricsController;
__decorate([
    (0, swagger_1.ApiSecurity)('agent-key'),
    (0, common_1.UseGuards)(auth_guard_1.ApiKeyGuard),
    (0, common_1.Post)('ingest'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MetricsController.prototype, "ingest", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':serverId/history'),
    __param(0, (0, common_1.Param)('serverId')),
    __param(1, (0, common_1.Query)('hours')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], MetricsController.prototype, "history", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':serverId/latest'),
    __param(0, (0, common_1.Param)('serverId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MetricsController.prototype, "latest", null);
exports.MetricsController = MetricsController = __decorate([
    (0, swagger_1.ApiTags)('metrics'),
    (0, common_1.Controller)('metrics'),
    __metadata("design:paramtypes", [metrics_service_1.MetricsService])
], MetricsController);
//# sourceMappingURL=metrics.controller.js.map