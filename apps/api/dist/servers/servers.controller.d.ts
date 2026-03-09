import { ServersService } from './servers.service';
export declare class ServersController {
    private serversService;
    constructor(serversService: ServersService);
    findAll(): Promise<import("./entities/server.entity").Server[]>;
    getStats(): Promise<{
        total: number;
        online: number;
        offline: number;
        warning: number;
    }>;
    findOne(id: string): Promise<import("./entities/server.entity").Server>;
    create(body: {
        name: string;
        hostname: string;
    }): Promise<import("./entities/server.entity").Server>;
    update(id: string, body: any): Promise<import("./entities/server.entity").Server>;
    delete(id: string): Promise<import("./entities/server.entity").Server>;
}
