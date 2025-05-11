import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Photo {
  @Prop({ required: true })
  url: string;

  @Prop()
  caption?: string;

  @Prop({ type: Types.ObjectId, ref: 'Place' })
  place: Types.ObjectId;
}

export type PhotoDocument = Photo & Document;
export const PhotoSchema = SchemaFactory.createForClass(Photo);
