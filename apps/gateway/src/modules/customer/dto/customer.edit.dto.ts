import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

import { CustomerBrand } from '../models/customer.brand.model';
import { CustomerTier } from '../models/customer.tier.model';

export class CustomerEditDTO {
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
  expire_date: string;

  @ApiProperty({
    example: 'YYYY-MM-DD',
  })
  @IsString()
  last_redeemed_date: string;

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
    example: '1',
    description: 'PrePaid or PostPaid. 0 = Prepaid, 1 = PostPaid',
  })
  @IsNumber()
  pre_pst_flag: string;
}

export class CustomerEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CUSTOMER_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
