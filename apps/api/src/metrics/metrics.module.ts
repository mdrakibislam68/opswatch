import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { Metric } from './entities/metric.entity';
import { ServersModule } from '../servers/servers.module';
import { AlertsModule } from '../alerts/alerts.module';
import { Server } from '../servers/entities/server.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Metric, Server]),
    ServersModule,
    AlertsModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
