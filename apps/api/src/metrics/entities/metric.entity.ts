import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Server } from '../../servers/entities/server.entity';

@Entity('metrics')
@Index(['serverId', 'createdAt'])
export class Metric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Server, (server) => server.metrics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serverId' })
  server: Server;

  @Column()
  serverId: string;

  @Column({ type: 'float' })
  cpuUsage: number;

  @Column({ type: 'float' })
  ramUsage: number;

  @Column({ type: 'float' })
  diskUsage: number;

  @Column({ type: 'float', nullable: true })
  loadAvg: number;

  @Column({ type: 'bigint', nullable: true })
  netRx: number;

  @Column({ type: 'bigint', nullable: true })
  netTx: number;

  @Column({ type: 'bigint', nullable: true })
  uptimeSeconds: number;

  @CreateDateColumn()
  createdAt: Date;
}
