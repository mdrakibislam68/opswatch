import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServersModule } from './servers/servers.module';
import { MetricsModule } from './metrics/metrics.module';
import { ContainersModule } from './containers/containers.module';
import { DomainsModule } from './domains/domains.module';
import { AlertsModule } from './alerts/alerts.module';
import { UptimeModule } from './uptime/uptime.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USER', 'opswatch'),
        password: configService.get('DB_PASS', 'opswatch'),
        database: configService.get('DB_NAME', 'opswatch'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,        // auto-creates/updates tables on startup
        autoLoadEntities: true,
        logging: false,
        retryAttempts: 10,
        retryDelay: 3000,
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    ServersModule,
    MetricsModule,
    ContainersModule,
    DomainsModule,
    AlertsModule,
    UptimeModule,
    NotificationsModule,
    WebsocketModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
