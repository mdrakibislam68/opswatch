import { Repository } from 'typeorm';
import { Container } from './entities/container.entity';
import { AlertsService } from '../alerts/alerts.service';
import { EventsGateway } from '../websocket/events.gateway';
export declare class ContainersService {
    private containerRepo;
    private alertsService;
    private eventsGateway;
    constructor(containerRepo: Repository<Container>, alertsService: AlertsService, eventsGateway: EventsGateway);
    findAll(serverId?: string): Promise<Container[]>;
    findById(id: string): Promise<Container>;
    syncFromAgent(serverId: string, containers: any[]): Promise<Container[]>;
    getStats(): Promise<{
        total: number;
        running: number;
        stopped: number;
    }>;
}
