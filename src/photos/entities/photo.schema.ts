import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Place } from '../../places/entities/place.entity';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;

  @Column({ nullable: true })
  caption: string;

  @CreateDateColumn()
  uploadedAt: Date;

  @ManyToOne(() => Place, (place) => place.photos)
  place: Place;
}
