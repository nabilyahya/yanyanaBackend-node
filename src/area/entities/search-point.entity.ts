// src/area/entities/search-point.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Place } from 'src/places/entities/place.entity';

@Entity('search_points')
export class SearchPoint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @CreateDateColumn()
  searchedAt: Date;

  @ManyToMany(() => Place)
  @JoinTable()
  places: Place[];
}
