// src/map/map.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MapService } from './map.service';
import { MapController } from './map.controller';

@Module({
  imports: [HttpModule],
  providers: [MapService],
  controllers: [MapController],
})
export class MapModule {}
