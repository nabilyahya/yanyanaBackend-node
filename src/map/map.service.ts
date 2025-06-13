// src/map/map.service.ts
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { log } from 'console';
import { firstValueFrom } from 'rxjs';
import { Area } from 'src/area/entities/area.entity';
import { PlaceAddress } from 'src/area/entities/place-address.entity';
import { SearchPoint } from 'src/area/entities/search-point.entity';
import { Photo } from 'src/photos/entities/photo.schema';
import { Place } from 'src/places/entities/place.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MapService {
  private readonly apiKey = process.env.GOOGLE_MAPS_API_KEY;
  private readonly baseUrl =
    'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Place) private readonly placeRepo: Repository<Place>,
    @InjectRepository(Area) private readonly areaRepo: Repository<Area>,
    @InjectRepository(PlaceAddress)
    private readonly placeAddressRepo: Repository<PlaceAddress>,
    @InjectRepository(Photo) private readonly photoRepo: Repository<Photo>,
    @InjectRepository(SearchPoint)
    private readonly searchPointRepo: Repository<SearchPoint>,
  ) {}

  async getNearbyPlaces(
    lat: number,
    lng: number,
    types: string[],
    country: string,
    city: string,
    district: string,
  ): Promise<Place[]> {
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;

    const existingPoint = await this.searchPointRepo.findOne({
      where: { latitude: roundedLat, longitude: roundedLng },
      relations: ['places'],
    });

    if (
      existingPoint &&
      existingPoint.places.length > 0 &&
      new Date().getTime() - new Date(existingPoint.searchedAt).getTime() <
        183 * 24 * 60 * 60 * 1000 // 6 months
    ) {
      console.log('Existe');
      return existingPoint.places;
    }
    console.log('Call google');
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

    const merged = results.flat();
    const unique = Array.from(
      new Map(merged.map((item) => [item.place_id, item])).values(),
    );

    const response: Place[] = [];

    for (const item of unique) {
      const exists = await this.placeRepo.findOne({
        where: { googlePlaceId: item.place_id },
      });

      if (!exists) {
        const area = await this.findOrCreateArea(
          item.geometry.location.lat,
          item.geometry.location.lng,
          item.vicinity,
          country,
          city,
          district,
        );

        const newPlace = await this.placeRepo.save({
          name: item.name,
          description: item.vicinity || 'No description provided',
          googlePlaceId: item.place_id,
          rate: item.rating || 0,
          totalRatings: item.user_ratings_total || 0,
          isOpenNow: item.opening_hours?.open_now ?? null,
          createdAt: new Date(),
        });

        await this.placeAddressRepo.save({
          place: { id: newPlace.id },
          area: { id: area.id },
        });

        if (item.photos) {
          for (const photo of item.photos) {
            const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1080&photo_reference=${photo.photo_reference}&key=${this.apiKey}`;
            await this.photoRepo.save({
              placeId: newPlace.id,
              url: photoUrl,
              uploadedAt: new Date(),
            });
          }
        }

        response.push(newPlace);
      } else {
        response.push(exists);
      }
    }
    await this.searchPointRepo.save({
      latitude: roundedLat,
      longitude: roundedLng,
      searchedAt: new Date(),
      places: response,
    });
    return response;
  }

  private async findOrCreateArea(
    lat: number,
    lng: number,
    addressDetails: string,
    country: string,
    city: string,
    district: string,
  ): Promise<Area> {
    let area = await this.areaRepo.findOne({
      where: { latitude: lat, longitude: lng },
    });

    if (!area) {
      area = await this.areaRepo.save({
        latitude: lat,
        longitude: lng,
        addressDetails,
        city,
        district,
        country,
      });
    }

    return area;
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
