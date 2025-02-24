import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {ApiProperty} from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
} from 'class-validator';
import {Document, SchemaTypes, Types} from 'mongoose';

const moment = require('moment-timezone');

export type ReportTrendErrorRedeemDocument = ReportTrendErrorRedeem & Document;

@Schema({collection: 'report_trend_error_redeem'})
export class ReportTrendErrorRedeem {

  @Prop({
    type: SchemaTypes.Date,
    default: moment()
  })
  created_at: Date;

  @IsString()
  @Prop({type: SchemaTypes.String})
  keyword_name: string;

  @IsString()
  @Prop({type: SchemaTypes.String})
  log_event: string;

  @IsString()
  @Prop({type: SchemaTypes.String})
  notification_content: string;

  @Prop({type: SchemaTypes.Number})
  @IsNumber()
  total: number;

  @IsString()
  @Prop({type: SchemaTypes.String})
  program_name: string;

  @Prop({type: SchemaTypes.Mixed, default: null})
  start_period: Date | null;

  @Prop({type: SchemaTypes.Mixed, default: null})
  end_period: Date | null;

  @Prop({
    type: SchemaTypes.Date,
    default: moment()
  })
  updated_at: Date;

  @Prop({type: SchemaTypes.Mixed, default: null})
  deleted_at: Date | null;
}

export const ReportTrendErrorRedeemSchema = SchemaFactory.createForClass(ReportTrendErrorRedeem);
