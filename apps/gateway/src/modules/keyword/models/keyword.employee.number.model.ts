import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Keyword } from './keyword.model';
import { KeywordPopulate } from './keyword.populate.model';
export type KeywordEmployeeNumberDocument = KeywordEmployeeNumber & Document;

@Schema()
export class KeywordEmployeeNumber extends Keyword {
  @Prop({ type: Types.ObjectId, ref: KeywordPopulate.name })
  @Type(() => KeywordPopulate)
  keyword: KeywordPopulate;

  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  constructor(keyword?: KeywordPopulate, msisdn?: string) {
    super();
    this.keyword = keyword;
    this.msisdn = msisdn;
  }
}

export const KeywordEmployeeNumberSchema = SchemaFactory.createForClass(
  KeywordEmployeeNumber,
);
