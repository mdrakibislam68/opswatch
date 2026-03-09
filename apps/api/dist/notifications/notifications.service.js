"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
const axios_1 = require("axios");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.mailer = nodemailer.createTransport({
            host: config.get('SMTP_HOST', 'smtp.gmail.com'),
            port: config.get('SMTP_PORT', 587),
            secure: false,
            auth: {
                user: config.get('SMTP_USER'),
                pass: config.get('SMTP_PASS'),
            },
        });
    }
    async send(rule, event) {
        const channels = (rule.channels || 'email').split(',').map((c) => c.trim());
        const promises = [];
        if (channels.includes('email') && rule.notifyEmail) {
            promises.push(this.sendEmail(rule.notifyEmail, event));
        }
        if (channels.includes('telegram') && rule.telegramChatId) {
            promises.push(this.sendTelegram(rule.telegramChatId, event));
        }
        if (channels.includes('discord') && rule.discordWebhook) {
            promises.push(this.sendDiscord(rule.discordWebhook, event));
        }
        if (channels.includes('slack') && rule.slackWebhook) {
            promises.push(this.sendSlack(rule.slackWebhook, event));
        }
        await Promise.allSettled(promises);
    }
    async sendEmail(to, event) {
        try {
            const severityEmoji = event.severity === 'critical' ? '🔴' : '🟡';
            await this.mailer.sendMail({
                from: `"OpsWatch" <${this.config.get('SMTP_USER')}>`,
                to,
                subject: `${severityEmoji} OpsWatch Alert: ${event.ruleName}`,
                html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:${event.severity === 'critical' ? '#ef4444' : '#f59e0b'}">
              ${severityEmoji} ${event.ruleName}
            </h2>
            <p style="font-size:16px">${event.message}</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px">
              <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold">Type</td><td style="padding:8px">${event.type}</td></tr>
              <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold">Severity</td><td style="padding:8px">${event.severity.toUpperCase()}</td></tr>
              <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold">Time</td><td style="padding:8px">${new Date().toISOString()}</td></tr>
              ${event.serverName ? `<tr><td style="padding:8px;background:#f3f4f6;font-weight:bold">Server</td><td style="padding:8px">${event.serverName}</td></tr>` : ''}
            </table>
            <hr style="margin:24px 0"/>
            <p style="color:#6b7280;font-size:12px">OpsWatch - Self-hosted DevOps Monitoring</p>
          </div>
        `,
            });
        }
        catch (e) {
            this.logger.error(`Email notification failed: ${e.message}`);
        }
    }
    async sendTelegram(chatId, event) {
        try {
            const token = this.config.get('TELEGRAM_BOT_TOKEN');
            if (!token)
                return;
            const emoji = event.severity === 'critical' ? '🔴' : '🟡';
            const text = `${emoji} *OpsWatch Alert*\n\n*${event.ruleName}*\n${event.message}\n\nSeverity: ${event.severity.toUpperCase()}\nTime: ${new Date().toISOString()}`;
            await axios_1.default.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                chat_id: chatId,
                text,
                parse_mode: 'Markdown',
            });
        }
        catch (e) {
            this.logger.error(`Telegram notification failed: ${e.message}`);
        }
    }
    async sendDiscord(webhookUrl, event) {
        try {
            const color = event.severity === 'critical' ? 0xef4444 : 0xf59e0b;
            await axios_1.default.post(webhookUrl, {
                embeds: [{
                        title: `⚠️ OpsWatch Alert: ${event.ruleName}`,
                        description: event.message,
                        color,
                        fields: [
                            { name: 'Type', value: event.type, inline: true },
                            { name: 'Severity', value: event.severity.toUpperCase(), inline: true },
                            { name: 'Time', value: new Date().toISOString(), inline: false },
                            ...(event.serverName ? [{ name: 'Server', value: event.serverName, inline: true }] : []),
                        ],
                        footer: { text: 'OpsWatch Monitoring' },
                    }],
            });
        }
        catch (e) {
            this.logger.error(`Discord notification failed: ${e.message}`);
        }
    }
    async sendSlack(webhookUrl, event) {
        try {
            const emoji = event.severity === 'critical' ? ':red_circle:' : ':warning:';
            await axios_1.default.post(webhookUrl, {
                blocks: [
                    {
                        type: 'header',
                        text: { type: 'plain_text', text: `${emoji} OpsWatch Alert: ${event.ruleName}` },
                    },
                    {
                        type: 'section',
                        text: { type: 'mrkdwn', text: event.message },
                    },
                    {
                        type: 'section',
                        fields: [
                            { type: 'mrkdwn', text: `*Type:*\n${event.type}` },
                            { type: 'mrkdwn', text: `*Severity:*\n${event.severity.toUpperCase()}` },
                            { type: 'mrkdwn', text: `*Time:*\n${new Date().toISOString()}` },
                        ],
                    },
                ],
            });
        }
        catch (e) {
            this.logger.error(`Slack notification failed: ${e.message}`);
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map