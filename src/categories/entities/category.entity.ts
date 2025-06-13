import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Place } from '../../places/entities/place.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => Place, (place) => place.category)
  places: Place[];
}
