import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Area } from 'src/area/entities/area.entity';
import { GeoService } from './geo.service';
import { GeoController } from './geo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Area], 'geo')],
  providers: [GeoService],
  controllers: [GeoController],
})
export class GeoModule {}
