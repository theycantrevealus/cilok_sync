import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';

export type CustomerPoinHistoryDocument = CustomerPoinHistory & Document;

@Schema({ collection: 'customerpoinhistory' })
export class CustomerPoinHistory {
  @Prop({ type: SchemaTypes.String, unique: true })
  transaction_id: string;

  @Prop({ type: SchemaTypes.String })
  transaction_no: string;

  @Prop({ type: SchemaTypes.String })
  type: string;

  @Prop({ type: SchemaTypes.String })
  action: string;

  @Prop({ type: SchemaTypes.String })
  channel: string;

  @Prop({ type: SchemaTypes.String })
  status: string;

  @Prop({ type: SchemaTypes.String })
  core_id: string;

  @Prop({ type: SchemaTypes.Number })
  total: Number;

  @Prop({ type: SchemaTypes.String })
  customer_id: string;

  @Prop({ type: SchemaTypes.String })
  time: Date;

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

export const CustomerPoinHistorySchema =
  SchemaFactory.createForClass(CustomerPoinHistory);
