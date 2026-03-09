"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const containers_controller_1 = require("./containers.controller");
const containers_service_1 = require("./containers.service");
const container_entity_1 = require("./entities/container.entity");
const servers_module_1 = require("../servers/servers.module");
const alerts_module_1 = require("../alerts/alerts.module");
const websocket_module_1 = require("../websocket/websocket.module");
const server_entity_1 = require("../servers/entities/server.entity");
let ContainersModule = class ContainersModule {
};
exports.ContainersModule = ContainersModule;
exports.ContainersModule = ContainersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([container_entity_1.Container, server_entity_1.Server]),
            servers_module_1.ServersModule,
            alerts_module_1.AlertsModule,
            websocket_module_1.WebsocketModule,
        ],
        controllers: [containers_controller_1.ContainersController],
        providers: [containers_service_1.ContainersService],
        exports: [containers_service_1.ContainersService],
    })
], ContainersModule);
//# sourceMappingURL=containers.module.js.map