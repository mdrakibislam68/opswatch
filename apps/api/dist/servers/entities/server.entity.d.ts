import { Metric } from '../../metrics/entities/metric.entity';
import { Container } from '../../containers/entities/container.entity';
export declare class Server {
    id: string;
    name: string;
    hostname: string;
    ip: string;
    apiKey: string;
    status: string;
    cpuUsage: number;
    ramUsage: number;
    diskUsage: number;
    loadAvg: number;
    os: string;
    arch: string;
    totalRam: number;
    totalDisk: number;
    uptimeSeconds: number;
    lastSeenAt: Date;
    agentVersion: string;
    isActive: boolean;
    metrics: Metric[];
    containers: Container[];
    createdAt: Date;
    updatedAt: Date;
}
