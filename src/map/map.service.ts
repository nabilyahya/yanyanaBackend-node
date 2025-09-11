// src/map/map.service.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
import axios, { AxiosError } from 'axios';
import { NaturalType } from 'src/common/enums/natural-type.enum';
import { pipeline } from 'stream';
import { promisify } from 'util';
import * as dns from 'dns';
import * as https from 'https';
const streamPipeline = promisify(pipeline);
import pLimit from 'p-limit';
import { ScoringService } from 'src/scoring/scoring.service';
import { KW } from 'src/scoring/keywords';
import { ExploreDto } from './dto/explore';
// حد أقصى للتنزيلات المتزامنة
const dlLimit = pLimit(4);
const ipv4Lookup: https.AgentOptions['lookup'] = (hostname, _opts, cb) => {
  return dns.lookup(hostname, { family: 4 }, cb as any);
};
// أكواد الشبكة المؤقتة اللي بدنا نعيد المحاولة عليها
const NET_RETRY_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNABORTED',
  'ENOTFOUND', // DNS
  'EAI_AGAIN',
]);
const gApi = axios.create({
  timeout: 15000,
  decompress: true,
  proxy: false,
  headers: { 'User-Agent': 'yanyana-backend/1.0', Accept: 'application/json' },
  httpsAgent: new https.Agent({
    keepAlive: false, // مهم لتفادي RST
    family: 4 as any, // IPv4 فقط
    lookup: ipv4Lookup, // نفس الlookup اللي عندك
    servername: 'maps.googleapis.com',
    maxSockets: 10,
  }),
  validateStatus: (s) => s >= 200 && s < 300,
});
type LatLng = { latitude: number; longitude: number };
export interface PlaceV1 {
  id: string;
  displayName?: { text?: string };
  location?: LatLng;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number; // 0..4 تقريباً (FREE..VERY_EXPENSIVE)
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: {
    periods?: { open?: { time?: string }; close?: { time?: string } }[];
  };
  editorialSummary?: { text?: string };
  reviewSummary?: { text?: string };

  // بعض السمات قد تأتي مباشرة أو داخل attributes حسب تطور الـ API
  servesCoffee?: boolean;
  outdoorSeating?: boolean;
  liveMusic?: boolean;
  attributes?: {
    servesCoffee?: boolean;
    outdoorSeating?: boolean;
    liveMusic?: boolean;
  };

  // حقل مساعد داخلي لتجميع نصوص
  _blob?: string;
}
const isTransient = (ax: AxiosError) =>
  NET_RETRY_CODES.has((ax as any)?.code ?? '') ||
  [502, 503, 504].includes(ax.response?.status ?? 0);
async function gApiGet<T = any>(
  url: string,
  params: Record<string, any>,
): Promise<T> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await gApi.get(url, { params });
      return res.data as T;
    } catch (e: any) {
      if (attempt < 4 && isTransient(e)) {
        const backoff = 300 * attempt + Math.floor(Math.random() * 200);
        console.warn(
          `[gApiGet] transient error, retry ${attempt} in ${backoff}ms`,
          {
            code: e?.code,
            status: e?.response?.status,
          },
        );
        await sleep(backoff);
        continue;
      }
      console.error('[gApiGet] failed', {
        code: e?.code,
        status: e?.response?.status,
        msg: e?.message,
      });
      throw e;
    }
  }
  throw new Error('gApiGet: unreachable');
}

const baseClient = axios.create({
  timeout: 20000,
  maxRedirects: 0,
  decompress: false,
  proxy: false,
  headers: { 'User-Agent': 'yanyana-backend/1.0', Accept: 'image/*' },
  httpsAgent: new https.Agent({
    keepAlive: false,
    // family: 4 (احتياط)، والـ lookup يحسم IPv4
    family: 4 as any,
    lookup: ipv4Lookup,
    servername: 'maps.googleapis.com',
    maxSockets: 10,
  }),
  validateStatus: (s) => (s >= 200 && s < 400) || s === 302 || s === 301,
});
const dlClient = axios.create({
  timeout: 20000,
  responseType: 'stream',
  decompress: false,
  proxy: false,
  headers: { 'User-Agent': 'yanyana-backend/1.0', Accept: 'image/*' },
  httpsAgent: new https.Agent({
    keepAlive: false,
    family: 4 as any,
    lookup: ipv4Lookup,
    maxSockets: 10,
  }),
  validateStatus: (s) => s >= 200 && s < 400,
});
// sleep بسيط
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
    private readonly scoring: ScoringService,
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

    const isValidTypes = (t: any[] | null | undefined) =>
      Array.isArray(t) &&
      t.length > 0 &&
      t.every((v) => typeof v === 'string' && v.trim() !== '');

    const existingPoints = await this.searchPointRepo.find({
      where: {
        latitude: roundedLat,
        longitude: roundedLng,
      },
      relations: ['places', 'places.photos'],
    });

    const validPoints = existingPoints.filter((point) =>
      isValidTypes(point.types),
    );

    const existingPoint = validPoints.find((point) =>
      arraysEqual([...point.types].sort(), [...types].sort()),
    );

    const isCachedValid =
      !!existingPoint &&
      existingPoint.places.length > 0 &&
      new Date().getTime() - new Date(existingPoint.searchedAt).getTime() <
        183 * 24 * 60 * 60 * 1000;

    // ----------------------------
    // CACHE HIT (مع ملء الصور الناقصة + إعادة تحميل)
    // ----------------------------
    if (isCachedValid) {
      console.log('✔ Cache hit (existing data used)');

      const out: Place[] = [];

      for (const place of existingPoint!.places) {
        const placeIdStr = place.id.toString();

        const ensurePhotoByIndex = async (index: number, photoRef?: string) => {
          if (!photoRef) return;

          const rel = `/uploads/places/${placeIdStr}/photo_${index}.jpg`;
          const abs = path.join(__dirname, '..', '..', 'public', rel);

          // نزّل الملف لو ناقص
          if (!fs.existsSync(abs)) {
            const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1080&photo_reference=${encodeURIComponent(
              photoRef,
            )}&key=${this.apiKey}`;
            await this.downloadAndSaveImage(url, placeIdStr, index);
          }

          // upsert لسجل الصورة
          const existsPhoto = await this.photoRepo.findOne({
            where: { place: { id: place.id }, url: rel },
          });
          if (!existsPhoto) {
            await this.photoRepo.save({
              place: { id: place.id },
              url: rel,
              uploadedAt: new Date(),
            });
          }
        };

        if (!place.photos || place.photos.length === 0) {
          // لا يوجد صور مسجلة في الـ DB -> استرجع من تفاصيل Google
          const details = await this.getPlaceDetails(place.googlePlaceId);
          const gPhotos = details.photos ?? [];
          for (let i = 0; i < gPhotos.length; i++) {
            await ensurePhotoByIndex(i, gPhotos[i]?.photo_reference);
          }
        } else {
          // توجد صور مسجلة -> تأكد أن الملفات موجودة، وإن نقصت حاول استعادتها بنفس الـ index
          for (let i = 0; i < place.photos.length; i++) {
            const p = place.photos[i];
            const abs = path.join(__dirname, '..', '..', 'public', p.url);
            if (!fs.existsSync(abs)) {
              const details = await this.getPlaceDetails(place.googlePlaceId);
              const ref = details.photos?.[i]?.photo_reference;
              await ensurePhotoByIndex(i, ref);
            }
          }
        }

        // أعد التحميل مع الصور قبل الدفع للخارج
        const refreshed = await this.placeRepo.findOne({
          where: { id: place.id },
          relations: ['photos'],
        });
        if (refreshed) out.push(refreshed);
      }

      return out;
    }

    // ----------------------------
    // CALL GOOGLE API (no cache)
    // ----------------------------
    console.log('🌐 Call Google API');

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
        // مكان جديد
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
          types: item.types || [],
        });

        await this.placeAddressRepo.save({
          place: { id: newPlace.id },
          area: { id: area.id },
        });

        // صور Google (إن وجدت): upsert + تنزيل الملف إن ناقص
        if (item.photos) {
          for (let i = 0; i < item.photos.length; i++) {
            const ref = item.photos[i]?.photo_reference;
            if (!ref) continue;

            const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1080&photo_reference=${encodeURIComponent(
              ref,
            )}&key=${this.apiKey}`;

            const rel = `/uploads/places/${newPlace.id}/photo_${i}.jpg`;
            const abs = path.join(__dirname, '..', '..', 'public', rel);

            const existsPhoto = await this.photoRepo.findOne({
              where: { place: { id: newPlace.id }, url: rel },
            });

            if (!fs.existsSync(abs)) {
              await this.downloadAndSaveImage(
                googlePhotoUrl,
                newPlace.id.toString(),
                i,
              );
            }
            if (!existsPhoto) {
              await this.photoRepo.save({
                place: { id: newPlace.id },
                url: rel,
                uploadedAt: new Date(),
              });
            }
          }
        }

        const savedPlaceWithPhotos = await this.placeRepo.findOne({
          where: { id: newPlace.id },
          relations: ['photos'],
        });

        if (savedPlaceWithPhotos) response.push(savedPlaceWithPhotos);
      } else {
        // مكان موجود مسبقًا — upsert للصور
        if (item.photos) {
          for (let i = 0; i < item.photos.length; i++) {
            const ref = item.photos[i]?.photo_reference;
            if (!ref) continue;

            const rel = `/uploads/places/${exists.id}/photo_${i}.jpg`;
            const abs = path.join(__dirname, '..', '..', 'public', rel);

            let existingPhoto = await this.photoRepo.findOne({
              where: { place: { id: exists.id }, url: rel },
            });

            if (!fs.existsSync(abs)) {
              const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1080&photo_reference=${encodeURIComponent(
                ref,
              )}&key=${this.apiKey}`;
              await this.downloadAndSaveImage(
                googlePhotoUrl,
                exists.id.toString(),
                i,
              );
            }
            if (!existingPhoto) {
              await this.photoRepo.save({
                place: { id: exists.id },
                url: rel,
                uploadedAt: new Date(),
              });
              existingPhoto = await this.photoRepo.findOne({
                where: { place: { id: exists.id }, url: rel },
              });
            }
          }
        }

        const updatedPlace = await this.placeRepo.findOne({
          where: { id: exists.id },
          relations: ['photos'],
        });

        if (updatedPlace) response.push(updatedPlace);
      }
    }

    await this.searchPointRepo.save({
      latitude: roundedLat,
      longitude: roundedLng,
      searchedAt: new Date(),
      types,
      places: response,
    });
    console.log('🌐 finished and return');
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
              'name,geometry,types,rating,user_ratings_total,opening_hours,price_level,vicinity,website,editorial_summary,reviews,photos,formatted_phone_number,business_status,plus_code,icon',
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

    // إذا الملف موجود خلص
    if (fs.existsSync(filepath)) return relativePath;

    // خفّض الماكس ويـدث لتقليل الضغط على الشبكة (اختياري)
    const initialUrl = url.replace(/maxwidth=\d+/i, 'maxwidth=800');

    return dlLimit(async () => {
      let attempt = 0;

      while (true) {
        attempt++;
        try {
          // 1) اطلب Google Photos link (عادةً بيرجع 302 إلى googleusercontent)
          const head = await baseClient.get(initialUrl);
          let finalUrl = initialUrl;

          if (head.status === 302 || head.status === 301) {
            const loc = head.headers['location'];
            if (!loc)
              throw new Error(
                'Missing Location header from Google Photos redirect',
              );
            finalUrl = loc;
          }

          // 2) نزّل الصورة من الرابط النهائي
          const res = await dlClient.get(finalUrl);
          await streamPipeline(res.data, fs.createWriteStream(filepath));

          return relativePath;
        } catch (err) {
          const ax = err as AxiosError;
          const code = (ax as any)?.code;
          const status = ax.response?.status;

          // نظّف أي ملف جزئي
          if (fs.existsSync(filepath)) {
            try {
              fs.unlinkSync(filepath);
            } catch {}
          }

          // إعادة المحاولة على أخطاء الشبكة المؤقتة أو 5xx شائعة
          if (
            NET_RETRY_CODES.has(code ?? '') ||
            [502, 503, 504].includes(status ?? 0)
          ) {
            if (attempt < 4) {
              const backoff = 300 * attempt + Math.floor(Math.random() * 200);
              console.warn(
                `[downloadAndSaveImage] transient error, retry ${attempt} in ${backoff}ms`,
                { code, status },
              );
              await sleep(backoff);
              continue;
            }
          }

          console.error('[downloadAndSaveImage] failed permanently', {
            attempt,
            code,
            status,
            url: initialUrl,
            msg: (ax as any)?.message || err,
          });
          throw err;
        }
      }
    });
  }
  async fetchSwimmableBeaches(lat: number, lng: number): Promise<any[]> {
    const radius = 45000;

    const query = `
      [out:json][timeout:25];
      (
        node["natural"="beach"](around:${radius},${lat},${lng});
        way["natural"="beach"](around:${radius},${lat},${lng});
        relation["natural"="beach"](around:${radius},${lat},${lng});

        node["tourism"="beach_resort"](around:${radius},${lat},${lng});
        way["tourism"="beach_resort"](around:${radius},${lat},${lng});
        relation["tourism"="beach_resort"](around:${radius},${lat},${lng});

        node["leisure"="beach_resort"](around:${radius},${lat},${lng});
        way["leisure"="beach_resort"](around:${radius},${lat},${lng});
        relation["leisure"="beach_resort"](around:${radius},${lat},${lng});
      );
      out center tags;
    `;

    try {
      const res = await axios.post(
        'https://overpass-api.de/api/interpreter',
        query,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const elements = res.data.elements;

      return elements
        .filter((element: any) => element.tags?.name)
        .map((element: any) => {
          const tags = element.tags || {};
          return {
            name: tags.name,
            description: tags.description || null,
            operator: tags.operator || null,
            free: tags.fee === 'no' ? true : tags.fee === 'yes' ? false : null,
            lat: element.lat || element.center?.lat,
            lon: element.lon || element.center?.lon,
          };
        });
    } catch (error) {
      console.error('Overpass API Error:', error);
      throw new InternalServerErrorException('Failed to fetch beach data');
    }
  }

  async fetchNaturalPlaces(
    lat: number,
    lng: number,
    type: NaturalType,
  ): Promise<any[]> {
    console.log(lat, 'lat');
    console.log(lng, 'lng');
    console.log(type, 'type');
    const radius = 60000;
    let queryBody = '';

    switch (type) {
      case 'beach':
        queryBody = `
        node["natural"="beach"](around:${radius},${lat},${lng});
        way["natural"="beach"](around:${radius},${lat},${lng});
        relation["natural"="beach"](around:${radius},${lat},${lng});

        node["tourism"="beach_resort"](around:${radius},${lat},${lng});
        way["tourism"="beach_resort"](around:${radius},${lat},${lng});
        relation["tourism"="beach_resort"](around:${radius},${lat},${lng});

        node["leisure"="beach_resort"](around:${radius},${lat},${lng});
        way["leisure"="beach_resort"](around:${radius},${lat},${lng});
        relation["leisure"="beach_resort"](around:${radius},${lat},${lng});
      `;
        break;

      case 'forest':
        queryBody = `
        node["natural"="wood"](around:${radius},${lat},${lng});
        way["natural"="wood"](around:${radius},${lat},${lng});
        relation["natural"="wood"](around:${radius},${lat},${lng});

        node["landuse"="forest"](around:${radius},${lat},${lng});
        way["landuse"="forest"](around:${radius},${lat},${lng});
        relation["landuse"="forest"](around:${radius},${lat},${lng});

        node["leisure"="park"](around:${radius},${lat},${lng});
        way["leisure"="park"](around:${radius},${lat},${lng});
        relation["leisure"="park"](around:${radius},${lat},${lng});

        node["boundary"="national_park"](around:${radius},${lat},${lng});
        way["boundary"="national_park"](around:${radius},${lat},${lng});
        relation["boundary"="national_park"](around:${radius},${lat},${lng});
      `;
        break;

      case 'lake':
        queryBody = `
        node["natural"="water"]["water"="lake"](around:${radius},${lat},${lng});
        way["natural"="water"]["water"="lake"](around:${radius},${lat},${lng});
        relation["natural"="water"]["water"="lake"](around:${radius},${lat},${lng});
      `;
        break;

      case 'river':
        queryBody = `
        node["waterway"="river"](around:${radius},${lat},${lng});
        way["waterway"="river"](around:${radius},${lat},${lng});
        relation["waterway"="river"](around:${radius},${lat},${lng});
      `;
        break;

      case 'waterfall':
        queryBody = `
        node["natural"="waterfall"](around:${radius},${lat},${lng});
        way["natural"="waterfall"](around:${radius},${lat},${lng});
        relation["natural"="waterfall"](around:${radius},${lat},${lng});
      `;
        break;

      case 'mountain':
        queryBody = `
        node["natural"="peak"](around:${radius},${lat},${lng});
        way["natural"="peak"](around:${radius},${lat},${lng});
        relation["natural"="peak"](around:${radius},${lat},${lng});
      `;
        break;

      case 'plateau':
        queryBody = `
        node["natural"="plateau"](around:${radius},${lat},${lng});
        way["natural"="plateau"](around:${radius},${lat},${lng});
        relation["natural"="plateau"](around:${radius},${lat},${lng});
      `;
        break;

      default:
        throw new Error('Unsupported type');
    }

    const query = `[out:json][timeout:25];(${queryBody});out center tags;`;

    try {
      const res = await axios.post(
        'https://overpass-api.de/api/interpreter',
        new URLSearchParams({ data: query }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return res.data.elements
        .filter((el: any) => el.tags?.name)
        .map((el: any) => {
          const tags = el.tags || {};
          return {
            name: tags.name,
            description: tags.description || null,
            type: type,
            lat: el.lat || el.center?.lat,
            lon: el.lon || el.center?.lon,
          };
        });
    } catch (error) {
      console.error('Overpass API Error:', error);
      throw new InternalServerErrorException('Failed to fetch data');
    }
  }

  // =============================
  // Scoring system helpers
  // ===========================

  async exploreByMood(q: ExploreDto) {
    const radius = Math.round((q.radiusKm ?? 5) * 1000);
    const types = this.includedTypesForMood(q.mood!);

    // 1) Nearby لكل type (مثل getNearbyPlaces بس بدون تخزين/عناوين)
    const results = await Promise.all(
      types.map((type) =>
        gApiGet<any>(
          'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
          {
            location: `${q.lat},${q.lng}`,
            radius,
            type,
            key: this.apiKey,
            language: 'tr',
            region: 'TR',
          },
        ).then((d) => d.results || []),
      ),
    );

    // 2) دمج/تمييز حسب place_id
    const merged = results.flat();
    const uniqueMap = new Map<string, any>();
    for (const it of merged) {
      if (!uniqueMap.has(it.place_id)) uniqueMap.set(it.place_id, it);
    }
    const unique = Array.from(uniqueMap.values());

    // 3) جلب التفاصيل + تحويل إلى PlaceV1 + سكور
    const out: any[] = [];
    for (const item of unique) {
      const details = await this.getPlaceDetails(item.place_id);
      const pv1 = this.toPlaceV1(item, details);
      // فلترة "open now" إن مطلوبة
      if (q.openNow && pv1.currentOpeningHours?.openNow === false) continue;

      const scores = this.scoring.scoreAll(pv1);
      const base = scores[q.mood!].score;
      if (base < (q.minScore ?? 60)) continue;

      // حساب المسافة
      const loc = pv1.location;
      const distanceKm =
        loc?.latitude && loc?.longitude
          ? this.haversineKm(q.lat, q.lng, loc.latitude, loc.longitude)
          : 1e9;

      const final = this.finalScore(
        base,
        pv1.rating,
        pv1.userRatingCount,
        pv1.currentOpeningHours?.openNow,
        distanceKm,
      );

      out.push({
        place: {
          id: pv1.id,
          name: pv1.displayName?.text,
          lat: loc?.latitude,
          lng: loc?.longitude,
          types: pv1.types,
          rating: pv1.rating,
          userRatings: pv1.userRatingCount,
          priceLevel: pv1.priceLevel,
          openNow: pv1.currentOpeningHours?.openNow ?? null,
          summary: pv1.editorialSummary?.text,
        },
        scores,
        distanceKm: +distanceKm.toFixed(2),
        final: +final.toFixed(2),
      });
    }

    // 4) ترتيب حسب المطلوب
    const sort = q.sort ?? 'best';
    if (sort === 'distance') out.sort((a, b) => a.distanceKm - b.distanceKm);
    else if (sort === 'rating')
      out.sort((a, b) => (b.place.rating ?? 0) - (a.place.rating ?? 0));
    else if (sort === 'popular')
      out.sort(
        (a, b) => (b.place.userRatings ?? 0) - (a.place.userRatings ?? 0),
      );
    else out.sort((a, b) => b.final - a.final);

    return {
      meta: {
        count: Math.min(out.length, q.limit ?? 20),
        mood: q.mood,
        radiusKm: q.radiusKm,
      },
      items: out.slice(0, q.limit ?? 20),
    };
  }

  /** دمج نصوص مفيدة للسكور من الملخص والمراجعات */
  private buildBlob(details: any): string {
    const parts: string[] = [];
    if (details?.editorial_summary?.overview)
      parts.push(details.editorial_summary.overview);
    if (Array.isArray(details?.reviews)) {
      for (const r of details.reviews.slice(0, 40)) {
        if (r?.text) parts.push(String(r.text));
      }
    }
    // vicinity أو name أحياناً فيها تلميحات (terrace, park, ...)
    if (details?.vicinity) parts.push(details.vicinity);
    if (details?.name) parts.push(details.name);

    return parts.join(' ').toLowerCase();
  }

  /** استدلال سمات مبسّطة من الأنواع والنص */
  private inferAttributes(types: string[] = [], blob: string) {
    const tset = new Set(types);
    const servesCoffee =
      tset.has('cafe') ||
      tset.has('coffee_shop') ||
      KW.coffeeHints.some((k) => blob.includes(k));

    const outdoorSeating = KW.outdoorHints.some((k) => blob.includes(k));
    const liveMusic = KW.liveMusicHints.some((k) => blob.includes(k));

    return { servesCoffee, outdoorSeating, liveMusic };
  }

  /** تحويل تفاصيل Google → PlaceV1 الذي يستهلكه ScoringService */
  private toPlaceV1(fromNearby: any, details: any): PlaceV1 {
    const blob = this.buildBlob(details);
    const attrs = this.inferAttributes(
      details?.types || fromNearby?.types || [],
      blob,
    );

    const opening = details?.opening_hours;
    const periods = Array.isArray(opening?.periods)
      ? opening.periods.map((p: any) => ({
          open: { time: p?.open?.time },
          close: { time: p?.close?.time },
        }))
      : [];

    const loc = details?.geometry?.location || fromNearby?.geometry?.location;

    const p: PlaceV1 = {
      id: fromNearby?.place_id || details?.place_id || details?.id,
      displayName: { text: details?.name || fromNearby?.name },
      location: loc ? { latitude: loc.lat, longitude: loc.lng } : undefined,
      types: details?.types || fromNearby?.types || [],
      rating: details?.rating,
      userRatingCount: details?.user_ratings_total,
      priceLevel: details?.price_level,
      currentOpeningHours: { openNow: opening?.open_now ?? null },
      regularOpeningHours: { periods },
      editorialSummary: details?.editorial_summary?.overview
        ? { text: details.editorial_summary.overview }
        : undefined,
      reviewSummary: undefined, // القديم ما عنده reviewSummary جاهز
      servesCoffee: attrs.servesCoffee,
      outdoorSeating: attrs.outdoorSeating,
      liveMusic: attrs.liveMusic,
      _blob: blob,
    };
    return p;
  }

  /** هافرسين بالكيلومتر */
  private haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /** أنواع نستهدفها لكل مود */
  private includedTypesForMood(
    mood: 'study' | 'romantic' | 'classic',
  ): string[] {
    if (mood === 'study') return ['library', 'cafe', 'internet_cafe'];
    if (mood === 'romantic')
      return [
        'restaurant',
        'fine_dining_restaurant',
        'wine_bar',
        'park',
        'garden',
        'tourist_attraction',
      ];
    return [
      'historical_place',
      'historical_landmark',
      'museum',
      'cultural_landmark',
      'art_gallery',
      'tourist_attraction',
    ];
  }

  /** ترتيب نهائي بسيط */
  private finalScore(
    base: number,
    rating: number | undefined,
    userCount: number | undefined,
    openNow: boolean | undefined | null,
    distanceKm: number,
  ) {
    const r = Math.min(Math.max(rating ?? 0, 3), 5);
    const u = Math.max(userCount ?? 0, 0);
    return (
      base + (openNow ? 6 : 0) + r * 4 + Math.log(1 + u) * 2 - distanceKm * 0.8
    );
  }
}
