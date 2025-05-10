import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PlaceDocument = HydratedDocument<Place>;

@Schema({ timestamps: true })
export class Place {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 0, max: 5, default: 0 })
  rate: number;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  websiteUrl: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ type: [{ type: String }] })
  photos: string[];

  @Prop({ type: Types.ObjectId, ref: 'Area', required: true })
  address: Types.ObjectId;

  @Prop({ default: false })
  approved: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PlaceSchema = SchemaFactory.createForClass(Place);
