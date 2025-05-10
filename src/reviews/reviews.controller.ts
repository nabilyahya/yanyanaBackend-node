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
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewResponseDto } from './dtos/review-response.dto';
import { ReviewDocument } from './schemas/review.schema';
import { AddCommentDto } from './dtos/add-comment.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateReviewDto } from './dtos/create-review.dto';
import { UpdateRatingDto } from './dtos/update-rating.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // if you want auth

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // GET /reviews
  @Get()
  async getAll(): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewsService.findAll();
    return reviews.map(this.toReviewResponseDto);
  }

  // GET /reviews/:id
  @Get(':id')
  async getById(@Param('id') id: string): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.findById(id);
    return this.toReviewResponseDto(review);
  }

  // GET /reviews/place/:placeId
  @Get('place/:placeId')
  async getByPlace(
    @Param('placeId') placeId: string,
  ): Promise<ReviewResponseDto[]> {
    const reviews = await this.reviewsService.findByPlace(placeId);
    return reviews.map(this.toReviewResponseDto);
  }

  // POST /reviews
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(
    @Body() dto: CreateReviewDto,
    @Req() req: any,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.create(dto, req.user.id);
    return this.toReviewResponseDto(review);
  }

  // PATCH /reviews/:id/comment
  @Patch(':id/comment')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.addComment(id, dto.comment);
    return this.toReviewResponseDto(review);
  }

  // PATCH /reviews/:id/rating
  @Patch(':id/rating')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateRating(
    @Param('id') id: string,
    @Body() dto: UpdateRatingDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.updateRating(id, dto.rating);
    return this.toReviewResponseDto(review);
  }

  // DELETE /reviews/:id
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    await this.reviewsService.delete(id);
  }

  private toReviewResponseDto(r: ReviewDocument): ReviewResponseDto {
    return {
      id: r._id.toString(),
      user: r.user.toString(),
      place: r.place.toString(),
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    };
  }
}
