import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from '../../servers/entities/server.entity';

/**
 * JWT guard – protects dashboard API routes.
 * Uses the 'jwt' Passport strategy to verify Bearer tokens.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) throw err || new UnauthorizedException('Invalid or expired token');
    return user;
  }
}

/**
 * API Key guard – protects agent-facing routes.
 * Agents pass their server API key in the X-API-KEY header.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(Server)
    private readonly serverRepo: Repository<Server>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-KEY header');
    }

    const server = await this.serverRepo.findOne({
      where: { apiKey, isActive: true },
    });

    if (!server) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.user = server;
    return true;
  }
}
