import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import { AlertRule } from '../alerts/entities/alert-rule.entity';
import { AlertEvent } from '../alerts/entities/alert-event.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private mailer: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.mailer = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    });
  }

  async send(rule: AlertRule, event: AlertEvent) {
    const channels = (rule.channels || 'email').split(',').map((c) => c.trim());
    const promises: Promise<any>[] = [];

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

  private async sendEmail(to: string, event: AlertEvent) {
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
    } catch (e) {
      this.logger.error(`Email notification failed: ${e.message}`);
    }
  }

  private async sendTelegram(chatId: string, event: AlertEvent) {
    try {
      const token = this.config.get('TELEGRAM_BOT_TOKEN');
      if (!token) return;
      const emoji = event.severity === 'critical' ? '🔴' : '🟡';
      const text = `${emoji} *OpsWatch Alert*\n\n*${event.ruleName}*\n${event.message}\n\nSeverity: ${event.severity.toUpperCase()}\nTime: ${new Date().toISOString()}`;
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      });
    } catch (e) {
      this.logger.error(`Telegram notification failed: ${e.message}`);
    }
  }

  private async sendDiscord(webhookUrl: string, event: AlertEvent) {
    try {
      const color = event.severity === 'critical' ? 0xef4444 : 0xf59e0b;
      await axios.post(webhookUrl, {
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
    } catch (e) {
      this.logger.error(`Discord notification failed: ${e.message}`);
    }
  }

  private async sendSlack(webhookUrl: string, event: AlertEvent) {
    try {
      const emoji = event.severity === 'critical' ? ':red_circle:' : ':warning:';
      await axios.post(webhookUrl, {
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
    } catch (e) {
      this.logger.error(`Slack notification failed: ${e.message}`);
    }
  }
}
