import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type CallbackAuthDocument = CallbackAuth & Document;

@Schema({ collection: 'callback_auth' })
export class CallbackAuth {
  @ApiProperty({
    required: true,
    example: '',
    description: 'username',
  })
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  username: string;

  @ApiProperty({
    required: true,
    example: '',
    description: `password`,
  })
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  password: string;

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

export const CallbackAuthSchema = SchemaFactory.createForClass(CallbackAuth);
