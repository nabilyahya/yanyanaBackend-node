import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsPhoneNumber,
  IsMongoId,
  IsArray,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
export class CreatePlaceDto {
  @Expose()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsUrl()
  websiteUrl: string;

  @IsPhoneNumber()
  phoneNumber: string;

  @IsMongoId()
  category: string;

  @IsMongoId()
  address: string;

  @IsArray()
  @IsUrl({}, { each: true })
  photos: string[];
}
