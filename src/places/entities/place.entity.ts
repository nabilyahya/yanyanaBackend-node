import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Photo } from '../../photos/entities/photo.schema';
import { Review } from '../../reviews/entities/review.entity';
import { ShopApprovalRequest } from '../../users/entities/shopApprovalRequest.entity';
import { Report } from '../../reports/entities/report.entity';
import { PlaceAddress } from '../../area/entities/place-address.entity'; // تأكد من المسار الصحيح

@Entity('places')
export class Place {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 0, type: 'float' })
  rate: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  websiteUrl: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @ManyToOne(() => Category, (category) => category.places, { eager: true })
  category: Category;

  @OneToOne(() => PlaceAddress, (placeAddress) => placeAddress.place, {
    eager: true,
  })
  @JoinColumn()
  address: PlaceAddress;

  @OneToMany(() => Photo, (photo) => photo.place)
  photos: Photo[];

  @OneToMany(() => Review, (review) => review.place)
  reviews: Review[];

  @OneToOne(() => ShopApprovalRequest, (request) => request.place)
  approvalRequest: ShopApprovalRequest;

  // @OneToMany(() => Report, (report) => report.place)
  // reports: Report[];

  @Column({ nullable: true })
  googlePlaceId: string;

  @Column({ default: false })
  approved: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
