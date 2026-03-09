import { Server } from '../../servers/entities/server.entity';
export declare class Container {
    id: string;
    server: Server;
    serverId: string;
    dockerId: string;
    name: string;
    image: string;
    status: string;
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    restartCount: number;
    startedAt: string;
    ports: string[];
    networkRx: number;
    networkTx: number;
    updatedAt: Date;
    createdAt: Date;
}
