// src/map/map.service.ts
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MapService {
  private readonly apiKey = process.env.GOOGLE_MAPS_API_KEY;
  private readonly baseUrl =
    'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

  constructor(private readonly httpService: HttpService) {}

  async getNearbyPlaces(lat: number, lng: number, type: string): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.get(this.baseUrl, {
        params: {
          location: `${lat},${lng}`,
          radius: 3000, // دائرة نصف قطرها 3 كم
          type,
          key: this.apiKey,
        },
      }),
    );
    return response.data;
  }
}
