import { Controller, Post, Get, Param, Query, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard, ApiKeyGuard } from '../auth/guards/auth.guard';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  // Agent pushes metrics here using API key
  @ApiSecurity('agent-key')
  @UseGuards(ApiKeyGuard)
  @Post('ingest')
  ingest(@Request() req, @Body() body: any) {
    return this.metricsService.ingest({ ...body, serverId: req.user.id });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':serverId/history')
  history(
    @Param('serverId') serverId: string,
    @Query('hours') hours: number,
  ) {
    return this.metricsService.getHistory(serverId, hours || 24);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':serverId/latest')
  latest(@Param('serverId') serverId: string) {
    return this.metricsService.getLatest(serverId);
  }
}
