import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PlaceAddress } from './place-address.entity';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  city: string;

  @Column()
  district: string;

  @Column({ nullable: true })
  street: string;

  @Column()
  country: string;

  @Column({ nullable: true })
  addressDetails: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column('decimal', { precision: 10, scale: 7 })
  longitude: number;

  @Column('decimal', { precision: 10, scale: 7 })
  latitude: number;

  // @OneToMany(() => PlaceAddress, (placeAddress) => placeAddress.area)
  // placeAddresses: PlaceAddress[];
}
