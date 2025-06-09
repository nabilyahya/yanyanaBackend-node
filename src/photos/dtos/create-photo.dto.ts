import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePhotoDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsString() // ✅ بدلاً من IsInt
  @IsNotEmpty()
  place: string;
}
