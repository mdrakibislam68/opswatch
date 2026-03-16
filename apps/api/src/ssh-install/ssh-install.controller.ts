import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { Multer } from 'multer';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { SshInstallService } from './ssh-install.service';
import { AddSshDto } from './dto/add-ssh.dto';
import { AddAwsDto } from './dto/add-aws.dto';

@ApiTags('servers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servers')
export class SshInstallController {
  constructor(private readonly sshInstallService: SshInstallService) {}

  /**
   * POST /api/v1/servers/add-ssh
   * Register a server and install the agent using a raw SSH private key.
   */
  @Post('add-ssh')
  addViaSsh(@Body() dto: AddSshDto) {
    return this.sshInstallService.installViaSsh(dto);
  }

  /**
   * POST /api/v1/servers/add-aws
   * Register a server and install the agent using an AWS .pem file.
   * Accepts multipart/form-data with a `pemFile` field.
   */
  @Post('add-aws')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        hostname: { type: 'string' },
        host: { type: 'string' },
        sshUser: { type: 'string' },
        sshPort: { type: 'integer' },
        apiUrl: { type: 'string' },
        pemFile: { type: 'string', format: 'binary' },
      },
      required: ['name', 'hostname', 'host', 'sshUser', 'pemFile'],
    },
  })
  @UseInterceptors(FileInterceptor('pemFile'))
  addViaAws(
    @Body() body: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 64 * 1024 })], // 64 KB max
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('PEM file is required');
    }

    const dto: AddAwsDto = {
      name: body.name,
      hostname: body.hostname,
      host: body.host,
      sshUser: body.sshUser,
      sshPort: body.sshPort ? Number(body.sshPort) : 22,
      passphrase: body.passphrase,
      apiUrl: body.apiUrl,
    };

    if (!dto.name || !dto.hostname || !dto.host || !dto.sshUser) {
      throw new BadRequestException('name, hostname, host, and sshUser are required');
    }

    return this.sshInstallService.installViaAwsPem(dto, file.buffer);
  }
}
