import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServersService } from './servers.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@ApiTags('servers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servers')
export class ServersController {
  constructor(private serversService: ServersService) {}

  @Get()
  findAll() { return this.serversService.findAll(); }

  @Get('stats')
  getStats() { return this.serversService.getStats(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.serversService.findById(id); }

  @Post()
  create(@Body() body: { name: string; hostname: string }) {
    return this.serversService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.serversService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.serversService.delete(id); }
}
