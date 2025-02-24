import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

export type OauthLogsDocument = OauthLogs & Document;

@Schema()
export class OauthLogs {
  @Prop({
    type: SchemaTypes.ObjectId,
  })
  _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.String })
  type: 'request' | 'response';

  @Prop({ type: SchemaTypes.Mixed })
  path: string | null;

  @Prop({ type: SchemaTypes.String })
  host: string;

  @Prop({ type: SchemaTypes.Mixed })
  headers: object;

  @Prop({ type: SchemaTypes.Mixed })
  body: object;

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
    type: 'request' | 'response',
    path?: string | null,
    host?: string,
    headers?: object,
    body?: object,
  ) {
    this._id = new Types.ObjectId();
    this.type = type;
    this.path = path;
    this.host = host;
    this.headers = headers;
    this.body = body;
  }
}

export const OauthLogsSchema = SchemaFactory.createForClass(OauthLogs);
