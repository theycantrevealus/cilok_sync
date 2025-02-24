import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { KeywordPopulate } from '@/keyword/models/keyword.populate.model';
import { LocationBucket } from '@/location/models/location.bucket.model';
import { Location } from '@/location/models/location.model';
import { Lov } from '@/lov/models/lov.model';
export type KeywordBonusDocument = KeywordBonus & Document;

@Schema()
export class KeywordBonus {
  @Prop({ type: Types.ObjectId, ref: KeywordPopulate.name })
  @Type(() => KeywordPopulate)
  keyword: KeywordPopulate;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  bonus_type: Lov;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location: Location;

  @Prop({ type: SchemaTypes.Number })
  limit: number;

  @Prop({ type: SchemaTypes.Number })
  stock: number;

  @Prop({ type: Types.ObjectId, ref: LocationBucket.name })
  @Type(() => LocationBucket)
  bucket: LocationBucket;

  @Prop({ type: SchemaTypes.Number })
  qty_denom: number;

  @Prop({ type: SchemaTypes.String })
  payment: string;

  @Prop({ type: SchemaTypes.String })
  granular: string;

  @Prop({ type: SchemaTypes.String })
  bid: string;

  @Prop({ type: SchemaTypes.String })
  bonus_id: string;

  @Prop({ type: SchemaTypes.String })
  bonus_name: string;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  constructor(
    keyword?: KeywordPopulate,
    bonus_type?: Lov,
    location?: Location,
    limit?: number,
    stock?: number,
    bucket?: LocationBucket,
    qty_denom?: number,
    payment?: string,
    granular?: string,
    bid?: string,
    bonus_id?: string,
    bonus_name?: string,
  ) {
    this.keyword = keyword;
    this.bonus_type = bonus_type;
    this.location = location;
    this.limit = limit;
    this.stock = stock;
    this.bucket = bucket;
    this.qty_denom = qty_denom;
    this.payment = payment;
    this.granular = granular;
    this.bid = bid;
    this.bonus_id = bonus_id;
    this.bonus_name = bonus_name;
  }
}

export const KeywordBonusSchema = SchemaFactory.createForClass(KeywordBonus);
