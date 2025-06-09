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
  ParseIntPipe,
} from '@nestjs/common';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dtos/create-area.dto';
import { UpdateAreaDto } from './dtos/update-area.dto';

@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  async findAll() {
    return this.areasService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.areasService.findById(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: CreateAreaDto) {
    return this.areasService.create(dto);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAreaDto,
  ) {
    return this.areasService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.areasService.remove(id);
  }
}
