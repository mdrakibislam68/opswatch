import { Repository } from 'typeorm';
import { Server } from './entities/server.entity';
import { EventsGateway } from '../websocket/events.gateway';
export declare class ServersService {
    private serverRepo;
    private eventsGateway;
    constructor(serverRepo: Repository<Server>, eventsGateway: EventsGateway);
    findAll(): Promise<Server[]>;
    findById(id: string): Promise<Server>;
    findByApiKey(apiKey: string): Promise<Server>;
    create(data: {
        name: string;
        hostname: string;
    }): Promise<Server>;
    update(id: string, data: Partial<Server>): Promise<Server>;
    updateHeartbeat(id: string, metrics: Partial<Server>): Promise<Server>;
    markOffline(id: string): Promise<void>;
    delete(id: string): Promise<Server>;
    getStats(): Promise<{
        total: number;
        online: number;
        offline: number;
        warning: number;
    }>;
}
