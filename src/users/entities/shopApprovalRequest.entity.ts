import { Place } from 'src/places/entities/place.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('shop_approval_requests')
export class ShopApprovalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  })
  status: string;

  @Column({ nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  reviewedAt: Date;

  @OneToOne(() => Place, (place) => place.approvalRequest)
  @JoinColumn()
  place: Place;

  @ManyToOne(() => User, (user) => user.approvalRequests)
  requestedBy: User;

  @ManyToOne(() => User, (user) => user.reviewsRequests, { nullable: true })
  reviewedBy: User;
}
