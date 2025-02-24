import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';
import { Document, Mixed, SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { TransactionErrorMsgResp } from '@/dtos/property.dto';

export type DataSyncDocument = DataSync & Document;

@Schema({ collection: 'data_sync' })
export class DataSync {
  @ApiProperty({
    required: true,
    type: String,
    example: 'business_user',
    description: 'Data source',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: true, default: 'business_user' })
  target: string;

  @ApiProperty({
    required: true,
    example: 'create',
    type: String,
    description: 'create, update, or delete',
  })
  @Prop({ type: SchemaTypes.String, required: true, default: 'create' })
  @IsString()
  event: string;

  @ApiProperty({
    required: true,
    example: 'user-xxxxxxxx',
    type: String,
    description: 'Core data identifier',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: true })
  @IsDefined({
    message: 'Identifier is required, format user-xxxxxxxxxxxx',
  })
  identifier: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.Mixed,
    required: false,
    default: '',
  })
  additional: Mixed;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @Prop({
    type: SchemaTypes.Mixed,
    required: false,
    default: '',
  })
  result: Mixed;

  @Prop({
    required: false,
    type: SchemaTypes.Date,
  })
  logged_at: Date;

  @Prop({
    required: false,
    type: SchemaTypes.Date,
  })
  sync_at: Date;

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

  @Prop({ type: SchemaTypes.Mixed, required: false })
  responseBody: object;
}

export const DataSyncSchema = SchemaFactory.createForClass(DataSync);
