// src/area/area.module.ts
import { Module } from '@nestjs/common';
import { AreasService } from './areas.service';
import { AreasController } from './areas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Area } from './entities/area.entity';
import { PlaceAddress } from './entities/place-address.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Area]),
    TypeOrmModule.forFeature([PlaceAddress]),
  ],
  controllers: [AreasController],
  providers: [AreasService],
  exports: [AreasService, TypeOrmModule],
})
export class AreasModule {}
