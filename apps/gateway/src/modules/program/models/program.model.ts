import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { Location } from '@/location/models/location.model';
import { Lov } from '@/lov/models/lov.model';

export type ProgramDocument = Program & Document;

@Schema()
export class Program {
  @Prop({ type: SchemaTypes.String })
  name: string;

  @Prop({ type: SchemaTypes.String })
  desc: string;

  @Prop({ type: SchemaTypes.Date })
  start_period: Date;

  @Prop({ type: SchemaTypes.Date })
  end_period: Date;

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  point_type: Lov;

  // @Prop({ type: Types.ObjectId, ref: ProgramNotification.name })
  // @Type(() => ProgramNotification)
  // program_notification: ProgramNotification[];

  // @Prop({ type: Types.ObjectId, ref: ProgramSegmentation.name })
  // @Type(() => ProgramSegmentation)
  // program_segmentation: ProgramSegmentation[];

  @Prop({ type: Types.ObjectId, ref: Lov.name })
  @Type(() => Lov)
  program_mechanism: Lov;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  @Type(() => Location)
  program_owner: Location;

  @Prop({ type: SchemaTypes.String })
  logic: string;

  @Prop({ type: SchemaTypes.Boolean })
  c_los_enable: boolean;

  @Prop({ type: SchemaTypes.Number })
  c_los_value: number;

  @Prop({ type: SchemaTypes.Number })
  c_point_balance: number;

  @Prop({ type: SchemaTypes.String })
  program_owner_detail: string;

  @Prop({
    type: Types.ObjectId,
    ref: Program.name,
    required: false,
  })
  @Type(() => Program)
  program_parent: Program | null;

  @Prop({ type: mongoose.Schema.Types.Mixed, ref: Account.name })
  @Type(() => Account)
  created_by: any | null;

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
    desc?: string,
    start_period?: Date,
    end_period?: Date,
    point_type?: Lov,
    // program_notification?: ProgramNotification,
    // program_segmentation?: ProgramSegmentation,
    program_mechanism?: Lov,
    program_owner?: Location,
    logic?: string,
    created_by?: Account | null,
    program_parent?: Program | null,
  ) {
    this.name = name;
    this.desc = desc;
    this.start_period = start_period;
    this.end_period = end_period;
    this.point_type = point_type;
    // this.program_notification = program_notification;
    // this.program_segmentation = program_segmentation;
    this.program_mechanism = program_mechanism;
    this.program_owner = program_owner;
    this.logic = logic;
    this.created_by = created_by;
    this.program_parent = program_parent;
  }
}

export const ProgramSchema = SchemaFactory.createForClass(Program);
