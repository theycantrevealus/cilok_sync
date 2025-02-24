import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Location } from '@/location/models/location.model';

import { Keyword } from './keyword.model';
export type KeywordQuotaDocument = KeywordQuota & Document;

@Schema()
export class KeywordQuota {
  @Prop({ type: Types.ObjectId, ref: Keyword.name })
  @Type(() => Keyword)
  keyword: Keyword;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  location: Location;

  @Prop({ type: SchemaTypes.Number })
  limit: number;

  @Prop({ type: SchemaTypes.Number })
  stock: number;

  constructor(
    keyword?: Keyword,
    location?: Location,
    limit?: number,
    stock?: number,
  ) {
    this.keyword = keyword;
    this.location = location;
    this.limit = limit;
    this.stock = stock;
  }
}

export const KeywordQuotaSchema = SchemaFactory.createForClass(KeywordQuota);
