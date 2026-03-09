import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ContainersService } from './containers.service';
import { JwtAuthGuard, ApiKeyGuard } from '../auth/guards/auth.guard';

@ApiTags('containers')
@Controller('containers')
export class ContainersController {
  constructor(private containersService: ContainersService) {}

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
}
