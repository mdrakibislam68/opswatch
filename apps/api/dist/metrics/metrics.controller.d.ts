import { MetricsService } from './metrics.service';
export declare class MetricsController {
    private metricsService;
    constructor(metricsService: MetricsService);
    ingest(req: any, body: any): Promise<{
        ok: boolean;
    }>;
    history(serverId: string, hours: number): Promise<import("./entities/metric.entity").Metric[]>;
    latest(serverId: string): Promise<import("./entities/metric.entity").Metric>;
}
