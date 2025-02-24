import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Keyword } from '@/keyword/models/keyword.model';
import { Program } from '@/program/models/program.model';

export type ReportProgramHistoryDocument = ReportProgramHistory & Document;

class KeywordList {
  @ApiProperty({
    description: 'Keyword (Object ID)',
    default: '635a73b81125eba1458719c7',
    type: Types.ObjectId,
  })
  @Prop({ type: SchemaTypes.ObjectId, ref: Keyword.name })
  @IsMongoId()
  keyword: Types.ObjectId;

  @Prop()
  bonus_type: string;
}

@Schema({
  collection: 'report_program_history',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class ReportProgramHistory {
  @ApiProperty({
    required: true,
    type: String,
    example: '2022-12-13',
    description: 'Period of record',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  period: string;

  @ApiProperty({
    description: 'Program (Object ID)',
    default: '635a73b81125eba1458719c7',
    type: Types.ObjectId,
  })
  @Prop({ type: SchemaTypes.ObjectId, ref: Program.name })
  @IsMongoId()
  program: Types.ObjectId;

  @Prop()
  keyword_list: KeywordList[];
}

export const ReportProgramHistorySchema =
  SchemaFactory.createForClass(ReportProgramHistory);
