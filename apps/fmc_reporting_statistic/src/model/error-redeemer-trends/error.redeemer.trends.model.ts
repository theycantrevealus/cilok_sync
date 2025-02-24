import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

export type ReportErrorRedeemerTrendsDocument = ReportErrorRedeemerTrends &
  Document;

@Schema({
  collection: 'report_trend_error_redeem_transaction',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class ReportErrorRedeemerTrends {
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
    example: 'KEYWORDNAME',
    type: String,
    description: 'Keyword Name',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: true })
  keyword: string;

  @ApiProperty({
    required: true,
    example: 'SYSTEM_SIBUK',
    type: String,
    description: 'Log Event',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: true })
  log_event: string;

  @ApiProperty({
    required: false,
    example: 'String Notifikasi',
    type: String,
    description: 'Mohon maaf, sistem sedang sibuk',
  })
  @IsString()
  @Prop({ type: SchemaTypes.String, required: false })
  notification_message: string;

  @ApiProperty({
    required: false,
    default: 1,
    type: Number,
    description: 'Total error redeem transactions.',
  })
  @Prop({ type: SchemaTypes.Number, required: false })
  @IsNumber()
  total: number;
}

export const ReportErrorRedeemerTrendsSchema = SchemaFactory.createForClass(
  ReportErrorRedeemerTrends,
);
