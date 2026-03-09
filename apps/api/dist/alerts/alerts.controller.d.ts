import { AlertsService } from './alerts.service';
export declare class AlertsController {
    private alertsService;
    constructor(alertsService: AlertsService);
    getRules(): Promise<import("./entities/alert-rule.entity").AlertRule[]>;
    createRule(body: any): Promise<import("./entities/alert-rule.entity").AlertRule>;
    updateRule(id: string, body: any): Promise<import("./entities/alert-rule.entity").AlertRule>;
    deleteRule(id: string): Promise<import("typeorm").DeleteResult>;
    getEvents(limit: number): Promise<import("./entities/alert-event.entity").AlertEvent[]>;
}
