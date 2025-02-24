import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { SchemaTypes } from "mongoose";
import { IsOptional} from "class-validator";

export type BatchProcessLogRowDocument = BatchProcessRowLog & Document;

export enum BatchProcessLogEnum {
  FAIL = "fail",
  SUCCESS = "success",
}

@Schema({
  timestamps : {
    createdAt : true,
    updatedAt : true
  }
})
export class BatchProcessRowLog {
  @Prop({ type: SchemaTypes.ObjectId, index: true })
  batch_id: string;
  
  @Prop({ type: SchemaTypes.String, index: true })
  filename: string;

  @Prop({ type: Object })
  line_data: any;

  @Prop({ type: SchemaTypes.String, index: true })
  trace_id: string;

  @Prop({ type: SchemaTypes.String, enum : BatchProcessLogEnum, index: true })
  status: string;

  @Prop({ type: Object })
  error: object;

  @IsOptional()
  @Prop({ type: Object })
  response_service: object;

}

export const BatchProcessRowLogSchema = SchemaFactory.createForClass(BatchProcessRowLog);
