export declare class UptimeMonitor {
    id: string;
    name: string;
    url: string;
    type: string;
    intervalSeconds: number;
    expectedStatus: number;
    timeoutMs: number;
    status: string;
    responseTime: number;
    uptime24h: number;
    uptime7d: number;
    lastCheckedAt: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
