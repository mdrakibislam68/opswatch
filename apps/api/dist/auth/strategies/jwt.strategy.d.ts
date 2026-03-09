import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private userRepo;
    constructor(config: ConfigService, userRepo: Repository<User>);
    validate(payload: any): Promise<{
        id: any;
        email: any;
        role: any;
    }>;
}
export {};
