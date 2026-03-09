import { ConfigService } from '@nestjs/config';
import { AlertRule } from '../alerts/entities/alert-rule.entity';
import { AlertEvent } from '../alerts/entities/alert-event.entity';
export declare class NotificationsService {
    private config;
    private readonly logger;
    private mailer;
    constructor(config: ConfigService);
    send(rule: AlertRule, event: AlertEvent): Promise<void>;
    private sendEmail;
    private sendTelegram;
    private sendDiscord;
    private sendSlack;
}
