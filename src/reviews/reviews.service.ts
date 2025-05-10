import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dtos/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  async findAll(): Promise<ReviewDocument[]> {
    return this.reviewModel.find().exec();
  }

  async findByPlace(placeId: string): Promise<ReviewDocument[]> {
    return this.reviewModel.find({ place: placeId }).exec();
  }

  async create(
    createDto: CreateReviewDto,
    userId: string,
  ): Promise<ReviewDocument> {
    const created = new this.reviewModel({ ...createDto, user: userId });
    return created.save();
  }

  async addComment(reviewId: string, comment: string): Promise<ReviewDocument> {
    const updated = await this.reviewModel
      .findByIdAndUpdate(
        reviewId,
        { comment },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Review ${reviewId} not found`);
    return updated;
  }

  async updateRating(
    reviewId: string,
    rating: number,
  ): Promise<ReviewDocument> {
    const updated = await this.reviewModel
      .findByIdAndUpdate(
        reviewId,
        { rating },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Review ${reviewId} not found`);
    return updated;
  }
  async findById(id: string): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(id).exec();
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    return review;
  }

  async delete(reviewId: string): Promise<void> {
    const result = await this.reviewModel.findByIdAndDelete(reviewId).exec();
    if (!result) throw new NotFoundException(`Review ${reviewId} not found`);
  }
}
