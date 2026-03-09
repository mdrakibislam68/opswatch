import { Repository } from 'typeorm';
import { AlertRule } from './entities/alert-rule.entity';
import { AlertEvent } from './entities/alert-event.entity';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AlertsService {
    private ruleRepo;
    private eventRepo;
    private notificationsService;
    constructor(ruleRepo: Repository<AlertRule>, eventRepo: Repository<AlertEvent>, notificationsService: NotificationsService);
    getRules(): Promise<AlertRule[]>;
    createRule(data: Partial<AlertRule>): Promise<AlertRule>;
    updateRule(id: string, data: Partial<AlertRule>): Promise<AlertRule>;
    deleteRule(id: string): Promise<import("typeorm").DeleteResult>;
    getEvents(limit?: number): Promise<AlertEvent[]>;
    evaluateServerMetrics(serverId: string, metrics: any): Promise<void>;
    triggerServerOffline(serverId: string, serverName: string): Promise<void>;
    triggerContainerDown(serverId: string, containerName: string, containerId: string): Promise<void>;
    triggerHttpDown(monitorId: string, monitorName: string, url: string, statusCode?: number): Promise<void>;
    private compare;
    private fireAlert;
}
