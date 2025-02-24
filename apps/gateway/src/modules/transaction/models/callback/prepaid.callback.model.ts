import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

export type CallbackPrepaidDocument = CallbackPrepaid & Document;

@Schema({ collection: 'transaction_prepaid_callback' })
export class CallbackPrepaid {
  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Channel transaction id`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  transaction_id: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `A Number`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  service_id_a: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `B Number`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  service_id_b: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Error Code`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  error_code: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Messages`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  detail_code: string;

  @ApiProperty({
    required: false,
    type: String,
    example: '',
    description: `Order Id`,
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  charging_orderid: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    default: null,
    required: false,
    ref: Account.name,
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

  @Prop({ type: Object, default: null, required: false })
  refund: object;

  @Prop({ type: Object, default: null, required: false })
  payload: object;

  constructor(
    transaction_id?: string,
    service_id_a?: string,
    service_id_b?: string,
    error_code?: string,
    detail_code?: string,
    charging_orderid?: string,
    created_by?: Account | null,
    payload?: object | null,
  ) {
    this.transaction_id = transaction_id;
    this.service_id_a = service_id_a;
    this.service_id_b = service_id_b;
    this.error_code = error_code;
    this.detail_code = detail_code;
    this.charging_orderid = charging_orderid;
    this.created_by = created_by;
    this.payload = payload;
  }
}

export const PrepaidCallbackSchema =
  SchemaFactory.createForClass(CallbackPrepaid);
