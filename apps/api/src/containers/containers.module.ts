import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContainersController } from './containers.controller';
import { ContainersService } from './containers.service';
import { Container } from './entities/container.entity';
import { ServersModule } from '../servers/servers.module';
import { AlertsModule } from '../alerts/alerts.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { Server } from '../servers/entities/server.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Container, Server]),
    ServersModule,
    AlertsModule,
    WebsocketModule,
  ],
  controllers: [ContainersController],
  providers: [ContainersService],
  exports: [ContainersService],
})
export class ContainersModule {}
