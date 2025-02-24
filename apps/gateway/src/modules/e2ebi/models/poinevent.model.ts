import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {Document, SchemaTypes, Types} from 'mongoose';

import {TimeManagement} from '@/application/utils/Time/timezone';

export type PoineventDocument = Poinevent & Document;

@Schema()
export class Poinevent {
  @Prop({type: SchemaTypes.String})
  msisdn: string;

  @Prop({type: SchemaTypes.String})
  amount: string;

  @Prop({type: SchemaTypes.String})
  lacci: string;

  @Prop({type: SchemaTypes.String})
  insys_serial: string;

  @Prop({type: SchemaTypes.String})
  recharge_dt: string;


  @Prop({type: SchemaTypes.String})
  recharge_type: string;


  @Prop({type: SchemaTypes.String})
  dealer: string;


  @Prop({type: SchemaTypes.String})
  psubj: string;


  @Prop({type: SchemaTypes.String})
  stat_code: string;


  @Prop({type: SchemaTypes.String})
  channel: string;

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

  @Prop({type: SchemaTypes.Mixed, default: null})
  deleted_at: Date | null;

  constructor(
    msisdn?: string,
    amount?: string,
    lacci?: string,
    insys_serial?: string,
    recharge_dt?: string,
    recharge_type?: string,
    dealer?: string,
    psubj?: string,
    stat_code?: string,
    channel?: string,
  ) {
    this.msisdn = msisdn;
    this.amount = amount;
    this.lacci = lacci;
    this.insys_serial = insys_serial;
    this.recharge_dt = recharge_dt;
    this.recharge_type = recharge_type;
    this.dealer = dealer;
    this.psubj = psubj;
    this.stat_code = stat_code;
    this.channel = channel;
  }
}

export const PoineventSchema = SchemaFactory.createForClass(Poinevent);
