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
  poin_owner: PointOwner[];

  @Prop()
  poin_owner_telco: PointOwner[];

  @Prop()
  poin_owner_indihome: PointOwner[];

  @Prop()
  point_owner: PointOwner[]; //rescue old data

  @Prop()
  point_owner_telco: PointOwner[];

  @Prop()
  point_owner_indihome: PointOwner[];

  @Prop()
  gross_revenue: GrossRevenue[];

  @Prop()
  gross_revenue_telco: GrossRevenue[];

  @Prop()
  gross_revenue_indihome: GrossRevenue[];

  @Prop()
  poin_earned: PoinEarned[];

  @Prop()
  poin_earned_telco: PoinEarned[];

  @Prop()
  poin_earned_indihome: PoinEarned[];

  @Prop()
  redeemer_existing: RedeemerExisting[];

  @Prop()
  redeemer_existing_telco: RedeemerExisting[];

  @Prop()
  redeemer_existing_indihome: RedeemerExisting[];

  @Prop()
  reward_live_system: RewardLiveSystem[];

  @Prop()
  reward_trx: RewardTransaction[];

  @Prop()
  program: Program[];

  @Prop()
  redeemer: Redeemer[];

  @Prop()
  redeemer_telco: Redeemer[];

  @Prop()
  redeemer_indihome: Redeemer[];

  @Prop()
  gross_revenue_redeemer: GrossRevenueRedeemer[];

  @Prop()
  gross_revenue_redeemer_telco: GrossRevenueRedeemer[];

  @Prop()
  gross_revenue_redeemer_indihome: GrossRevenueRedeemer[];

  @Prop()
  poin_earned_redeemer: PoinEarnedRedeemer[];

  @Prop()
  poin_earned_redeemer_telco: PoinEarnedRedeemer[];

  @Prop()
  poin_earned_redeemer_indihome: PoinEarnedRedeemer[];

  @Prop()
  poin_burning: PoinBurning[];

  @Prop()
  poin_burning_telco: PoinBurning[];

  @Prop()
  poin_burning_indihome: PoinBurning[];

  @Prop()
  point_burning: PoinBurning[]; //rescue old data

  @Prop()
  point_burning_telco: PoinBurning[];

  @Prop()
  point_burning_indihome: PoinBurning[];

  @Prop()
  trx_burn: TrxBurn[];

  @Prop()
  trx_burn_telco: TrxBurn[];

  @Prop()
  trx_burn_indihome: TrxBurn[];

  @Prop()
  redeemer_mytelkomsel: RedeemerMyTelkomsel[];

  @Prop()
  redeemer_mytelkomsel_telco: RedeemerMyTelkomsel[];

  @Prop()
  redeemer_mytelkomsel_indihome: RedeemerMyTelkomsel[];

  @Prop()
  gross_revenue_redeemer_mytelkomsel: GrossRevenueRedeemerMyTelkomsel[];

  @Prop()
  gross_revenue_redeemer_mytelkomsel_telco: GrossRevenueRedeemerMyTelkomsel[];

  @Prop()
  gross_revenue_redeemer_mytelkomsel_indihome: GrossRevenueRedeemerMyTelkomsel[];

  @Prop()
  poin_earned_redeemer_mytelkomsel: PoinEarnedRedeemerMyTelkomsel[];

  @Prop()
  poin_earned_redeemer_mytelkomsel_telco: PoinEarnedRedeemerMyTelkomsel[];

  @Prop()
  poin_earned_redeemer_mytelkomsel_indihome: PoinEarnedRedeemerMyTelkomsel[];

  @Prop()
  poin_burning_mytelkomsel: PoinBurningMyTelkomsel[];

  @Prop()
  poin_burning_mytelkomsel_telco: PoinBurningMyTelkomsel[];

  @Prop()
  poin_burning_mytelkomsel_indihome: PoinBurningMyTelkomsel[];

  @Prop()
  trx_burn_mytelkomsel: TrxBurnMyTelkomsel[];

  @Prop()
  trx_burn_mytelkomsel_telco: TrxBurnMyTelkomsel[];

  @Prop()
  trx_burn_mytelkomsel_indihome: TrxBurnMyTelkomsel[];
}

export type ReportMonitoringDocument = ReportMonitoring & Document;
export const ReportMonitoringSchema =
  SchemaFactory.createForClass(ReportMonitoring);
