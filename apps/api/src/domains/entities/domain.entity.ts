import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Server } from '../../servers/entities/server.entity';

@Entity('domains')
@Index(['serverId', 'domain'], { unique: true })
export class Domain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Server, (server) => server.domains, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serverId' })
  server: Server;

  @Column()
  serverId: string;

  @Column()
  domain: string;

  @Column({ nullable: true })
  proxyPass: string;

  @Column({ type: 'int', nullable: true })
  port: number;

  @Column({ default: false })
  ssl: boolean;

  @Column({ nullable: true })
  configFile: string;

  @Column({ type: 'text', nullable: true })
  configContent: string;

  @Column({ nullable: true })
  containerId: string;

  @Column({ nullable: true })
  containerName: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
