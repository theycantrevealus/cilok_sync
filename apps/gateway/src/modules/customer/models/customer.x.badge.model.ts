import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, SchemaTypes, Types } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';

import { CustomerBadge } from './customer.badge.model';
import { Customer } from './customer.model';

export type CustomerXBadgeDocument = CustomerXBadge & Document;

@Schema()
export class CustomerXBadge {
  @Prop({ type: Types.ObjectId, ref: Customer.name })
  @Type(() => Customer)
  customer: Customer;

  @Prop({ type: Types.ObjectId, ref: CustomerBadge.name })
  @Type(() => CustomerBadge)
  badge: CustomerBadge;

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

  constructor(customer?: Customer, badge?: CustomerBadge) {
    this.customer = customer;
    this.badge = badge;
  }
}

export const CustomerXBadgeSchema =
  SchemaFactory.createForClass(CustomerXBadge);
