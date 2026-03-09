import { ContainersService } from './containers.service';
export declare class ContainersController {
    private containersService;
    constructor(containersService: ContainersService);
    sync(req: any, body: {
        containers: any[];
    }): Promise<import("./entities/container.entity").Container[]>;
    findAll(serverId?: string): Promise<import("./entities/container.entity").Container[]>;
    getStats(): Promise<{
        total: number;
        running: number;
        stopped: number;
    }>;
    findOne(id: string): Promise<import("./entities/container.entity").Container>;
}
