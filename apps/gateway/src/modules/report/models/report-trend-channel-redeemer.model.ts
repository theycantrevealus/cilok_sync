import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsString } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { Program } from '@/program/models/program.model';

@Schema({ collection: 'report_trend_channel_redeemer' })
export class ReportTrendChannelRedeemer {
  @ApiProperty({
    description: 'Parent Program (Object ID)',
    default: '635a73b81125eba1458719c7',
    type: Types.ObjectId,
  })
  @Prop({ type: SchemaTypes.ObjectId, ref: Program.name })
  @IsMongoId()
  program: Types.ObjectId;

  // @ApiProperty({
  //   description: 'Date transaction, which is equal to report date',
  // })
  // @Prop({
  //   type: SchemaTypes.Date,
  // })
  // @IsDateString()
  // date: Date;

  @ApiProperty({
    required: true,
    type: String,
    example: '2022-12-13',
    description: 'Period of record',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  date: string;

  @ApiProperty({
    description: 'Channel information. (Object ID)',
    default: 'I8',
    type: String,
  })
  @Prop({ type: SchemaTypes.String })
  @IsMongoId()
  channel_name: string;

  @ApiProperty({
    description:
      'Total transaction redeem done by a certain MSISDN from start period until report date-hour.',
    default: 1,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  total_redeem: number;

  @ApiProperty({
    description:
      'Total Unique MSISDN with total redeem transactions as stated in column ‘Number of Redeem’ from start period until report date-hour.',
    default: 62929288,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  total_msisdn: number;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  constructor(
    program: Types.ObjectId,
    date: string,
    channel: string,
    number_of_redeem: number,
    count_msisdn: number,
    created_at: Date,
    updated_at: Date,
    deleted_at: Date | null,
  ) {
    this.program = program;
    this.date = date;
    this.channel_name = channel;
    this.total_redeem = number_of_redeem;
    this.total_msisdn = count_msisdn;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }
}

export const ReportTrendChannelRedeemerSchema = SchemaFactory.createForClass(
  ReportTrendChannelRedeemer,
);
export type ReportTrendChannelRedeemerDocument = ReportTrendChannelRedeemer &
  Document;
