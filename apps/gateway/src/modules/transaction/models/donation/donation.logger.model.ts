import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {IsInt, IsString} from "class-validator";
import {Document, SchemaTypes} from "mongoose";
import {TimeManagement} from "@/application/utils/Time/timezone";

export type DonationProcessDocument = DonationProcess & Document;

@Schema({ collection: 'donation' })
export class DonationProcess {

  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  keyword: string;

  @IsInt()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  donation_target: string;

  @IsInt()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  donation_current: string;

  @IsInt()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  donation_waiting: string;

  @Prop({
    type: SchemaTypes.Date,
    required: false,
  })
  start_time: Date;

  @Prop({
    type: SchemaTypes.Date,
    required: false,
  })
  end_time: Date;

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

export const DonationProcessSchema = SchemaFactory.createForClass(DonationProcess);
