import { Place } from 'src/places/entities/place.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  // @ManyToOne(() => User, (user) => user.reports)
  // user: User;

  // @ManyToOne(() => Place, (place) => place.reports)
  // place: Place;
}
