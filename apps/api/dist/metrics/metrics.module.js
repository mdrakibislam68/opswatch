"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const metrics_controller_1 = require("./metrics.controller");
const metrics_service_1 = require("./metrics.service");
const metric_entity_1 = require("./entities/metric.entity");
const servers_module_1 = require("../servers/servers.module");
const alerts_module_1 = require("../alerts/alerts.module");
const server_entity_1 = require("../servers/entities/server.entity");
let MetricsModule = class MetricsModule {
};
exports.MetricsModule = MetricsModule;
exports.MetricsModule = MetricsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([metric_entity_1.Metric, server_entity_1.Server]),
            servers_module_1.ServersModule,
            alerts_module_1.AlertsModule,
        ],
        controllers: [metrics_controller_1.MetricsController],
        providers: [metrics_service_1.MetricsService],
        exports: [metrics_service_1.MetricsService],
    })
], MetricsModule);
//# sourceMappingURL=metrics.module.js.map