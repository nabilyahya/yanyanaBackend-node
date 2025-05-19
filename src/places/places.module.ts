import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';
import { Place, PlaceSchema } from './schemas/place.schema';
import { Area, AreaSchema } from '../area/schemas/area.schema';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Place.name, schema: PlaceSchema },
      { name: Area.name, schema: AreaSchema },
    ]),
    HttpModule,
  ],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
