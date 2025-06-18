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
import { In, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { arraysEqual } from 'src/helper/arraysEqual';
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

    const existingPoints = await this.searchPointRepo.find({
      where: {
        latitude: roundedLat,
        longitude: roundedLng,
      },
      relations: ['places', 'places.photos'],
    });

    const existingPoint = existingPoints.find((point) =>
      arraysEqual([...point.types].sort(), [...types].sort()),
    );

    if (
      existingPoint &&
      existingPoint.places.length > 0 &&
      new Date().getTime() - new Date(existingPoint.searchedAt).getTime() <
        183 * 24 * 60 * 60 * 1000
    ) {
      console.log('Existe');

      // تحقق من الصور المفقودة على القرص
      for (const place of existingPoint.places) {
        for (let i = 0; i < place.photos.length; i++) {
          const photo = place.photos[i];
          const fullPath = path.join(
            __dirname,
            '..',
            '..',
            'public',
            photo.url,
          );

          if (!fs.existsSync(fullPath)) {
            // إذا الملف مفقود فقط، نعيد تحميله من Google
            const photoRefMatch = photo.url.match(/photo_(\d+)\.jpg$/);
            const index = photoRefMatch ? parseInt(photoRefMatch[1]) : i;

            const details = await this.getPlaceDetails(place.googlePlaceId);
            const photoRef = details.photos?.[index]?.photo_reference;
            if (photoRef) {
              const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1080&photo_reference=${photoRef}&key=${this.apiKey}`;
              await this.downloadAndSaveImage(
                googlePhotoUrl,
                place.id.toString(),
                index,
              );
            }
          }
        }
      }

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
        relations: ['photos'],
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
          for (let i = 0; i < item.photos.length; i++) {
            const photo = item.photos[i];
            const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1080&photo_reference=${photo.photo_reference}&key=${this.apiKey}`;
            const localRelativePath = `/uploads/places/${newPlace.id}/photo_${i}.jpg`;
            const fullLocalPath = path.join(
              __dirname,
              '..',
              '..',
              'public',
              localRelativePath,
            );

            const existingPhoto = await this.photoRepo.findOne({
              where: {
                place: { id: newPlace.id },
                url: localRelativePath,
              },
            });

            const fileExists = fs.existsSync(fullLocalPath);

            if (!existingPhoto && !fileExists) {
              await this.downloadAndSaveImage(
                googlePhotoUrl,
                newPlace.id.toString(),
                i,
              );
              await this.photoRepo.save({
                place: { id: newPlace.id },
                url: localRelativePath,
                uploadedAt: new Date(),
              });
            } else if (!fileExists && existingPhoto) {
              await this.downloadAndSaveImage(
                googlePhotoUrl,
                newPlace.id.toString(),
                i,
              );
            }
          }
        }

        const savedPlaceWithPhotos = await this.placeRepo.findOne({
          where: { id: newPlace.id },
          relations: ['photos'],
        });

        if (savedPlaceWithPhotos) {
          response.push(savedPlaceWithPhotos);
        }
      } else {
        // تحقق من الصور أيضًا إذا كان المكان موجودًا
        if (item.photos) {
          for (let i = 0; i < item.photos.length; i++) {
            const photo = item.photos[i];
            const localRelativePath = `/uploads/places/${exists.id}/photo_${i}.jpg`;
            const fullLocalPath = path.join(
              __dirname,
              '..',
              '..',
              'public',
              localRelativePath,
            );

            const existingPhoto = await this.photoRepo.findOne({
              where: {
                place: { id: exists.id },
                url: localRelativePath,
              },
            });

            const fileExists = fs.existsSync(fullLocalPath);

            if (!fileExists && existingPhoto) {
              const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1080&photo_reference=${photo.photo_reference}&key=${this.apiKey}`;
              await this.downloadAndSaveImage(
                googlePhotoUrl,
                exists.id.toString(),
                i,
              );
            }
          }
        }

        const updatedPlace = await this.placeRepo.findOne({
          where: { id: exists.id },
          relations: ['photos'],
        });

        if (updatedPlace) {
          response.push(updatedPlace);
        }
      }
    }

    await this.searchPointRepo.save({
      latitude: roundedLat,
      longitude: roundedLng,
      searchedAt: new Date(),
      types,
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
    console.log(placeId, 'placeId');
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
  async getPlaceDetailsFull(googlePlaceId: string): Promise<any> {
    // 🧠 جلب التفاصيل من Google دائمًا
    const details = await this.getPlaceDetails(googlePlaceId);

    // 🔎 البحث عن المكان في قاعدة البيانات
    let place = await this.placeRepo.findOne({
      where: { googlePlaceId },
      relations: ['photos'],
    });

    if (place) {
      // ✅ تأكد من تحميل وتخزين الصور
      if (details.photos) {
        for (let i = 0; i < details.photos.length; i++) {
          const photoRef = details.photos[i].photo_reference;
          const filename = `photo_${i}.jpg`;
          const localPath = `/uploads/places/${place.id}/${filename}`;
          const fullPath = path.join(
            __dirname,
            '..',
            '..',
            'public',
            localPath,
          );

          // تنزيل الصورة إذا كانت مفقودة على القرص
          if (!fs.existsSync(fullPath)) {
            const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1080&photo_reference=${photoRef}&key=${this.apiKey}`;
            await this.downloadAndSaveImage(
              googlePhotoUrl,
              place.id.toString(),
              i,
            );
          }

          // تخزين الصورة في قاعدة البيانات إذا غير موجودة
          const existingPhoto = await this.photoRepo.findOne({
            where: {
              place: { id: place.id },
              url: localPath,
            },
          });

          if (!existingPhoto) {
            await this.photoRepo.save({
              place: { id: place.id },
              url: localPath,
              uploadedAt: new Date(),
            });
          }
        }
      }

      const photos = await this.photoRepo.find({
        where: { place: { id: place.id } },
      });

      return {
        ...place,
        photos: photos.map((p) => ({ url: p.url })),
        formatted_phone_number: details.formatted_phone_number,
        website: details.website,
        reviews: details.reviews,
        opening_hours: details.opening_hours,
        location: details.geometry?.location,
        business_status: details.business_status,
        types: details.types,
        price_level: details.price_level,
        user_ratings_total: details.user_ratings_total,
        vicinity: details.vicinity,
        plus_code: details.plus_code,
        icon: details.icon,
      };
    }

    // 🆕 إنشاء مكان جديد
    const newPlace = await this.placeRepo.save({
      name: details.name,
      description: 'No description provided',
      googlePlaceId: googlePlaceId,
      rate: details.rating || 0,
      totalRatings: details.user_ratings_total || 0,
      isOpenNow: details.opening_hours?.open_now ?? null,
      createdAt: new Date(),
    });

    // ✅ تحميل وتخزين الصور الجديدة
    if (details.photos) {
      for (let i = 0; i < details.photos.length; i++) {
        const photoRef = details.photos[i].photo_reference;
        const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1080&photo_reference=${photoRef}&key=${this.apiKey}`;
        const localPath = await this.downloadAndSaveImage(
          googlePhotoUrl,
          newPlace.id.toString(),
          i,
        );

        await this.photoRepo.save({
          place: { id: newPlace.id },
          url: localPath,
          uploadedAt: new Date(),
        });
      }
    }

    const placeWithPhotos = await this.placeRepo.findOne({
      where: { id: newPlace.id },
      relations: ['photos'],
    });

    if (!placeWithPhotos) {
      throw new Error('Place saved but not found afterward.');
    }

    return {
      ...placeWithPhotos,
      photos: placeWithPhotos.photos.map((p) => ({ url: p.url })),
      formatted_phone_number: details.formatted_phone_number,
      website: details.website,
      reviews: details.reviews,
      opening_hours: details.opening_hours,
      location: details.geometry?.location,
      business_status: details.business_status,
      types: details.types,
      price_level: details.price_level,
      user_ratings_total: details.user_ratings_total,
      vicinity: details.vicinity,
      plus_code: details.plus_code,
      icon: details.icon,
    };
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
  async downloadAndSaveImage(
    url: string,
    placeId: string,
    index: number,
  ): Promise<string> {
    const folderPath = path.join(
      __dirname,
      '..',
      '..',
      'public',
      'uploads',
      'places',
      placeId,
    );

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filename = `photo_${index}.jpg`;
    const filepath = path.join(folderPath, filename);
    const relativePath = `/uploads/places/${placeId}/${filename}`;

    // ✅ إذا الملف موجود بالفعل، أرجع نفس المسار
    if (fs.existsSync(filepath)) {
      return relativePath;
    }

    // ✅ إذا لم يكن موجود، نزله من Google واكتبه في الملف
    const response = await firstValueFrom(
      this.httpService.get(url, { responseType: 'arraybuffer' }),
    );

    fs.writeFileSync(filepath, response.data);

    return relativePath;
  }
}
