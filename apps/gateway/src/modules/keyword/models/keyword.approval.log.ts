import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { Lov } from '@/lov/models/lov.model';
import { Keyword } from './keyword.model';

export type KeywordApprovalLogDocument = KeywordApprovalLog & Document;

@Schema()
export class KeywordApprovalLog {
  @Prop({
    type: Types.ObjectId,
    ref: Keyword.name,
    required: false,
  })
  @Type(() => Keyword)
  keyword: Keyword | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: Account.name })
  processed_by: Account;

  @Prop({ type: SchemaTypes.ObjectId, ref: Lov.name })
  status: Lov;

  @Prop({ type: SchemaTypes.String })
  reason: string;

  @Prop({ type: SchemaTypes.Date, default: Date.now() })
  approved_at: Date;

  constructor(
    keyword?: Keyword,
    processed_by?: Account,
    status?: Lov,
    reason?: string,
  ) {
    this.keyword = keyword;
    this.processed_by = processed_by;
    this.status = status;
    this.reason = reason;
  }
}

export const KeywordApprovalLogSchema =
  SchemaFactory.createForClass(KeywordApprovalLog);
