import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../entities/userRole.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  passwordHash: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
