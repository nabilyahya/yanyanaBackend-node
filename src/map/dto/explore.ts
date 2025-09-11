import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum Mood {
  study = 'study',
  romantic = 'romantic',
  classic = 'classic',
}

export enum Sort {
  best = 'best',
  distance = 'distance',
  rating = 'rating',
  popular = 'popular',
}

export class ExploreDto {
  @ApiProperty({ type: Number, example: 40.195, description: 'Latitude' })
  @IsNumber()
  @Transform(({ value }) => +value)
  lat: number;

  @ApiProperty({ type: Number, example: 29.06, description: 'Longitude' })
  @IsNumber()
  @Transform(({ value }) => +value)
  lng: number;

  @ApiPropertyOptional({
    type: Number,
    default: 5,
    minimum: 0.5,
    description: 'Radius in km',
  })
  @IsOptional()
  @Transform(({ value }) => +value)
  radiusKm?: number = 5;

  @ApiPropertyOptional({
    enum: Mood,
    default: Mood.study,
    description: 'Mood category',
  })
  @IsOptional()
  @IsEnum(Mood)
  mood?: Mood = Mood.study;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    maximum: 100,
    default: 60,
    description: 'Min score threshold',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number = 60;

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Filter only places open now',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase()),
  )
  openNow?: boolean = false;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: Sort,
    default: Sort.best,
    description: 'Sorting strategy',
  })
  @IsOptional()
  sort?: Sort = Sort.best;
}
