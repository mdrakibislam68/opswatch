import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Metric } from '../../metrics/entities/metric.entity';
import { Container } from '../../containers/entities/container.entity';

@Entity('servers')
export class Server {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  hostname: string;

  @Column({ nullable: true })
  ip: string;

  @Column({ unique: true })
  apiKey: string;

  @Column({ default: 'offline' })
  status: string; // online | offline | warning

  @Column({ type: 'float', nullable: true })
  cpuUsage: number;

  @Column({ type: 'float', nullable: true })
  ramUsage: number;

  @Column({ type: 'float', nullable: true })
  diskUsage: number;

  @Column({ type: 'float', nullable: true })
  loadAvg: number;

  @Column({ nullable: true })
  os: string;

  @Column({ nullable: true })
  arch: string;

  @Column({ type: 'bigint', nullable: true })
  totalRam: number;

  @Column({ type: 'bigint', nullable: true })
  totalDisk: number;

  @Column({ nullable: true })
  uptimeSeconds: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date;

  @Column({ nullable: true })
  agentVersion: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Metric, (metric) => metric.server)
  metrics: Metric[];

  @OneToMany(() => Container, (container) => container.server)
  containers: Container[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
