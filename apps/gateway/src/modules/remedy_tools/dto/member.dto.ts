import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsString } from 'class-validator';

class Current {
  @ApiProperty({
    type: String,
  })
  @IsString()
  id: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  name: string;
}

class Tier {
  @ApiProperty({
    type: Current,
  })
  @IsObject()
  current: Current;
}

// Accum Section
class Reward {
  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  total_amount: number;

  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  total_transaction: number;
}

class Earn {
  @ApiProperty({
    type: Reward,
  })
  @IsObject()
  reward: Reward;
}

class Redeem {
  @ApiProperty({
    type: Reward,
  })
  @IsObject()
  reward: Reward;
}

class Payment {
  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  total_earn: number;

  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  total_payment: number;

  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  total_transaction: number;
  total_revenue?: any;
}

class Postpaid {
  @ApiProperty({
    type: Payment,
    required: false,
  })
  @IsObject()
  payment: Payment;
}

class Prepaid {
  @ApiProperty({
    type: Payment,
    required: false,
  })
  @IsObject()
  payment: Payment;
}

class Accum {
  earn?: Earn;
  redeem?: Redeem;
  postpaid?: Postpaid;
  prepaid?: Prepaid;

  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  total_payment: number;

  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  total_earn: number;

  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  total_redeem: number;
}
// End Accum Section

class LifetimeValue {
  duration: number;
  remaining_reward: number;
  total_transaction: number;
  total_revenue: number;
  total_outstanding: number;
  total_qty: number;
  total_reward: any;
}

export class MemberDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  id: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  type: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  code: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  firstname: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  lastname: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  nickname: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  gender: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  phone: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  email: string;

  @ApiProperty({
    type: Object,
  })
  @IsObject()
  i18n: any;

  @ApiProperty({
    type: String,
  })
  @IsString()
  status: string;

  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  __v: number;

  @ApiProperty({
    type: String,
  })
  @IsString()
  tier_id: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  last_earn_time: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  last_redeem_time: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  area_sales: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  kabupaten: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  region_sales: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  brand: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  nik_registration_status: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  member_type: string;

  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  arpu: number;

  @ApiProperty({
    type: String,
  })
  @IsString()
  telkomsel_employee: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  cluster_sales: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  kecamatan: string;

  @ApiProperty({
    type: Number,
  })
  @IsNumber()
  los: number;

  @ApiProperty({
    type: Tier,
  })
  @IsObject()
  tier: Tier;

  @ApiProperty({
    type: Accum,
  })
  @IsObject()
  accum: Accum;

  @ApiProperty({
    type: LifetimeValue,
  })
  @IsObject()
  lifetime_value: LifetimeValue;

  @ApiProperty({
    type: String,
  })
  @IsString()
  last_transaction_time: string;

  calculateTotalPayment() {
    const total_prepaid = this.accum.prepaid
      ? this.accum.prepaid.payment?.total_payment ?? 0
      : 0;
    const total_postpaid = this.accum.postpaid
      ? this.accum.postpaid.payment?.total_payment ?? 0
      : 0;

    /*
    ini perhitungan total payment tahun berjalan saja
    const total_prepaid = this.accum.prepaid
      ? this.getTotalCurrentYear(this.accum.prepaid.payment?.total_revenue) ?? 0
      : 0;
    const total_postpaid = this.accum.postpaid
      ? this.getTotalCurrentYear(this.accum.postpaid.payment?.total_revenue) ??
        0
      : 0;
    */
    this.accum.total_payment = total_postpaid + total_prepaid;

    return this;
  }

  calculateTotalEarn() {
    const total_prepaid_earn = this.accum.prepaid
      ? this.accum.prepaid.payment?.total_earn ?? 0
      : 0;
    const total_postpaid_eran = this.accum.postpaid
      ? this.accum.postpaid.payment?.total_earn ?? 0
      : 0;
    const total_payment = total_prepaid_earn + total_postpaid_eran;
    //const total_payment = Math.floor(this.accum.total_payment / 10000) * 4;
    const total_reward = this.accum.earn?.reward
      ? this.accum.earn?.reward?.total_amount ?? 0
      : 0;
    this.accum.total_earn = total_payment + total_reward;

    return this;
  }

  calculateTotalRedeem() {
    this.accum.total_redeem = this.accum?.redeem
      ? this.accum.redeem?.reward?.total_amount ?? 0
      : 0;
    return this;
  }

  calculateAccum() {
    this.calculateTotalPayment().calculateTotalEarn().calculateTotalRedeem();
    return this;
  }

  getTotalCurrentYear(data) {
    let total = 0;
    const currentYear = new Date().getFullYear();
    for (const property in data) {
      if (data[property].year == currentYear) {
        total += data[property].value;
      }
    }
    return total;
  }
}
