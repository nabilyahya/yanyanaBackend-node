import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Place, PlaceDocument } from './schemas/place.schema';
import { CreatePlaceDto } from './dtos/create-place.dto';
import { UpdatePlaceDto } from './dtos/update-place.dto';
import { plainToInstance } from 'class-transformer';
import { PlaceResponseDto } from './dtos/place-response.dto';

@Injectable()
export class PlacesService {
  constructor(
    @InjectModel(Place.name) private placeModel: Model<PlaceDocument>,
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
}
