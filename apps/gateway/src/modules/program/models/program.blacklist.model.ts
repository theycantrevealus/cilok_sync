import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { Program } from '@/program/models/program.model';

export type ProgramBlacklistDocument = ProgramBlacklist & Document;

@Schema()
export class ProgramBlacklist {
  @Prop({
    type: Types.ObjectId,
    ref: Program.name,
    required: false,
  })
  @Type(() => Program)
  program: Program | null;

  @Prop({ type: SchemaTypes.String })
  msisdn: string;

  @Prop({ type: SchemaTypes.Number })
  counter: number;

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

  constructor(program?: Program, msisdn?: string) {
    this.program = program;
    this.msisdn = msisdn;
  }
}

export const ProgramBlacklistSchema =
  SchemaFactory.createForClass(ProgramBlacklist);
