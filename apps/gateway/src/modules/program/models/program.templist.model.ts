import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Keyword } from '@/keyword/models/keyword.model';
import { Location } from '@/location/models/location.model';
import { Program } from '@/program/models/program.model';

export type ProgramTemplistDocument = ProgramTemplist & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class ProgramTemplist {
  @Prop({
    type: Types.ObjectId,
    ref: Account.name,
    required: false,
  })
  @Type(() => Account)
  account: Account | null;

  @Prop({
    type: Types.ObjectId,
    ref: Location.name,
    required: false,
  })
  @Type(() => Location)
  location: Location | null;

  @Prop({
    type: Types.ObjectId,
    ref: Program.name,
    required: false,
  })
  @Type(() => Program)
  program: Program | null;

  @Prop({
    type: Types.ObjectId,
    ref: Keyword.name,
    required: false,
  })
  @Type(() => Keyword)
  keyword: Keyword | null;

  @Prop({ type: SchemaTypes.String })
  type: string;

  @Prop({ type: SchemaTypes.String, unique: false })
  msisdn: string;

  @Prop({ type: SchemaTypes.Number })
  counter: number;

  @Prop({ type: SchemaTypes.Boolean })
  match: boolean;

  @Prop({ type: SchemaTypes.String })
  identifier: string;

  @Prop({
    type: SchemaTypes.Date,
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  constructor(location?: Location, msisdn?: string, program?: Program) {
    this.location = location;
    this.msisdn = msisdn;
    this.program = program;
  }
}

export const ProgramTemplistSchema =
  SchemaFactory.createForClass(ProgramTemplist);
