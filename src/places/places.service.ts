import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Place, PlaceDocument } from './schemas/place.schema';
import { CreatePlaceDto } from './dtos/create-place.dto';
import { UpdatePlaceDto } from './dtos/update-place.dto';

@Injectable()
export class PlacesService {
  constructor(
    @InjectModel(Place.name) private placeModel: Model<PlaceDocument>,
  ) {}

  async findAll(): Promise<PlaceDocument[]> {
    return this.placeModel.find().exec();
  }

  async findById(id: string): Promise<PlaceDocument> {
    const place = await this.placeModel.findById(id).exec();
    if (!place) throw new NotFoundException(`Place ${id} not found`);
    return place;
  }

  async create(dto: CreatePlaceDto): Promise<PlaceDocument> {
    const place = new this.placeModel(dto);
    return place.save();
  }

  async update(id: string, dto: UpdatePlaceDto): Promise<PlaceDocument> {
    const updated = await this.placeModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Place ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.placeModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Place ${id} not found`);
  }
}
