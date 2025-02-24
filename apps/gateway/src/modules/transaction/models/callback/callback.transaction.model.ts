import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  isDefined,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsObject,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Channel } from 'diagnostics_channel';
import { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

export type CallbackTransactionDocument = CallbackTransaction & Document;

@Schema({ collection: 'transaction_callback' })
export class CallbackTransaction {
  @ApiProperty({
    required: false,
    example: 'en-US',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  locale: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Subscriber Number',
  })
  @IsNumberString()
  @MinLength(10)
  @IsNotEmpty()
  @IsDefined()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  msisdn: string;

  @ApiProperty({
    required: true,
    example: '',
    description: `Original transaction id`,
  })
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  ref_transaction_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Channel transaction id`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  transaction_id: string;

  @ApiProperty({
    required: false,
    type: 'string',
    example: '',
    description: `Channel information from source application`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  channel_id: Channel;

  @ApiProperty({
    required: false,
    example: 1,
    description: `Status of transaction</br>
    1 : Success</br>
    0 : Failed`,
  })
  @IsNumber()
  @Prop({
    type: SchemaTypes.Number,
    required: false,
  })
  transaction_status: number;

  @ApiProperty({
    required: false,
    type: 'string',
    example: '',
    description: `Reason of failure if any`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  remark: string;

  @ApiProperty({
    required: false,
    example: { "code": "X", "name": "Y" },
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  })
  @IsObject()
  @Prop({ 
    type: Object, 
    required: false 
  })
  additional_param: object;

  @Prop({ type: SchemaTypes.ObjectId, ref: Account.name })
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
}

export const CallbackTransactionSchema =
  SchemaFactory.createForClass(CallbackTransaction);
