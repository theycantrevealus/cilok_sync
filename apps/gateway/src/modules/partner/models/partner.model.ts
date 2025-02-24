import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
export type PartnerDocument = Partner & Document;

@Schema()
export class Partner {
  @Prop({ type: SchemaTypes.String })
  partner_code: string;

  @Prop({ type: SchemaTypes.String })
  partner_name: string;

  @Prop({ type: SchemaTypes.String })
  partner_status: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, ref: Account.name })
  @Type(() => Account)
  created_by: any | null;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  constructor(
    partner_code?: string,
    partner_name?: string,
    partner_status?: string,
    created_by?: Account | null,
  ) {
    this.partner_code = partner_code;
    this.partner_name = partner_name;
    this.partner_status = partner_status;
    this.created_by = created_by;
  }
}

export const PartnerSchema = SchemaFactory.createForClass(Partner);
