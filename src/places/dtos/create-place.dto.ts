import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsPhoneNumber,
  IsMongoId,
  IsArray,
} from 'class-validator';

export class CreatePlaceDto {
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
