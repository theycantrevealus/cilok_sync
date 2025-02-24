import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {CronConfig} from "./cron.config.model";
import mongoose from "mongoose";

export type CronLogDocument = CronLog & Document;

@Schema({
  timestamps : {
    createdAt : true
  }
})
export class CronLog {

  @Prop( { type: mongoose.SchemaTypes.Mixed } )
  cron_config: any;

}

export const CronLogSchema = SchemaFactory.createForClass(CronLog);


