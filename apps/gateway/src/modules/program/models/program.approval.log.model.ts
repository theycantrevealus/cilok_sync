import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

import { Program } from './program.model';

export type ProgramApprovalLogDocument = ProgramApprovalLog & Document;

@Schema()
export class ProgramApprovalLog {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Program.name })
  @Type(() => Program)
  program: Program;

  @Prop({ type: mongoose.Schema.Types.Mixed, ref: Account.name })
  @Type(() => Account)
  approved_by: any | null;

  @Prop({ type: SchemaTypes.Date, default: Date.now() })
  approved_date: Date;

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

  constructor(program?: Program, approved_by?: Account | null) {
    this.program = program;
    this.approved_by = approved_by;
  }
}

export const ProgramApprovalLogSchema =
  SchemaFactory.createForClass(ProgramApprovalLog);
