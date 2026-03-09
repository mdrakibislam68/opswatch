import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async findAll() {
    return this.userRepo.find({ select: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'] });
  }

  async findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  async create(data: Partial<User>) {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async update(id: string, data: Partial<User>) {
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    await this.userRepo.update(id, data);
    return this.findById(id);
  }

  async generateApiKey(id: string) {
    const apiKey = `ow_${uuidv4().replace(/-/g, '')}`;
    await this.userRepo.update(id, { apiKey });
    return { apiKey };
  }

  async delete(id: string) {
    return this.userRepo.delete(id);
  }
}
