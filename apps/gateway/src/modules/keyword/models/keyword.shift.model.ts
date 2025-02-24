import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { KeywordPopulate } from '@/keyword/models/keyword.populate.model';
export type KeywordShiftDocument = KeywordShift & Document;

@Schema()
export class KeywordShift {
  @Prop({ type: Types.ObjectId, ref: KeywordPopulate.name })
  @Type(() => KeywordPopulate)
  keyword: KeywordPopulate;

  @Prop({ type: SchemaTypes.String })
  from: string;

  @Prop({ type: SchemaTypes.String })
  to: string;

  @Prop({ type: SchemaTypes.Number })
  max_redeem: number;

  constructor(
    keyword?: KeywordPopulate,
    from?: string,
    to?: string,
    max_redeem?: number,
  ) {
    this.keyword = keyword;
    this.from = from;
    this.to = to;
    this.max_redeem = max_redeem;
  }
}

export const KeywordShiftSchema = SchemaFactory.createForClass(KeywordShift);
