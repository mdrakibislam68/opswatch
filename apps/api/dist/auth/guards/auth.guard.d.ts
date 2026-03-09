import { ExecutionContext, CanActivate } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Server } from '../../servers/entities/server.entity';
declare const JwtAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtAuthGuard extends JwtAuthGuard_base {
    handleRequest(err: any, user: any): any;
}
export declare class ApiKeyGuard implements CanActivate {
    private readonly serverRepo;
    constructor(serverRepo: Repository<Server>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
export {};
