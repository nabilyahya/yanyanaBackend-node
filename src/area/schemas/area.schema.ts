import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AreaDocument = HydratedDocument<Area>;

@Schema({ timestamps: true })
export class Area {
  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  district: string;

  @Prop()
  longitude?: number;

  @Prop()
  latitude?: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AreaSchema = SchemaFactory.createForClass(Area);
