import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class LifetimeValue {
  @ApiProperty({
    example: 57890,
    description: 'Duration',
  })
  @IsString()
  duration: number;

  @ApiProperty({
    example: 0,
    description: 'Total Reward',
  })
  @IsString()
  total_reword: number;
}

export class MsisdnCheckerDTO {
  @ApiProperty({
    example: '0891234567',
    description: 'Phone Number',
  })
  @IsString()
  phone: string;
}

export class CustomerMemberDto {
  @ApiProperty({
    example: 'en-US',
    description: 'Locale',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    example: 'Mr.',
    description: 'Application',
  })
  @IsString()
  channel: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  @IsString()
  @IsOptional()
  tier_id?: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  @IsString()
  @IsOptional()
  tier?: string;

  @ApiProperty({
    example: 'Mr.',
    description: 'First Name',
  })
  @IsString()
  firstname: string;

  @ApiProperty({
    example: 'Anonymous',
    description: 'Last Name',
  })
  @IsString()
  lastname: string;

  @ApiProperty({
    example: 'Anonymous',
    description: 'Nickname',
  })
  @IsString()
  nickname: string;

  @ApiProperty({
    example: 'Male',
    description: 'gender',
  })
  @IsString()
  gender: string;

  @ApiProperty({
    example: '0891234567|TH|+66',
    description: 'Contact number',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'anonymous@xyz.com',
    description: 'Email',
  })
  @IsString()
  email: string;

  @ApiProperty({
    example: '2012-12-31',
    description: 'Birth Date',
  })
  @IsString()
  birthdate: string;

  @ApiProperty({
    example: 'xxxxxx-5902ca0b0257bb14df426921',
    description: 'Merchant Id',
  })
  @IsString()
  merchant_id: string;

  @ApiProperty({
    example: 'Active',
    enum: ['Active', 'Unactive'],
    description: 'Account status',
  })
  @IsString()
  status: string;

  @ApiProperty({
    example: 'xxxxxx-5902ca0b0257bb14df426921',
    description: 'Realm Id',
  })
  @IsString()
  realm_id: string;

  @ApiProperty({
    example: 'xxxxxx-5902ca0b0257bb14df426921',
    description: 'Branch Id',
  })
  @IsString()
  branch_id: string;

  @ApiProperty({
    example: 'INDIHOME',
    description: 'brand',
  })
  @IsString()
  brand?: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  @IsString()
  ownership_flag?: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  @IsString()
  binding_date?: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  @IsString()
  binding_level?: number;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  @IsString()
  tsel_tier?: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  @IsString()
  tsel_id?: string;

  @ApiProperty({
    example: '',
    description: '',
    required: false,
  })
  @IsString()
  tsel_tier_id?: string;
}

export class CustomerMemberAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'MEMBER_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Member Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
