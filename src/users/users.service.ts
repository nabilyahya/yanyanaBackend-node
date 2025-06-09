import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { RegisterDto } from 'src/auth/dtos/register.dto';
import { UserRole } from './entities/userRole.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepo.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepo.create(dto);
    return this.userRepo.save(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // معالجة تغيير الدور إذا تم تمريره
    if (dto.role) {
      const roleEntity = new UserRole();
      roleEntity.role = dto.role;
      roleEntity.user = user;
      user.role = roleEntity;
    }

    // إزالة الدور من dto لتجنب دمج غير صحيح
    const { role, ...rest } = dto;
    const updated = this.userRepo.merge(user, rest);

    return this.userRepo.save(updated);
  }

  async remove(id: number): Promise<User> {
    const user = await this.findOne(id);
    return this.userRepo.remove(user);
  }
}
