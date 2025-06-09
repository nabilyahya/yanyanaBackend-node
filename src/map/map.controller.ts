// src/map/map.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { MapService } from './map.service';

@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('places')
  async getNearbyPlaces(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('type') type: string,
  ) {
    return this.mapService.getNearbyPlaces(lat, lng, type);
  }
}
