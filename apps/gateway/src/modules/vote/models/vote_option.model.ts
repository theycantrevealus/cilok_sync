import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsString } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
export type VoteOptionDocument = VoteOption & Document;

@Schema({ collection: 'vote_option' })
export class VoteOption {
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  vote: Types.ObjectId;

  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  option: string;

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
}

export const VoteOptionSchema = SchemaFactory.createForClass(VoteOption);
