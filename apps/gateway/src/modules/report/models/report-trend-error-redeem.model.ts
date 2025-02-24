import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsString } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { Keyword } from '@/keyword/models/keyword.model';
import { Program } from '@/program/models/program.model';

@Schema({ collection: 'report_trend_error_redeem' })
export class ReportTrendErrorRedeem {
  @ApiProperty({
    description: 'Parent Program Name (Object ID)',
    default: '635a73b81125eba1458719c7',
    type: Types.ObjectId,
  })
  @Prop({ type: SchemaTypes.ObjectId, ref: Program.name })
  @IsString()
  program: Types.ObjectId;

  @ApiProperty({
    description: 'Date transaction, which is equal to report date',
  })
  @Prop({
    type: SchemaTypes.Date,
  })
  @IsDateString()
  date: Date;

  @ApiProperty({
    description: 'Related redeem keyword of the transactions (Object ID)',
    default: '631078e514dfee6e105347c0',
    type: Types.ObjectId,
  })
  @Prop({ type: SchemaTypes.ObjectId, ref: Keyword.name })
  @IsString()
  keyword: Types.ObjectId;

  @ApiProperty({
    description: 'Error Code.',
  })
  @Prop({ type: SchemaTypes.String })
  @IsString()
  log_event: string;

  @ApiProperty({
    description: 'Notification sent to customer.',
  })
  @Prop({ type: SchemaTypes.String })
  @IsString()
  notification: string;

  @ApiProperty({
    description: 'Total error redeem transactions.',
    default: 100,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  total: number;

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
    date: Date,
    keyword: Types.ObjectId,
    notification: string,
    total: number,
    created_at: Date,
    updated_at: Date,
    deleted_at: Date | null,
  ) {
    this.program = program;
    this.date = date;
    this.keyword = keyword;
    this.notification = notification;
    this.total = total;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.deleted_at = deleted_at;
  }
}

export const ReportTrendErrorRedeemSchema = SchemaFactory.createForClass(
  ReportTrendErrorRedeem,
);
export type ReportTrendErrorRedeemDocument = ReportTrendErrorRedeem & Document;
