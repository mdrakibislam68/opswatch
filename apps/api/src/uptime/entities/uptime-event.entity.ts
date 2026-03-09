import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { UptimeMonitor } from './uptime-monitor.entity';

@Entity('uptime_events')
export class UptimeEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UptimeMonitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monitorId' })
  monitor: UptimeMonitor;

  @Column()
  monitorId: string;

  @Column()
  status: string; // up | down

  @Column({ type: 'float', nullable: true })
  responseTime: number;

  @Column({ nullable: true })
  statusCode: number;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}
