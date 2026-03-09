import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoin(client: Socket, room: string): {
        ok: boolean;
    };
    handleLeave(client: Socket, room: string): void;
    emitServerUpdate(server: any): void;
    emitContainersUpdate(serverId: string, containers: any[]): void;
    emitUptimeUpdate(data: any): void;
    emitAlert(alert: any): void;
    emitMetrics(serverId: string, metrics: any): void;
}
