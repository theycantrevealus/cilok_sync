import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsString } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';

import { Program } from '@/program/models/program.model';

export type ReportUniqueChannelTrendsSystemDocument =
  ReportUniqueChannelTrendsSystem & Document;

@Schema({
  collection: 'report_trend_channel_redeemer_reporting',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class ReportUniqueChannelTrendsSystem {
  @ApiProperty({
    description: 'Parent Program (Object ID)',
    default: '635a73b81125eba1458719c7',
    type: Types.ObjectId,
  })
  @Prop({ type: SchemaTypes.ObjectId, ref: Program.name })
  @IsMongoId()
  program: Types.ObjectId;

  @ApiProperty({
    description: 'Channel name',
    default: 'A0-RM',
    type: String,
  })
  @Prop({ type: SchemaTypes.String })
  @IsMongoId()
  channel: string;

  @ApiProperty({
    description: 'Misdn',
    default: 6287722075872,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  msisdn: number;

  @ApiProperty({
    description: 'Total redeeem',
    default: 6287722075872,
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  total_redeem: number;

  @ApiProperty({
    required: true,
    type: String,
    example: '2023-03-07',
    description: 'Report start date from > 10.00 AM',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  report_start: string;

  @ApiProperty({
    required: true,
    type: String,
    example: '2023-03-08',
    description: 'Report end date <= 10.00 AM',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String })
  report_end: string;
}

export const ReportUniqueChannelTrendsSystemSchema =
  SchemaFactory.createForClass(ReportUniqueChannelTrendsSystem);
