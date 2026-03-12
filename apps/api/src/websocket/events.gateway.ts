import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, room: string) {
    client.join(room);
    return { ok: true };
  }

  @SubscribeMessage('leave')
  handleLeave(client: Socket, room: string) {
    client.leave(room);
  }

  // ─── Emitters ─────────────────────────────────────────────────────────────
  emitServerUpdate(server: any) {
    this.server.emit('server:update', server);
  }

  emitContainersUpdate(serverId: string, containers: any[]) {
    this.server.emit(`containers:update:${serverId}`, containers);
    this.server.emit('containers:update', { serverId, containers });
  }

  emitUptimeUpdate(data: any) {
    this.server.emit('uptime:update', data);
  }

  emitAlert(alert: any) {
    this.server.emit('alert:fired', alert);
  }

  emitMetrics(serverId: string, metrics: any) {
    this.server.to(`server:${serverId}`).emit('metrics:live', metrics);
    this.server.emit('metrics:live', { serverId, ...metrics });
  }

  emitDomainsUpdate(serverId: string, domains: any[]) {
    this.server.emit(`domains:update:${serverId}`, domains);
    this.server.emit('domains:update', { serverId, domains });
  }
}
