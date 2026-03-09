import { Repository } from 'typeorm';
import { UptimeMonitor } from './entities/uptime-monitor.entity';
import { UptimeEvent } from './entities/uptime-event.entity';
import { AlertsService } from '../alerts/alerts.service';
import { EventsGateway } from '../websocket/events.gateway';
export declare class UptimeService {
    private monitorRepo;
    private eventRepo;
    private alertsService;
    private eventsGateway;
    private readonly logger;
    constructor(monitorRepo: Repository<UptimeMonitor>, eventRepo: Repository<UptimeEvent>, alertsService: AlertsService, eventsGateway: EventsGateway);
    findAll(): Promise<UptimeMonitor[]>;
    findById(id: string): Promise<UptimeMonitor>;
    create(data: Partial<UptimeMonitor>): Promise<UptimeMonitor>;
    update(id: string, data: Partial<UptimeMonitor>): Promise<UptimeMonitor>;
    delete(id: string): Promise<import("typeorm").DeleteResult>;
    getHistory(monitorId: string, hours?: number): Promise<UptimeEvent[]>;
    runChecks(): Promise<void>;
    private checkMonitor;
    private computeUptime;
}
