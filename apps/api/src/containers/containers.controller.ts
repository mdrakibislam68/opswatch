import { Controller, Get, Post, Param, Query, Body, UseGuards, Request, Res, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ContainersService } from './containers.service';
import { DockerLogsService } from './docker-logs.service';
import { JwtAuthGuard, ApiKeyGuard } from '../auth/guards/auth.guard';
import { Response } from 'express';

@ApiTags('containers')
@Controller('containers')
export class ContainersController {
  constructor(
    private containersService: ContainersService,
    private dockerLogsService: DockerLogsService,
  ) {}

  // Agent syncs container state
  @ApiSecurity('agent-key')
  @UseGuards(ApiKeyGuard)
  @Post('sync')
  sync(@Request() req, @Body() body: { containers: any[] }) {
    return this.containersService.syncFromAgent(req.user.id, body.containers);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('serverId') serverId?: string) {
    return this.containersService.findAll(serverId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getStats() { return this.containersService.getStats(); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) { return this.containersService.findById(id); }

  // ─── Logs ─────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':dockerId/logs')
  async getLogs(
    @Param('dockerId') dockerId: string,
    @Query('tail', new DefaultValuePipe(100), ParseIntPipe) tail: number,
    @Query('timestamps') timestamps = 'true',
  ) {
    const lines = await this.dockerLogsService.getContainerLogs(
      dockerId,
      tail,
      timestamps !== 'false',
    );
    return { dockerId, tail, lines, count: lines.length };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':dockerId/logs/stream')
  streamLogs(
    @Param('dockerId') dockerId: string,
    @Query('tail', new DefaultValuePipe(50), ParseIntPipe) tail: number,
    @Res() res: Response,
  ) {
    return this.dockerLogsService.streamContainerLogs(dockerId, res, tail);
  }
}
