import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { MapService } from './map.service';

@ApiTags('Map')
@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('places')
  @ApiQuery({ name: 'lat', type: Number, required: true })
  @ApiQuery({ name: 'lng', type: Number, required: true })
  @ApiQuery({
    name: 'type',
    type: String,
    isArray: true,
    required: false,
    style: 'form',
    explode: true,
    description: 'Types of places (e.g., restaurant, cafe, hospital)',
  })
  async getNearbyPlaces(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('type') types: string | string[],
  ) {
    const typeList = Array.isArray(types) ? types : [types];

    const allowedTypes = [
      'restaurant',
      'cafe',
      'hospital',
      'store',
      'school',
      'bank',
      'atm',
      'pharmacy',
      'park',
    ];

    const filteredTypes = typeList.filter((type) =>
      allowedTypes.includes(type.toLowerCase()),
    );

    return this.mapService.getNearbyPlaces(lat, lng, filteredTypes);
  }

  @Get('place-details')
  @ApiQuery({ name: 'placeId', type: String, required: true })
  async getPlaceDetails(@Query('placeId') placeId: string) {
    return this.mapService.getPlaceDetails(placeId);
  }

  @Get('search-by-name')
  @ApiQuery({ name: 'query', type: String, required: true })
  @ApiQuery({ name: 'lat', type: Number, required: true })
  @ApiQuery({ name: 'lng', type: Number, required: true })
  async searchByName(
    @Query('query') query: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number,
  ) {
    return this.mapService.searchPlaceByName(query, lat, lng);
  }
}
