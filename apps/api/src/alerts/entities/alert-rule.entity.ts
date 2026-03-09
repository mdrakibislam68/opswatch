import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: string; // cpu | ram | disk | container_down | server_offline | http_down

  @Column({ nullable: true })
  serverId: string;

  @Column({ nullable: true })
  monitorId: string;

  @Column({ type: 'float', nullable: true })
  threshold: number;

  @Column({ default: '>' })
  operator: string; // > | < | ==

  @Column({ default: 'email' })
  channels: string; // comma-separated: email,telegram,discord,slack

  @Column({ nullable: true })
  notifyEmail: string;

  @Column({ nullable: true })
  telegramChatId: string;

  @Column({ nullable: true })
  discordWebhook: string;

  @Column({ nullable: true })
  slackWebhook: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
