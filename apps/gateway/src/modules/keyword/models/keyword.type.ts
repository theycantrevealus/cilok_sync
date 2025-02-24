import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {Document, SchemaTypes} from "mongoose";
import {ProgramV2} from "@/program/models/program.model.v2";
import {Keyword} from "@/keyword/models/keyword.model";
import {TimeManagement} from "@/application/utils/Time/timezone";

export type KeywordTypeDocument = KeywordType & Document;

enum Type {
  'REGISTRATION' = 'K_REGISTRATION',
  'REDEEM' = 'K_REDEEM',
  'NOTIFICATION' = 'K_NOTIFICATION',
  'INFO' = 'K_INFO'
}

@Schema()
export class KeywordType {

  @Prop({ type: SchemaTypes.String, unique: true })
  name: string;

  @Prop({type: SchemaTypes.String, enum: Type})
  type: Type;

  @Prop({ type: SchemaTypes.Mixed, ref: ProgramV2.name, default: null})
  program: ProgramV2 | null;

  @Prop({ type: SchemaTypes.Mixed, ref: Keyword.name, default: null})
  keyword: Keyword | null;

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
    name: string,
    type: Type,
    program?: ProgramV2 | null,
    keyword?: Keyword | null
  ) {
    this.name = name;
    this.type = type;
    this.program = program;
    this.keyword = keyword;
  }
}

export const KeywordTypeSchema = SchemaFactory.createForClass(KeywordType);
export const KeywordTypeEnum = Type;

