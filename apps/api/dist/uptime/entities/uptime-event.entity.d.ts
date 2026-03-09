import { UptimeMonitor } from './uptime-monitor.entity';
export declare class UptimeEvent {
    id: string;
    monitor: UptimeMonitor;
    monitorId: string;
    status: string;
    responseTime: number;
    statusCode: number;
    errorMessage: string;
    createdAt: Date;
}
