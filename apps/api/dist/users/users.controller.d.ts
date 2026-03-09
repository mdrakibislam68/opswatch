import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<import("./entities/user.entity").User[]>;
    me(req: any): Promise<import("./entities/user.entity").User>;
    update(id: string, body: any): Promise<import("./entities/user.entity").User>;
    generateApiKey(id: string): Promise<{
        apiKey: string;
    }>;
    delete(id: string): Promise<import("typeorm").DeleteResult>;
}
