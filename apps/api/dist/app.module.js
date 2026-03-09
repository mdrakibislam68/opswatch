"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const bull_1 = require("@nestjs/bull");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const servers_module_1 = require("./servers/servers.module");
const metrics_module_1 = require("./metrics/metrics.module");
const containers_module_1 = require("./containers/containers.module");
const alerts_module_1 = require("./alerts/alerts.module");
const uptime_module_1 = require("./uptime/uptime.module");
const notifications_module_1 = require("./notifications/notifications.module");
const websocket_module_1 = require("./websocket/websocket.module");
const health_controller_1 = require("./common/health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('DB_HOST', 'localhost'),
                    port: configService.get('DB_PORT', 5432),
                    username: configService.get('DB_USER', 'opswatch'),
                    password: configService.get('DB_PASS', 'opswatch'),
                    database: configService.get('DB_NAME', 'opswatch'),
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    synchronize: configService.get('NODE_ENV') !== 'production',
                    migrations: [__dirname + '/database/migrations/**/*{.ts,.js}'],
                    logging: configService.get('NODE_ENV') === 'development',
                    retryAttempts: 10,
                    retryDelay: 3000,
                }),
                inject: [config_1.ConfigService],
            }),
            bull_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    redis: {
                        host: configService.get('REDIS_HOST', 'localhost'),
                        port: configService.get('REDIS_PORT', 6379),
                        password: configService.get('REDIS_PASSWORD'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            schedule_1.ScheduleModule.forRoot(),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            servers_module_1.ServersModule,
            metrics_module_1.MetricsModule,
            containers_module_1.ContainersModule,
            alerts_module_1.AlertsModule,
            uptime_module_1.UptimeModule,
            notifications_module_1.NotificationsModule,
            websocket_module_1.WebsocketModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map