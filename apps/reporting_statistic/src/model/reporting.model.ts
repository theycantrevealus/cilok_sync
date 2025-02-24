import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

import {
  GrossRevenue,
  GrossRevenueRedeemer,
  GrossRevenueRedeemerMyTelkomsel,
  PoinBurning,
  PoinBurningMyTelkomsel,
  PoinEarned,
  PoinEarnedRedeemer,
  PoinEarnedRedeemerMyTelkomsel,
  PointOwner,
  Program,
  Redeemer,
  RedeemerExisting,
  RedeemerMyTelkomsel,
  RewardLiveSystem,
  RewardTransaction,
  TrxBurn,
  TrxBurnMyTelkomsel,
} from './reporting.types';

@Schema({
  collection: 'report_monitoring_transaction_point',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class ReportMonitoring {
  @ApiProperty({
    example: new Date().toISOString(),
    description:
      'Start Period. If not set. will follow eligibility start period',
  })
  @Prop({ type: SchemaTypes.Date })
  @Type(() => Date)
  @IsDate()
  period: Date;

  @Prop()
  point_owner: PointOwner[];

  @Prop()
  gross_revenue: GrossRevenue[];

  @Prop()
  poin_earned: PoinEarned[];

  @Prop()
  redeemer_existing: RedeemerExisting[];

  @Prop()
  reward_live_system: RewardLiveSystem[];

  @Prop()
  reward_trx: RewardTransaction[];

  @Prop()
  program: Program[];

  @Prop()
  redeemer: Redeemer[];

  @Prop()
  gross_revenue_redeemer: GrossRevenueRedeemer[];

  @Prop()
  poin_earned_redeemer: PoinEarnedRedeemer[];

  @Prop()
  point_burning: PoinBurning[];

  @Prop()
  trx_burn: TrxBurn[];

  @Prop()
  redeemer_mytelkomsel: RedeemerMyTelkomsel[];

  @Prop()
  gross_revenue_redeemer_mytelkomsel: GrossRevenueRedeemerMyTelkomsel[];

  @Prop()
  poin_earned_redeemer_mytelkomsel: PoinEarnedRedeemerMyTelkomsel[];

  @Prop()
  poin_burning_mytelkomsel: PoinBurningMyTelkomsel[];

  @Prop()
  trx_burn_mytelkomsel: TrxBurnMyTelkomsel[];
}

export type ReportMonitoringDocument = ReportMonitoring & Document;
export const ReportMonitoringSchema =
  SchemaFactory.createForClass(ReportMonitoring);
