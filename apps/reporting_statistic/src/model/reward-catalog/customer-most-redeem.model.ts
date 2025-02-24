import { TimeManagement } from '@/application/utils/Time/timezone';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

export type CustomerMostRedeemDocument = CustomerMostRedeem & Document;

@Schema({ collection: 'customermostredeems' })
export class CustomerMostRedeem {
  @Prop({
    isRequired: true,
    type: String,
  })
  msisdn: string;

  @Prop({
    isRequired: true,
    type: String,
  })
  program_experience_id: string;

  @Prop({
    isRequired: true,
    type: Number,
    default: 1,
  })
  counter: number;

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
}

export const CustomerMostRedeemSchema = SchemaFactory.createForClass(CustomerMostRedeem);

// CustomerMostRedeemSchema.index(
//   { msisdn: 1, program_experience_id: 1 },
//   { unique: false },
// );
