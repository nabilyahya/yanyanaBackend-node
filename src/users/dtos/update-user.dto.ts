import { IsEnum, IsOptional } from 'class-validator';
import { UserRoleEnum } from '../../common/enums/user-role.enum';

export class UpdateUserDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  email?: string;

  @IsOptional()
  password?: string;

  @IsOptional()
  @IsEnum(UserRoleEnum)
  role?: UserRoleEnum;
}
