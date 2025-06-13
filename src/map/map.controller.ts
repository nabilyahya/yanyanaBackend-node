import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { MapService } from './map.service';
import { RequestWithUser } from 'src/common/types/request-with-user';

@ApiTags('Map')
@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('places')
  @Get('places')
  @ApiQuery({ name: 'lat', type: Number, required: false })
  @ApiQuery({ name: 'lng', type: Number, required: false })
  @ApiQuery({ name: 'city', type: String, required: false })
  @ApiQuery({ name: 'district', type: String, required: false })
  @ApiQuery({ name: 'country', type: String, required: false })
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
    @Query('city') city: string,
    @Query('district') district: string,
    @Query('country') country: string,
    @Query('type') types: string | string[],
    @Req() req: RequestWithUser,
  ) {
    const typeList = Array.isArray(types)
      ? types
      : (types ?? 'restaurant')
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);

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

    const userAddress = req.user?.address;

    const resolvedLat = lat ?? userAddress?.latitude;
    const resolvedLng = lng ?? userAddress?.longitude;
    const resolvedCity = city ?? userAddress?.city;
    const resolvedDistrict = district ?? userAddress?.district;
    const resolvedCountry = country ?? userAddress?.country;

    if (
      resolvedLat === undefined ||
      resolvedLng === undefined ||
      !resolvedCity ||
      !resolvedDistrict
    ) {
      throw new Error(
        'Location is not provided. Please provide lat/lng and address info either via query or complete your profile address.',
      );
    }

    return this.mapService.getNearbyPlaces(
      resolvedLat,
      resolvedLng,
      filteredTypes,
      resolvedCountry,
      resolvedCity,
      resolvedDistrict,
    );
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
