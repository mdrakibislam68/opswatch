import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { Domain } from './entities/domain.entity';
import { Server } from '../servers/entities/server.entity';
import { ServersModule } from '../servers/servers.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Domain, Server]),
    ServersModule,
    WebsocketModule,
  ],
  controllers: [DomainsController],
  providers: [DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}
