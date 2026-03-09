import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UptimeController } from './uptime.controller';
import { UptimeService } from './uptime.service';
import { UptimeMonitor } from './entities/uptime-monitor.entity';
import { UptimeEvent } from './entities/uptime-event.entity';
import { AlertsModule } from '../alerts/alerts.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UptimeMonitor, UptimeEvent]),
    AlertsModule,
    WebsocketModule,
  ],
  controllers: [UptimeController],
  providers: [UptimeService],
  exports: [UptimeService],
})
export class UptimeModule {}
