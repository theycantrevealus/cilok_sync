import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { ProgramV2 } from '@/program/models/program.model.v2';

export type MaxRedeemThresholdsDocument = MaxRedeemThresholds & Document;

@Schema({ collection: 'max_redeem_thresholds' })
export class MaxRedeemThresholds {
  @ApiProperty({
    example: '65a4b366cd115b76d3e81e2d',
    description: 'Id Keyword',
  })
  @IsOptional()
  @IsString()
  @Prop({
    index: true,
    isRequired: true,
    type: SchemaTypes.String,
    unique: true,
  }) // Menandai properti sebagai unique
  keyword_id: string;

  @ApiProperty({
    example: '65a4b366cd115b76d3e81e2d',
    description: 'Id Program',
  })
  @IsOptional()
  @IsString()
  @Prop({
    index: true,
    isRequired: true,
    type: String,
  }) // Menandai properti sebagai unique
  program: string;

  @ApiProperty({
    example: '65a4b366cd115b76d3e81e2d',
    description: 'max_mode',
  })
  @IsOptional()
  @IsString()
  @Prop({
    index: true,
    isRequired: true,
    type: SchemaTypes.String,
  }) // Menandai properti sebagai unique
  max_mode: string;

  @ApiProperty({
    example: 'KEY01',
    description: 'Name Keyword',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String, unique: true }) // Menandai properti sebagai unique
  keyword: string;

  @ApiProperty({
    example: 'MONTHLY',
    description: 'Type max redeem treshold',
  })
  @IsOptional()
  @IsString()
  @Prop({ type: SchemaTypes.String })
  type: string;

  @ApiProperty({
    example: ['11', '15'],
    description: 'Date max redeem treshold',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsString({ each: true })
  @Prop({ type: [SchemaTypes.String], default: [] })
  date: string[];

  @ApiProperty({
    example: ['01', '17'],
    description: 'Time max redeem treshold',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsString({ each: true })
  @Prop({ type: [SchemaTypes.String], default: [] })
  time: string[];

  @ApiProperty({
    example: '2022-10-01',
    description: 'Date of start period',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  start_date: string;

  @ApiProperty({
    example: '2022-12-29',
    description: 'Date of end period',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  end_date: string;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;
}

export const MaxRedeemThresholdsSchema =
  SchemaFactory.createForClass(MaxRedeemThresholds);
MaxRedeemThresholdsSchema.index({ deleted_at: 1 });
