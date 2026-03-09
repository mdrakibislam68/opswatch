import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Server } from '../../servers/entities/server.entity';

@Entity('containers')
export class Container {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Server, (server) => server.containers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serverId' })
  server: Server;

  @Column()
  serverId: string;

  @Column()
  dockerId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  image: string;

  @Column({ default: 'unknown' })
  status: string; // running | stopped | restarting | exited

  @Column({ type: 'float', nullable: true })
  cpuPercent: number;

  @Column({ type: 'bigint', nullable: true })
  memoryUsage: number;

  @Column({ type: 'bigint', nullable: true })
  memoryLimit: number;

  @Column({ default: 0 })
  restartCount: number;

  @Column({ nullable: true })
  startedAt: string;

  @Column({ type: 'simple-array', nullable: true })
  ports: string[];

  @Column({ nullable: true })
  networkRx: number;

  @Column({ nullable: true })
  networkTx: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
