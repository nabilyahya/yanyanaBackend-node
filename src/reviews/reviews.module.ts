import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review } from './entities/review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from 'src/places/entities/place.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Place, User])],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
