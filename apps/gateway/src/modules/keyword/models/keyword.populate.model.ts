import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Lov } from '@/lov/models/lov.model';

import { Keyword } from './keyword.model';
export type KeywordPopulateDocument = KeywordPopulate & Document;

@Schema()
export class KeywordPopulate {
  @Prop({ type: SchemaTypes.String })
  name: string;

  @Prop({ type: SchemaTypes.String })
  foreign_collection: string;

  @Prop({ type: Types.ObjectId, ref: Keyword.name })
  @Type(() => Keyword)
  foreign_id: Keyword;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  keyword_approval: Lov;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: false,
  })
  @Type(() => Account)
  hq_approver: Account | null;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: false,
  })
  @Type(() => Account)
  non_hq_approver: Account | null;

  @Prop({
    type: Types.ObjectId,
    ref: KeywordPopulate.name,
    required: false,
  })
  @Type(() => KeywordPopulate)
  keyword_parent: KeywordPopulate | null;

  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  created_by: any;

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
    name?: string,
    foreign_collection?: string,
    foreign_id?: Keyword,
    keyword_approval?: Lov,
    keyword_parent?: KeywordPopulate | null,
    created_by?: Account | null,
  ) {
    this.name = name;
    this.foreign_collection = foreign_collection;
    this.foreign_id = foreign_id;
    this.keyword_approval = keyword_approval;
    this.keyword_parent = keyword_parent;
    this.created_by = created_by;
  }
}

export const KeywordPopulateSchema =
  SchemaFactory.createForClass(KeywordPopulate);
