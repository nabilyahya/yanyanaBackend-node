import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Place } from './entities/place.entity';
import { CreatePlaceDto } from './dtos/create-place.dto';
import { UpdatePlaceDto } from './dtos/update-place.dto';
import { plainToInstance } from 'class-transformer';
import { PlaceResponseDto } from './dtos/place-response.dto';
import { HttpService } from '@nestjs/axios';
import { Area } from '../area/entities/area.entity';
import { Category } from '../categories/entities/category.entity';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(Place)
    private placeRepo: Repository<Place>,

    @InjectRepository(Area, 'geo')
    private areaRepo: Repository<Area>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,

    private readonly httpService: HttpService,
  ) {}

  async findAll(): Promise<PlaceResponseDto[]> {
    const places = await this.placeRepo.find({
      relations: ['category', 'address', 'photos'],
    });
    return plainToInstance(PlaceResponseDto, places, {
      excludeExtraneousValues: true,
    });
  }

  async findById(id: string): Promise<PlaceResponseDto> {
    const place = await this.placeRepo.findOne({
      where: { id },
      relations: ['category', 'address', 'photos'],
    });
    if (!place) throw new NotFoundException(`Place ${id} not found`);
    return plainToInstance(PlaceResponseDto, place, {
      excludeExtraneousValues: true,
    });
  }

  async create(dto: CreatePlaceDto): Promise<PlaceResponseDto> {
    const category = await this.categoryRepo.findOne({
      where: { id: dto.category },
    });
    const address = await this.areaRepo.findOne({
      where: { id: dto.address as any },
    });

    if (!category)
      throw new NotFoundException(`Category ${dto.category} not found`);
    if (!address)
      throw new NotFoundException(`Address ${dto.address} not found`);

    const place = this.placeRepo.create({
      name: dto.name,
      description: dto.description,
      websiteUrl: dto.websiteUrl,
      phoneNumber: dto.phoneNumber,
      category,
      address,
      approved: true,
    });

    const saved = await this.placeRepo.save(place);

    return plainToInstance(PlaceResponseDto, saved, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, dto: UpdatePlaceDto): Promise<PlaceResponseDto> {
    const place = await this.placeRepo.findOne({ where: { id } });
    if (!place) throw new NotFoundException(`Place ${id} not found`);
    Object.assign(place, dto);
    const updated = await this.placeRepo.save(place);
    return plainToInstance(PlaceResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: string): Promise<void> {
    const place = await this.placeRepo.findOne({ where: { id } });
    if (!place) throw new NotFoundException(`Place ${id} not found`);
    await this.placeRepo.remove(place);
  }

  async getPlacesByAreaAndCategory(
    country: string,
    city: string,
    district: string,
    categoryId: string,
  ): Promise<Place[]> {
    let area = await this.areaRepo.findOne({
      where: { country, city, district },
    });

    if (!area) {
      area = this.areaRepo.create({ country, city, district });
      area = await this.areaRepo.save(area);
    }

    let places = await this.placeRepo.find({
      where: { address: { id: area.id }, category: { id: +categoryId } },
      relations: ['category', 'address'],
    });

    if (places.length > 0) return places;

    const googlePlaces = await this.fetchPlacesFromGoogleMaps(
      `${country} ${city} ${district}`,
    );

    if (!googlePlaces || googlePlaces.length === 0) {
      throw new NotFoundException(
        'No places found in Google Maps for this area.',
      );
    }

    const category = await this.categoryRepo.findOne({
      where: { id: +categoryId },
    });
    if (!category)
      throw new NotFoundException(`Category ${categoryId} not found`);

    const newPlaces = googlePlaces.map((p) =>
      this.placeRepo.create({
        name: p.name,
        rate: p.rating || 0,
        description: p.vicinity || 'No description provided.',
        websiteUrl: p.website || '',
        phoneNumber: p.formatted_phone_number || '',
        category,
        address: area,
        approved: true,
      }),
    );

    return this.placeRepo.save(newPlaces);
  }

  private async fetchPlacesFromGoogleMaps(query: string) {
    const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;

    try {
      const response = await lastValueFrom(
        this.httpService.get(url, {
          params: {
            query,
            key: apiKey,
          },
        }),
      );

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
