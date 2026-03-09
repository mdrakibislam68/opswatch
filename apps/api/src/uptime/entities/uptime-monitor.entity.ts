import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('uptime_monitors')
export class UptimeMonitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ default: 'http' })
  type: string; // http | tcp | ping

  @Column({ default: 60 })
  intervalSeconds: number;

  @Column({ default: 200 })
  expectedStatus: number;

  @Column({ default: 5000 })
  timeoutMs: number;

  @Column({ default: 'unknown' })
  status: string; // up | down | unknown

  @Column({ type: 'float', nullable: true })
  responseTime: number;

  @Column({ type: 'float', nullable: true })
  uptime24h: number;

  @Column({ type: 'float', nullable: true })
  uptime7d: number;

  @Column({ type: 'timestamp', nullable: true })
  lastCheckedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
