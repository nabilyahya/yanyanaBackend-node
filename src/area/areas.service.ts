import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Area, AreaDocument } from './schemas/area.schema';
import { CreateAreaDto } from './dtos/create-area.dto';
import { UpdateAreaDto } from './dtos/update-area.dto';

@Injectable()
export class AreasService {
  constructor(@InjectModel(Area.name) private areaModel: Model<AreaDocument>) {}

  async create(dto: CreateAreaDto): Promise<Area> {
    const newArea = new this.areaModel(dto);
    return newArea.save();
  }

  async findAll(): Promise<Area[]> {
    return this.areaModel.find().exec();
  }

  async findById(id: string): Promise<Area> {
    const area = await this.areaModel.findById(id).exec();
    if (!area) throw new NotFoundException('Area not found');
    return area;
  }

  async findByDetails(
    country: string,
    city: string,
    district: string,
  ): Promise<Area | null> {
    return this.areaModel.findOne({ country, city, district }).exec();
  }

  async update(id: string, dto: UpdateAreaDto): Promise<Area> {
    const area = await this.areaModel.findByIdAndUpdate(id, dto, { new: true });
    if (!area) throw new NotFoundException('Area not found');
    return area;
  }

  async remove(id: string): Promise<void> {
    const area = await this.areaModel.findByIdAndDelete(id);
    if (!area) throw new NotFoundException('Area not found');
  }
}
