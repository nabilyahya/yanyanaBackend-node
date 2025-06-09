// reviews.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewResponseDto } from './dtos/review-response.dto';
import { CreateReviewDto } from './dtos/create-review.dto';
import { AddCommentDto } from './dtos/add-comment.dto';
import { UpdateRatingDto } from './dtos/update-rating.dto';
import { Review } from './entities/review.entity';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async getAll(): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewsService.findAll();
    return reviews.map(this.toReviewResponseDto);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.findById(id);
    return this.toReviewResponseDto(review);
  }

  @Get('place/:placeId')
  async getByPlace(
    @Param('placeId') placeId: string,
  ): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewsService.findByPlace(placeId);
    return reviews.map(this.toReviewResponseDto);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(
    @Body() dto: CreateReviewDto,
    @Req() req: any,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.create(dto, req.user.id);
    return this.toReviewResponseDto(review);
  }

  @Patch(':id/comment')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.addComment(id, dto.comment);
    return this.toReviewResponseDto(review);
  }

  @Patch(':id/rating')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateRating(
    @Param('id') id: string,
    @Body() dto: UpdateRatingDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.updateRating(id, dto.rating);
    return this.toReviewResponseDto(review);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.reviewsService.delete(id);
  }

  private toReviewResponseDto(r: Review): ReviewResponseDto {
    return {
      id: r.id.toString(),
      user: r.user.id.toString(),
      place: r.place.id.toString(),
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    };
  }
}
