import { DataSource } from 'typeorm';
export declare class HealthController {
    private dataSource;
    constructor(dataSource: DataSource);
    check(): Promise<{
        status: string;
        timestamp: string;
        services: {
            api: string;
            database: string;
        };
        version: string;
    }>;
}
