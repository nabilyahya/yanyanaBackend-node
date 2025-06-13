import { Place } from 'src/places/entities/place.entity';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Area } from './area.entity';

@Entity('place_addresses')
export class PlaceAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Area)
  @JoinColumn({ name: 'areaId' })
  area: Area;

  @OneToOne(() => Place, (place) => place.address)
  place: Place;
}
