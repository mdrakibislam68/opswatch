import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { DomainsService } from './domains.service';
import { JwtAuthGuard, ApiKeyGuard } from '../auth/guards/auth.guard';

@ApiTags('domains')
@Controller('domains')
export class DomainsController {
  constructor(private domainsService: DomainsService) {}

  @ApiSecurity('agent-key')
  @UseGuards(ApiKeyGuard)
  @Post('sync')
  sync(@Request() req, @Body() body: { domains: any[] }) {
    return this.domainsService.syncFromAgent(req.user.id, body.domains);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('serverId') serverId?: string,
    @Query('containerName') containerName?: string,
    @Query('port') port?: string,
  ) {
    return this.domainsService.findAll({
      serverId,
      containerName,
      port: port ? parseInt(port, 10) : undefined,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getStats() {
    return this.domainsService.getStats();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.domainsService.findById(id);
  }
}
