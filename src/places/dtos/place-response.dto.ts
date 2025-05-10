import { Expose, Type } from 'class-transformer';

export class PlaceResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  rate: number;

  @Expose()
  description: string;

  @Expose()
  websiteUrl: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  category: string;

  @Expose()
  photos: string[];

  @Expose()
  address: string;

  @Expose()
  approved: boolean;

  @Expose()
  @Type(() => Date)
  createdAt: Date;
}
