import { UserRole } from './userRole.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShopApprovalRequest } from './shopApprovalRequest.entity';
import { Review } from 'src/reviews/entities/review.entity';
import { UserAddress } from './userAddress.entity';
import { Report } from 'src/reports/entities/report.entity';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  // @OneToMany(() => Report, (report) => report.user)
  // reports: Report[];

  @OneToOne(() => UserAddress, (address) => address.user, { cascade: true })
  address: UserAddress;

  @OneToOne(() => UserRole, (role) => role.user, { cascade: true })
  role: UserRole;

  @OneToMany(() => ShopApprovalRequest, (req) => req.requestedBy)
  approvalRequests: ShopApprovalRequest[];

  @OneToMany(() => ShopApprovalRequest, (req) => req.reviewedBy)
  reviewsRequests: ShopApprovalRequest[];
}
