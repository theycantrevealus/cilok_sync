import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { Lov } from '@/lov/models/lov.model';
import { ProgramV2 } from '@/program/models/program.model.v2';

export type ProgramApprovalLogDocument = ProgramApprovalLog & Document;

@Schema()
export class ProgramApprovalLog {
  @Prop({
    type: Types.ObjectId,
    ref: ProgramV2.name,
    required: false,
  })
  @Type(() => ProgramV2)
  program: ProgramV2 | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: Account.name })
  processed_by: Account;

  @Prop({ type: SchemaTypes.ObjectId, ref: Lov.name })
  status: Lov;

  @Prop({ type: SchemaTypes.String })
  reason: string;

  @Prop({ type: SchemaTypes.Date, default: Date.now() })
  approved_at: Date;

  constructor(
    program?: ProgramV2,
    processed_by?: Account,
    status?: Lov,
    reason?: string,
  ) {
    this.program = program;
    this.processed_by = processed_by;
    this.status = status;
    this.reason = reason;
  }
}

export const ProgramApprovalLogSchema =
  SchemaFactory.createForClass(ProgramApprovalLog);
