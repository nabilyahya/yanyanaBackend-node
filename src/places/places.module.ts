import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';
import { Place } from './entities/place.entity';
import { Area } from '../area/entities/area.entity';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from 'src/categories/entities/category.entity';
import { PlaceAddress } from 'src/area/entities/place-address.entity';
import { Photo } from 'src/photos/entities/photo.schema';
import { Review } from 'src/reviews/entities/review.entity';
import { ShopApprovalRequest } from 'src/users/entities/shopApprovalRequest.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Place,
      PlaceAddress,
      Category,
      Photo,
      Review,
      ShopApprovalRequest,
    ]), // هؤلاء من التطبيق
    TypeOrmModule.forFeature([Area], 'geo'), // هذا من قاعدة البيانات الجغرافية
    HttpModule,
  ],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
