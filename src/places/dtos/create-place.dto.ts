import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsPhoneNumber,
  IsUUID,
  IsInt,
  IsOptional,
} from 'class-validator';

export class CreatePlaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @IsInt()
  category: number; // should be number, because category.id is number

  @IsUUID()
  address: string; // UUID because address.id is string (uuid in DB)
}
