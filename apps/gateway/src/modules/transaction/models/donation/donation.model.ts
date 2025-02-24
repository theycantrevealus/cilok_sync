import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsDateString, IsNumber } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type DonationDocument = Donation & Document;

@Schema({ collection: 'donation' })
export class Donation {
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  keyword: Types.ObjectId;

  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: true,
    default: 0,
  })
  donation_target: number;

  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: true,
    default: 0,
  })
  donation_current: number;

  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: true,
    default: 0,
  })
  donation_queue: number;

  @IsDateString()
  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  start_time: Date;

  @IsDateString()
  @Prop({
    type: SchemaTypes.Date,
    required: false,
  })
  end_time: Date;

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

export const DonationSchema = SchemaFactory.createForClass(Donation);
