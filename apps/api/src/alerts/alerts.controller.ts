import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get('rules')
  getRules() { return this.alertsService.getRules(); }

  @Post('rules')
  createRule(@Body() body: any) { return this.alertsService.createRule(body); }

  @Put('rules/:id')
  updateRule(@Param('id') id: string, @Body() body: any) {
    return this.alertsService.updateRule(id, body);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) { return this.alertsService.deleteRule(id); }

  @Get('events')
  getEvents(@Query('limit') limit: number) {
    return this.alertsService.getEvents(limit || 50);
  }
}
