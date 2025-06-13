import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  city: string;

  @Column()
  district: string;

  @Column({ nullable: true })
  street: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  addressDetails: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @OneToOne(() => User, (user) => user.address)
  @JoinColumn()
  user: User;
}
