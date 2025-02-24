import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { KeywordPopulate } from '@/keyword/models/keyword.populate.model';
import { Lov } from '@/lov/models/lov.model';
import { Program } from '@/program/models/program.model';

export type PKApprovalDocument = PKApproval & Document;

@Schema()
export class PKApproval {
  @Prop({ type: SchemaTypes.Mixed })
  approval_type: Program | KeywordPopulate;

  @Prop({
    type: SchemaTypes.ObjectId,
  })
  target_data: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  approved_by: Account;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  approve_from: Lov;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  approve_to: Lov;

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
    approval_type: Program | KeywordPopulate,
    target_data?: Types.ObjectId,
    approved_by?: Account,
    approve_from?: Lov,
    approve_to?: Lov,
  ) {
    this.approval_type = approval_type;
    this.target_data = target_data;
    this.approved_by = approved_by;
    this.approve_from = approve_from;
    this.approve_to = approve_to;
  }
}

export const PKApprovalSchema = SchemaFactory.createForClass(PKApproval);
