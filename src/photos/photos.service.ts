import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo } from './entities/photo.schema';
import { CreatePhotoDto } from './dtos/create-photo.dto';
import { UpdatePhotoDto } from './dtos/update-photo.dto';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo)
    private readonly photoRepo: Repository<Photo>,
  ) {}

  async findAll(): Promise<Photo[]> {
    return this.photoRepo.find({ relations: ['place'] });
  }

  async findOne(id: number): Promise<Photo> {
    const photo = await this.photoRepo.findOne({
      where: { id },
      relations: ['place'],
    });
    if (!photo) throw new NotFoundException('Photo not found');
    return photo;
  }

  async create(dto: CreatePhotoDto): Promise<Photo> {
    const photo = this.photoRepo.create({
      url: dto.url,
      caption: dto.caption,
      place: { id: dto.place }, // UUID لا تقم بتحويله إلى رقم
    });
    return this.photoRepo.save(photo);
  }

  async update(id: number, dto: UpdatePhotoDto): Promise<Photo> {
    const photo = await this.findOne(id);
    const updated = Object.assign(photo, dto);
    return this.photoRepo.save(updated);
  }

  async remove(id: number): Promise<void> {
    const photo = await this.findOne(id);
    await this.photoRepo.remove(photo);
  }
}
