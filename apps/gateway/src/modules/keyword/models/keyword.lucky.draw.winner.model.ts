import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Lov } from '@/lov/models/lov.model';

import { KeywordPopulate } from './keyword.populate.model';
export type KeywordLuckyDrawWinnerDocument = KeywordLuckyDrawWinner & Document;

@Schema()
export class KeywordLuckyDrawWinner {
  @Prop({ type: Types.ObjectId, ref: KeywordPopulate.name })
  @Type(() => KeywordPopulate)
  keyword: KeywordPopulate;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  prize_winner_type: Lov;

  @Prop({ type: SchemaTypes.Number })
  prize_per_user_allow_count: number;

  constructor(
    keyword?: KeywordPopulate,
    prize_winner_type?: Lov,
    prize_per_user_allow_count?: number,
  ) {
    this.keyword = keyword;
    this.prize_winner_type = prize_winner_type;
    this.prize_per_user_allow_count = prize_per_user_allow_count;
  }
}

export const KeywordLuckyDrawWinnerSchema = SchemaFactory.createForClass(
  KeywordLuckyDrawWinner,
);
