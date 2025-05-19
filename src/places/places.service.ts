import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Place, PlaceDocument } from './schemas/place.schema';
import { CreatePlaceDto } from './dtos/create-place.dto';
import { UpdatePlaceDto } from './dtos/update-place.dto';
import { plainToInstance } from 'class-transformer';
import { PlaceResponseDto } from './dtos/place-response.dto';
import { HttpService } from '@nestjs/axios';
import { Area, AreaDocument } from 'src/area/schemas/area.schema';

@Injectable()
export class PlacesService {
  constructor(
    @InjectModel(Place.name) private placeModel: Model<PlaceDocument>,
    @InjectModel(Area.name) private areaModel: Model<AreaDocument>,
    private readonly httpService: HttpService,
  ) {}

  async findAll(): Promise<PlaceResponseDto[]> {
    const places = await this.placeModel.find().lean();

    return plainToInstance(PlaceResponseDto, places, {
      excludeExtraneousValues: true,
    });
  }
  async findById(id: string): Promise<PlaceResponseDto> {
    const place = await this.placeModel.findById(id).exec();
    if (!place) throw new NotFoundException(`Place ${id} not found`);
    return plainToInstance(PlaceResponseDto, id, {
      excludeExtraneousValues: true,
    });
  }

  async create(createPlaceDto: CreatePlaceDto): Promise<PlaceResponseDto> {
    const createdPlace = new this.placeModel(createPlaceDto);
    const savedPlace = await createdPlace.save();

    return plainToInstance(
      PlaceResponseDto,
      savedPlace.toObject({ versionKey: false }),
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async update(id: string, dto: UpdatePlaceDto): Promise<PlaceResponseDto> {
    const updated = await this.placeModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException(`Place ${id} not found`);

    return plainToInstance(PlaceResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: string): Promise<void> {
    const result = await this.placeModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Place ${id} not found`);
  }
  async getPlacesByAreaAndCategory(
    country: string,
    city: string,
    district: string,
    categoryId: string,
  ): Promise<PlaceDocument[]> {
    // التأكد من وجود المنطقة
    let area = await this.areaModel.findOne({ country, city, district });

    if (!area) {
      area = await new this.areaModel({ country, city, district }).save();
    }

    // التأكد من وجود أماكن في المنطقة والتصنيف
    let places: PlaceDocument[] = await this.placeModel.find({
      address: area._id,
      category: categoryId,
    });

    if (places.length > 0) {
      return places;
    }

    // إذا لم نجد أماكن، نستدعي Google Maps API
    const googlePlaces = await this.fetchPlacesFromGoogleMaps(
      `${country} ${city} ${district}`,
    );

    if (!googlePlaces || googlePlaces.length === 0) {
      throw new NotFoundException(
        'No places found in Google Maps for this area.',
      );
    }

    // حفظ الأماكن في قاعدة البيانات مع تحديد النوع الصحيح
    places = (await this.placeModel.insertMany(
      googlePlaces.map((p) => ({
        name: p.name,
        rate: p.rating || 0,
        description: p.vicinity || 'No description provided.',
        websiteUrl: p.website || '',
        phoneNumber: p.formatted_phone_number || '',
        category: categoryId,
        photos: p.photos?.map((photo) => photo.photo_reference) || [],
        address: area._id,
        approved: true,
      })),
    )) as PlaceDocument[];

    return places;
  }

  private async fetchPlacesFromGoogleMaps(query: string) {
    const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;

    try {
      const response = await this.httpService
        .get(url, {
          params: {
            query,
            key: apiKey,
          },
        })
        .toPromise();

      if (!response || !response.data) {
        throw new Error('No response from Google Maps API');
      }

      return response.data.results;
    } catch (error) {
      console.error('Error fetching data from Google Maps API:', error);
      throw new Error('Failed to fetch places from Google Maps API');
    }
  }
}
