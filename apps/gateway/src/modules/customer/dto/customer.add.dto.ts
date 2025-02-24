import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

import { CustomerBrand } from '../models/customer.brand.model';
import { CustomerTier } from '../models/customer.tier.model';

export class CustomerAddDTO {
  @ApiProperty({
    uniqueItems: true,
    required: true,
    example: '6852xxxx',
  })
  @IsString()
  msisdn: string;

  @ApiProperty({
    example: 'YYYY-MM-DD',
  })
  @IsString()
  activation_date: string;

  @ApiProperty({
    example: 'YYYY-MM-DD',
  })
  @IsString()
  last_redeemed_date: string;

  @ApiProperty({
    example: 'YYYY-MM-DD',
  })
  @IsString()
  expire_date: string;

  @ApiProperty({
    example: '',
  })
  @IsNumber()
  los: number;

  @ApiProperty({
    example: 'TBC',
  })
  @IsString()
  rev_m1: string;

  @ApiProperty({
    example: 'tier_id',
    description: 'Tier ID',
  })
  @IsString()
  loyalty_tier: CustomerTier;

  @ApiProperty({
    example: 'brand_id',
    description: 'Brand ID',
    required: false,
  })
  @IsString()
  brand: CustomerBrand;

  @ApiProperty({
    example: 0,
    description: 'Average Revenue Per Unit',
  })
  @IsNumber()
  arpu: number;

  @ApiProperty({
    example: '09',
    description: '2 digits Date of Birth',
  })
  @IsString()
  nik_dob: string;

  @ApiProperty({
    example: 'INDONESIA',
    description: 'Region Name',
  })
  @IsString()
  nik_rgn_name: string;

  @ApiProperty({
    example: 'xxx',
    description: 'LACCI',
  })
  @IsString()
  region_lacci: string;

  @ApiProperty({
    example: 'MEDAN',
    description: 'City Name',
  })
  @IsString()
  cty_nme: string;

  @ApiProperty({
    example: 'SUMATERA UTARA',
    description: 'Regency Name',
  })
  @IsString()
  kabupaten: string;

  @ApiProperty({
    example: 'MEDAN TUNTUNGAN',
    description: 'District Name',
  })
  @IsString()
  kecamatan: string;

  @ApiProperty({
    example: '',
    description: 'Cluster Sales',
  })
  @IsString()
  cluster_sales: string;

  @ApiProperty({
    example: '',
    required: false,
    description: 'Core Integration',
  })
  @IsString()
  core_id: string;

  @ApiProperty({
    example: '1',
    description: 'PrePaid or PostPaid. 0 = Prepaid, 1 = PostPaid',
  })
  @IsNumber()
  pre_pst_flag: string;

  constructor(data: any) {
    this.core_id = data.core_id;
    this.msisdn = data.msisdn;
    this.activation_date = data.activation_date;
    this.expire_date = data.expire_date;
    this.last_redeemed_date = data.last_redeemed_date;
    this.los = data.los;
    this.rev_m1 = data.rev_m1;
    this.loyalty_tier = data.loyalty_tier;
    this.brand = data.brand;
    this.arpu = data.arpu;
    this.nik_dob = data.nik_dob;
    this.nik_rgn_name = data.nik_rgn_name;
    this.region_lacci = data.region_lacci;
    this.cty_nme = data.cty_nme;
    this.kabupaten = data.kabupaten;
    this.kecamatan = data.kecamatan;
    this.cluster_sales = data.cluster_sales;
    this.pre_pst_flag = data.pre_pst_flag;
  }
}

export class CustomerAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CUSTOMER_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
