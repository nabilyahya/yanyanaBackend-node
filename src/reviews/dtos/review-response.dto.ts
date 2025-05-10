import { Expose, Type } from 'class-transformer';

export class ReviewResponseDto {
  @Expose()
  id: string;

  @Expose()
  user: string;

  @Expose()
  place: string;

  @Expose()
  rating: number;

  @Expose()
  comment: string;

  @Expose()
  @Type(() => Date)
  createdAt: Date;
}
