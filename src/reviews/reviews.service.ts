// reviews.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dtos/create-review.dto';
import { Place } from '../places/entities/place.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Place) private placeRepo: Repository<Place>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async findAll(): Promise<Review[]> {
    return this.reviewRepo.find({ relations: ['user', 'place'] });
  }

  async findByPlace(placeId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { place: { id: placeId } },
      relations: ['user', 'place'],
    });
  }

  async findById(id: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({
      where: { id: +id },
      relations: ['user', 'place'],
    });
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    return review;
  }
  async create(dto: CreateReviewDto, userId: string): Promise<Review> {
    const user = await this.userRepo.findOne({ where: { id: +userId } });
    const place = await this.placeRepo.findOne({ where: { id: dto.place } });

    if (!user || !place) throw new NotFoundException('User or Place not found');

    const review = this.reviewRepo.create({
      rating: dto.rating,
      comment: dto.comment,
      user,
      place,
    });

    return this.reviewRepo.save(review);
  }

  async addComment(id: string, comment: string): Promise<Review> {
    const review = await this.findById(id);
    review.comment = comment;
    return this.reviewRepo.save(review);
  }

  async updateRating(id: string, rating: number): Promise<Review> {
    const review = await this.findById(id);
    review.rating = rating;
    return this.reviewRepo.save(review);
  }

  async delete(id: string): Promise<void> {
    const review = await this.findById(id);
    await this.reviewRepo.remove(review);
  }
}
