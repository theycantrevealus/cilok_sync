import { Account } from "@/account/models/account.model";
import { TimeManagement } from "@/application/utils/Time/timezone";
import { Prop } from "@nestjs/mongoose";
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
import { SchemaTypes } from "mongoose";

export class CommonSchemaInventoryModel {
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Prop({ type: String, required: true })
  merchant_id: string;
  
  @Prop({ type: SchemaTypes.ObjectId, ref: Account.name })
  created_by: Account;

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
