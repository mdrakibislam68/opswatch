import { Server } from '../../servers/entities/server.entity';
export declare class Metric {
    id: string;
    server: Server;
    serverId: string;
    cpuUsage: number;
    ramUsage: number;
    diskUsage: number;
    loadAvg: number;
    netRx: number;
    netTx: number;
    uptimeSeconds: number;
    createdAt: Date;
}
