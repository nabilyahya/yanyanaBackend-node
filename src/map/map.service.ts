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

  async getNearbyPlaces(
    lat: number,
    lng: number,
    types: string[],
  ): Promise<any[]> {
    const results = await Promise.all(
      types.map((type) =>
        firstValueFrom(
          this.httpService.get(this.baseUrl, {
            params: {
              location: `${lat},${lng}`,
              radius: 3000,
              type,
              key: this.apiKey,
            },
          }),
        ).then((res) => res.data.results),
      ),
    );

    // دمج النتائج والتخلص من التكرارات (مثلاً حسب place_id)
    const merged = results.flat();
    const unique = Array.from(
      new Map(merged.map((item) => [item.place_id, item])).values(),
    );

    return unique;
  }
  async getPlaceDetails(placeId: string) {
    const response = await firstValueFrom(
      this.httpService.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        {
          params: {
            place_id: placeId,
            fields:
              'name,photos,formatted_phone_number,opening_hours,reviews,website',
            key: this.apiKey,
          },
        },
      ),
    );

    return response.data.result;
  }
  async searchPlaceByName(query: string, lat: number, lng: number) {
    const location = `${lat},${lng}`;

    const response = await firstValueFrom(
      this.httpService.get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        {
          params: {
            query,
            location,
            radius: 3000,
            key: this.apiKey,
          },
        },
      ),
    );

    return response.data.results;
  }
}
