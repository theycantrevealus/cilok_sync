import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

export type APILogDocument = APILog & Document;

@Schema()
export class APILog {
  @Prop({
    type: SchemaTypes.ObjectId,
  })
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.String })
  type: 'request' | 'response';

  @Prop({ type: SchemaTypes.String })
  tracing_id: string;

  @Prop({ type: SchemaTypes.String })
  path: string;

  @Prop({ type: SchemaTypes.Mixed })
  headers: object | null;

  @Prop({ type: SchemaTypes.String })
  method: string;

  @Prop({ type: SchemaTypes.Mixed })
  body: object;

  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  account: Account;

  @Prop({ type: SchemaTypes.String })
  activity: string;

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

  constructor(
    _id: Types.ObjectId,
    type: 'request' | 'response',
    path?: string | null,
    headers?: object | null,
    body?: object,
  ) {
    this._id = _id;
    this.type = type;
    this.path = path;
    this.headers = headers;
    this.body = body;
  }
}

export const APILogSchema = SchemaFactory.createForClass(APILog);
