import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';
import { Server } from './entities/server.entity';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [TypeOrmModule.forFeature([Server]), WebsocketModule],
  controllers: [ServersController],
  providers: [ServersService],
  exports: [ServersService, TypeOrmModule],
})
export class ServersModule {}
