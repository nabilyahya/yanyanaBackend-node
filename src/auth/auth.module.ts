// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'SECRET_KEY', // استخدم .env لاحقًا
      signOptions: { expiresIn: '1d' },
    }),
    TypeOrmModule.forFeature([User]), // <-- استبدل Mongoose بـ TypeORM
  ],
  providers: [AuthService, UsersService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
