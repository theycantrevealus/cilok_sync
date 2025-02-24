import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsBoolean, IsDateString, IsNumber, IsString } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
export type VoteDocument = Vote & Document;

@Schema({ collection: 'vote' })
export class Vote {
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  program: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  keyword: Types.ObjectId;

  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  title: string;

  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  description: string;

  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  image: string;

  @IsDateString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  start_time: Date;

  @IsDateString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  end_time: Date;

  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: true,
    default: 0,
  })
  target_votes: number;

  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: true,
    default: 0,
  })
  current_votes: number;

  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: true,
    default: 0,
  })
  current_points: number;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_finish: boolean;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;
}

export const VoteSchema = SchemaFactory.createForClass(Vote);
