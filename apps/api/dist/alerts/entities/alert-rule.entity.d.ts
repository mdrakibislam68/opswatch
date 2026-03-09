export declare class AlertRule {
    id: string;
    name: string;
    type: string;
    serverId: string;
    monitorId: string;
    threshold: number;
    operator: string;
    channels: string;
    notifyEmail: string;
    telegramChatId: string;
    discordWebhook: string;
    slackWebhook: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
