import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Area } from 'src/area/entities/area.entity';
import { UserAddress } from './entities/userAddress.entity';
import { UserRole } from './entities/userRole.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserAddress, UserRole])],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
