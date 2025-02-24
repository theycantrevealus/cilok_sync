import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

export type ReportUniqueRewardLiveSystemDocument =
  ReportUniqueRewardLiveSystem & Document;

@Schema({
  collection: 'report_reward_live_system',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class ReportUniqueRewardLiveSystem {
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
    required: true,
    enum: ['Merchant', 'Keyword'],
    type: String,
    description: 'Type',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: true })
  type: string;

  @ApiProperty({
    required: false,
    example: '',
    type: String,
    description: 'Keyword ID. Eg: 63a007e696288302f500a4cb',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  keyword: string;

  @ApiProperty({
    required: false,
    example: '',
    type: String,
    description: 'Merchant ID. Eg: 63a007e696288302f500a4cb',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  merchant: string;
}

export const ReportUniqueRewardLiveSystemSchema = SchemaFactory.createForClass(
  ReportUniqueRewardLiveSystem,
);
