import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private userRepo;
    constructor(userRepo: Repository<User>);
    findAll(): Promise<User[]>;
    findById(id: string): Promise<User>;
    findByEmail(email: string): Promise<User>;
    create(data: Partial<User>): Promise<User>;
    update(id: string, data: Partial<User>): Promise<User>;
    generateApiKey(id: string): Promise<{
        apiKey: string;
    }>;
    delete(id: string): Promise<import("typeorm").DeleteResult>;
}
