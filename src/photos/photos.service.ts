import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Photo, PhotoDocument } from './schemas/photo.schema';
import { CreatePhotoDto } from './dtos/create-photo.dto';
import { UpdatePhotoDto } from './dtos/update-photo.dto';

@Injectable()
export class PhotosService {
  constructor(
    @InjectModel(Photo.name) private photoModel: Model<PhotoDocument>,
  ) {}

  async findAll() {
    return this.photoModel.find().populate('place');
  }

  async findOne(id: string) {
    const photo = await this.photoModel.findById(id).populate('place');
    if (!photo) throw new NotFoundException('Photo not found');
    return photo;
  }

  async create(dto: CreatePhotoDto) {
    const photo = new this.photoModel(dto);
    return photo.save();
  }

  async update(id: string, dto: UpdatePhotoDto) {
    const photo = await this.photoModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!photo) throw new NotFoundException('Photo not found');
    return photo;
  }

  async remove(id: string) {
    const deleted = await this.photoModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Photo not found');
    return deleted;
  }
}
