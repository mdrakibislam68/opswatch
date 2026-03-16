import { Module } from '@nestjs/common';
import { ServersModule } from '../servers/servers.module';
import { SshInstallController } from './ssh-install.controller';
import { SshInstallService } from './ssh-install.service';

@Module({
  imports: [ServersModule],
  controllers: [SshInstallController],
  providers: [SshInstallService],
})
export class SshInstallModule {}
