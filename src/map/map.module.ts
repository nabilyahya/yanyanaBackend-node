// src/map/map.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MapService } from './map.service';
import { MapController } from './map.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from 'src/places/entities/place.entity';
import { Area } from 'src/area/entities/area.entity';
import { PlaceAddress } from 'src/area/entities/place-address.entity';
import { Photo } from 'src/photos/entities/photo.schema';
import { SearchPoint } from 'src/area/entities/search-point.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Place, Area, PlaceAddress, Photo, SearchPoint]),
  ],
  providers: [MapService],
  controllers: [MapController],
})
export class MapModule {}
