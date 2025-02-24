import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {
  IsString,
} from 'class-validator';
import {Document, SchemaTypes, Types} from 'mongoose';
import {ApiProperty} from "@nestjs/swagger";

const moment = require('moment-timezone');

export type MsisdnRedeemTransactionTempDocument = MsisdnRedeemTransactionTemp & Document;

@Schema({collection: 'report_msisdn_redeem_transaction_temp'})
export class MsisdnRedeemTransactionTemp {

  @ApiProperty({
    description: 'All Keywords related to report’s Parent Program',
    type: String,
  })
  @IsString()
  @Prop({type: SchemaTypes.String})
  program_name: string;

  @IsString()
  @Prop({type: SchemaTypes.String})
  msisdn: string;

  @Prop({
    type: SchemaTypes.Date,
    default: moment()
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: moment()
  })
  updated_at: Date;

  @Prop({type: SchemaTypes.Mixed, default: null})
  deleted_at: Date | null;
}

export const MsisdnRedeemTransactionTempSchema = SchemaFactory.createForClass(MsisdnRedeemTransactionTemp);
