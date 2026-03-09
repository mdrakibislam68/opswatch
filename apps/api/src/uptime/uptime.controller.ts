import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UptimeService } from './uptime.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@ApiTags('uptime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uptime')
export class UptimeController {
  constructor(private uptimeService: UptimeService) {}

  @Get()
  findAll() { return this.uptimeService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.uptimeService.findById(id); }

  @Get(':id/history')
  history(@Param('id') id: string, @Query('hours') hours: number) {
    return this.uptimeService.getHistory(id, hours || 24);
  }

  @Post()
  create(@Body() body: any) { return this.uptimeService.create(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.uptimeService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.uptimeService.delete(id); }
}
