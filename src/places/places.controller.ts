import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PlacesService } from './places.service';
import { CreatePlaceDto } from './dtos/create-place.dto';
import { UpdatePlaceDto } from './dtos/update-place.dto';
import { PlaceResponseDto } from './dtos/place-response.dto';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  async getAll(): Promise<PlaceResponseDto[]> {
    return this.placesService.findAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<PlaceResponseDto> {
    return this.placesService.findById(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: CreatePlaceDto): Promise<PlaceResponseDto> {
    return this.placesService.create(dto);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlaceDto,
  ): Promise<PlaceResponseDto> {
    return this.placesService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.placesService.delete(id);
  }

  @Get('by-area/:country/:city/:district/:categoryId')
  async getPlacesByAreaAndCategory(
    @Param('country') country: string,
    @Param('city') city: string,
    @Param('district') district: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.placesService.getPlacesByAreaAndCategory(
      country,
      city,
      district,
      categoryId,
    );
  }
}
