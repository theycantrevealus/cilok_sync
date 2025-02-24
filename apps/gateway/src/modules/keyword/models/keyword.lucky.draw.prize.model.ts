import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { LocationBucket } from '@/location/models/location.bucket.model';
import { Location } from '@/location/models/location.model';
import { Lov } from '@/lov/models/lov.model';

import { KeywordPopulate } from './keyword.populate.model';
export type KeywordLuckyDrawPrizeDocument = KeywordLuckyDrawPrize & Document;

@Schema()
export class KeywordLuckyDrawPrize {
  @Prop({ type: Types.ObjectId, ref: KeywordPopulate.name })
  @Type(() => KeywordPopulate)
  keyword: KeywordPopulate;

  @Prop({ type: SchemaTypes.String })
  prize: string;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  prize_type: Lov;

  @Prop({ type: SchemaTypes.Number })
  prize_qty_total: number;

  @Prop({ type: SchemaTypes.Number })
  prize_qty_per_round: number;

  @Prop({ type: SchemaTypes.Number })
  prize_qty_per_remaining: number;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  prize_location: Location;

  @Prop({ type: Types.ObjectId, ref: LocationBucket.name })
  @Type(() => LocationBucket)
  prize_bucket: LocationBucket;

  constructor(
    keyword?: KeywordPopulate,
    prize?: string,
    prize_type?: Lov,
    prize_qty_total?: number,
    prize_qty_per_round?: number,
    prize_qty_per_remaining?: number,
    prize_location?: Location,
    prize_bucket?: LocationBucket,
  ) {
    this.keyword = keyword;
    this.prize = prize;
    this.prize_type = prize_type;
    this.prize_qty_total = prize_qty_total;
    this.prize_qty_per_round = prize_qty_per_round;
    this.prize_qty_per_remaining = prize_qty_per_remaining;
    this.prize_location = prize_location;
    this.prize_bucket = prize_bucket;
  }
}

export const KeywordLuckyDrawPrizeSchema = SchemaFactory.createForClass(
  KeywordLuckyDrawPrize,
);
