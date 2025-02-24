import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { Types } from 'mongoose';

export class BidAddDTO {
  @ApiProperty({
    required: true,
    description: 'External Product ID',
    example: 'xxx',
  })
  @IsNotEmpty()
  @IsString()
  external_product_id: string;

  @ApiProperty({
    required: true,
    description: 'Point',
    example: 100,
  })
  @IsNumber()
  point: number;

  @ApiProperty({
    required: false,
    description: '[LOV] POINT_TYPE (ID)',
    example: '62ffc1d68a01008799e785cb',
  })
  @IsString()
  @IsMongoId()
  point_type: Types.ObjectId;

  @ApiProperty({
    required: true,
    description: 'Keyword (ID)',
    example: '6390452fd7f6364b880cc9ad',
  })
  @IsString()
  @IsMongoId()
  keyword: Types.ObjectId;

  @ApiProperty({
    required: true,
    description: 'Contract',
    example: 12,
  })
  @IsNumber()
  contract: number;

  @ApiProperty({
    required: false,
    description: 'Status',
    example: 'Complete',
  })
  @IsString()
  status: string;

  @ApiProperty({
    required: false,
    description: 'Tracing ID',
    example: 'xxx',
  })
  @IsNotEmpty()
  @IsString()
  tracing_id: string;

  @ApiProperty({
    required: false,
    description: 'Tracing Inject',
    example: 'xxx',
  })
  @IsNotEmpty()
  @IsString()
  tracing_inject: string;

  // New Fields
  @ApiProperty({
    required: true,
    description: 'Type of Bid',
    example: 'Amount',
  })
  @IsString()
  type: string;

  @ApiProperty({
    required: true,
    description: 'Start Date',
    example: '2024-10-13T20:58:34.000Z',
  })
  @IsDateString()
  start_date: Date;

  @ApiProperty({
    required: true,
    description: 'End Date',
    example: '2024-10-14T08:59:41.151Z',
  })
  @IsDateString()
  end_date: Date;

  @ApiProperty({
    required: true,
    description: 'Tier Multiplier',
    example: true,
  })
  @IsBoolean()
  tier_multiplier: boolean;

  @ApiProperty({
    required: true,
    description: 'Special Multiplier',
    example: true,
  })
  @IsBoolean()
  special_multiplier: boolean;

  @ApiProperty({
    required: false,
    description: 'Special Multiplier Value',
    example: 1,
  })
  @IsNumber()
  special_multiplier_value = 1;

  @ApiProperty({
    required: true,
    description: 'Default Earning',
    example: true,
  })
  @IsBoolean()
  default_earning: boolean;

  @ApiProperty({
    required: false,
    description: 'Status',
    example: 'KEY01',
  })
  @IsString()
  keyword_name: string;
}

export class BidAddDTOResponse {
  @ApiProperty({ example: 'LOCATION_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'Success' })
  @IsString()
  message: string;

  payload: any;
}
