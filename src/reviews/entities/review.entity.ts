import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Place } from '../../places/entities/place.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('float', { default: 0 }) // إضافة هذا السطر
  rating: number;
  @Column({ default: false })
  isLiked: boolean;

  @Column({ nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.reviews)
  user: User;

  @ManyToOne(() => Place, (place) => place.reviews)
  place: Place;
}
