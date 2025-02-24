import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MerchantAddDTO {
  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  partner_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  partner_code: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  company_name: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  siup_number: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  province_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  city_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  zip_code: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  address: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  file_compro: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  pic_name: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  pic_phone: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  pic_role_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  pic_role: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  pic_email: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  jangkauan_outlet: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  outlet_provice_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  outlet_province_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  outlet_iml: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  partner_status: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  password: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  source_created_at: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  nat_loc: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  merchant_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  approver_1: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  approver_2: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  status_desc_1: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  status_desc_2: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  approver_1_status: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  approver_2_status: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  approver_date_1: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  approver_date_2: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  npwp: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  poin_created_by: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  is_visible: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  branch: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  ktp: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  pic_ktp: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  bank_name: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  bank_account_name: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  bank_account_number: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  apps_name: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  channel: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  id_business_type_1: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  id_business_type_2: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  callback_url: string;

  @ApiProperty({
    required: false,
    example: '',
    description: '',
  })
  @IsString()
  origin_data: string;
}

export class MerchantBulkDTO {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}

export class MerchantAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'MERCHANT_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Merchant Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
