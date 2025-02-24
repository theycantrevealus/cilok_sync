import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

export type BatchSchedulerDocument = BatchScheduler & Document;

@Schema({ collection: 'batchscheduler' })
export class BatchScheduler {
  @ApiProperty({
    required: false,
    example: '',
    description: `Batch id`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
    index: true,
  })
  batch_id: string;

  @ApiProperty({
    required: true,
    example: '',
    description: `Batch filename`,
  })
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  @IsString()
  filename: string;

  @ApiProperty({
    required: true,
    example: '',
    description: `Timestamps`,
  })
  @Prop({
    type: SchemaTypes.Date,
  })
  @IsDateString()
  running_at: Date;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: true,
  })
  created_by: Account;

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

  @Prop({
    type: SchemaTypes.String,
  })
  @IsString()
  identifier: string;
}

export const BatchSchedulerSchema =
  SchemaFactory.createForClass(BatchScheduler);
