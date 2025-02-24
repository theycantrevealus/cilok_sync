import { Prop } from '@nestjs/mongoose';

export class PointOwner {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class GrossRevenue {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class PoinEarned {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class RedeemerExisting {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;
}

export class RewardLiveSystem {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  merchant: number;

  @Prop()
  keyword: number;
}

export class RewardTransaction {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  merchant: number;

  @Prop()
  keyword: number;
}

export class Program {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  program: number;

  @Prop()
  keyword: number;
}

export class Redeemer {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class GrossRevenueRedeemer {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class PoinEarnedRedeemer {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class PoinBurning {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  point_burning: number;

  @Prop()
  month_to_date: number;

  @Prop()
  year_to_date: number;
}

export class TrxBurn {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class RedeemerMyTelkomsel {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class GrossRevenueRedeemerMyTelkomsel {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class PoinEarnedRedeemerMyTelkomsel {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class PoinBurningMyTelkomsel {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}

export class TrxBurnMyTelkomsel {
  @Prop()
  name: string;

  @Prop()
  period: string;

  @Prop()
  year_to_date: number;

  @Prop()
  month_to_date: number;
}
