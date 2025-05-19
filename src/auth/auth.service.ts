// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dtos/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user; // هذا بالفعل UserDocument
    }
    return null;
  }

  async login(user: UserDocument) {
    const payload = { sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const createdUser = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });
    return this.login(createdUser);
  }

  async getProfile(userId: string) {
    return this.usersService.findOne(userId);
  }
}
