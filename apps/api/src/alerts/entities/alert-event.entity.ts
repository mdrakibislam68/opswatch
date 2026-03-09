import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('alert_events')
export class AlertEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ruleId: string;

  @Column()
  ruleName: string;

  @Column()
  type: string;

  @Column({ nullable: true })
  serverId: string;

  @Column({ nullable: true })
  serverName: string;

  @Column({ nullable: true })
  containerId: string;

  @Column({ nullable: true })
  containerName: string;

  @Column({ nullable: true })
  monitorId: string;

  @Column()
  severity: string; // critical | warning | info

  @Column({ type: 'text' })
  message: string;

  @Column({ default: 'firing' })
  status: string; // firing | resolved

  @Column({ type: 'float', nullable: true })
  value: number;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
