import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { CreateAreaDto } from './dtos/create-area.dto';
import { UpdateAreaDto } from './dtos/update-area.dto';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepo: Repository<Area>,
  ) {}

  async create(dto: CreateAreaDto): Promise<Area> {
    const newArea = this.areaRepo.create(dto);
    return this.areaRepo.save(newArea);
  }

  async findAll(): Promise<Area[]> {
    return this.areaRepo.find();
  }

  async findById(id: number): Promise<Area> {
    const area = await this.areaRepo.findOne({ where: { id } });
    if (!area) throw new NotFoundException('Area not found');
    return area;
  }

  async findByDetails(
    country: string,
    city: string,
    district: string,
  ): Promise<Area | null> {
    return this.areaRepo.findOne({
      where: { country, city, district },
    });
  }

  async update(id: number, dto: UpdateAreaDto): Promise<Area> {
    const area = await this.findById(id);
    const updated = Object.assign(area, dto);
    return this.areaRepo.save(updated);
  }

  async remove(id: number): Promise<void> {
    const area = await this.findById(id);
    await this.areaRepo.remove(area);
  }
}
