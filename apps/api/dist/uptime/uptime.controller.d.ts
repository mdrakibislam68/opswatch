import { UptimeService } from './uptime.service';
export declare class UptimeController {
    private uptimeService;
    constructor(uptimeService: UptimeService);
    findAll(): Promise<import("./entities/uptime-monitor.entity").UptimeMonitor[]>;
    findOne(id: string): Promise<import("./entities/uptime-monitor.entity").UptimeMonitor>;
    history(id: string, hours: number): Promise<import("./entities/uptime-event.entity").UptimeEvent[]>;
    create(body: any): Promise<import("./entities/uptime-monitor.entity").UptimeMonitor>;
    update(id: string, body: any): Promise<import("./entities/uptime-monitor.entity").UptimeMonitor>;
    delete(id: string): Promise<import("typeorm").DeleteResult>;
}
