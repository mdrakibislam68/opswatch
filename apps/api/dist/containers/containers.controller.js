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
exports.ContainersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const containers_service_1 = require("./containers.service");
const auth_guard_1 = require("../auth/guards/auth.guard");
let ContainersController = class ContainersController {
    constructor(containersService) {
        this.containersService = containersService;
    }
    sync(req, body) {
        return this.containersService.syncFromAgent(req.user.id, body.containers);
    }
    findAll(serverId) {
        return this.containersService.findAll(serverId);
    }
    getStats() { return this.containersService.getStats(); }
    findOne(id) { return this.containersService.findById(id); }
};
exports.ContainersController = ContainersController;
__decorate([
    (0, swagger_1.ApiSecurity)('agent-key'),
    (0, common_1.UseGuards)(auth_guard_1.ApiKeyGuard),
    (0, common_1.Post)('sync'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ContainersController.prototype, "sync", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('serverId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContainersController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ContainersController.prototype, "getStats", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ContainersController.prototype, "findOne", null);
exports.ContainersController = ContainersController = __decorate([
    (0, swagger_1.ApiTags)('containers'),
    (0, common_1.Controller)('containers'),
    __metadata("design:paramtypes", [containers_service_1.ContainersService])
], ContainersController);
//# sourceMappingURL=containers.controller.js.map