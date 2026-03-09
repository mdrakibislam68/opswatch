import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() { return this.usersService.findAll(); }

  @Get('me')
  me(@Request() req) { return this.usersService.findById(req.user.id); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Post(':id/api-key')
  generateApiKey(@Param('id') id: string) {
    return this.usersService.generateApiKey(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.usersService.delete(id); }
}
