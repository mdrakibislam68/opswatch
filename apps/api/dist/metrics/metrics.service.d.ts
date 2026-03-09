import { Repository } from 'typeorm';
import { Metric } from './entities/metric.entity';
import { ServersService } from '../servers/servers.service';
import { AlertsService } from '../alerts/alerts.service';
interface AgentPayload {
    serverId: string;
    cpuUsage: number;
    ramUsage: number;
    diskUsage: number;
    loadAvg: number;
    netRx: number;
    netTx: number;
    uptimeSeconds: number;
    os?: string;
    arch?: string;
    totalRam?: number;
    totalDisk?: number;
    agentVersion?: string;
}
export declare class MetricsService {
    private metricRepo;
    private serversService;
    private alertsService;
    constructor(metricRepo: Repository<Metric>, serversService: ServersService, alertsService: AlertsService);
    ingest(payload: AgentPayload): Promise<{
        ok: boolean;
    }>;
    getHistory(serverId: string, hours?: number): Promise<Metric[]>;
    getLatest(serverId: string): Promise<Metric>;
    purgeOldMetrics(): Promise<void>;
    checkOfflineServers(): Promise<void>;
}
export {};
