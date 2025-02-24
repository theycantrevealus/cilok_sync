import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type LocationPrefixDocument = LocationPrefix & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class LocationPrefix {
  @Prop({
    isRequired: true,
    type: String,
  })
  regional: string;

  @Prop({
    isRequired: true,
    type: String,
  })
  area: string;

  @Prop({
    index: true,
    isRequired: true,
    type: String,
  })
  prefix: string;

  @Prop({
    index: true,
    isRequired: true,
    type: String,
  })
  origin_prefix: string;

  @Prop({
    isRequired: true,
    type: String,
  })
  area_id: string;

  @Prop({
    isRequired: true,
    type: String,
  })
  region_id: string;
}

export const LocationPrefixSchema =
  SchemaFactory.createForClass(LocationPrefix);
