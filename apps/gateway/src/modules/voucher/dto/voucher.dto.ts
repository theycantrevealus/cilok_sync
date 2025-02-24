import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsNumberString,
  IsString,
} from 'class-validator';

export class VoucherDTO {
  @ApiProperty({
    required: false,
    example: 'en-US',
    name: 'locale',
    type: String,
    description: 'en-US',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    required: true,
    enum: ['General', 'Upload'],
    type: String,
  })
  @IsString()
  voucher_type: string;

  @ApiProperty({
    required: true,
    name: 'keyword',
    type: String,
  })
  @IsString()
  keyword: string;

  @ApiProperty({
    required: true,
    name: 'location',
    type: String,
  })
  @IsString()
  location: string;

  @ApiProperty({
    required: false,
    name: 'merchant',
    type: String,
  })
  @IsString()
  merchant: string;

  @ApiProperty({ required: false, type: String, enum: ['stock', 'non stock'] })
  @IsString()
  type: string;

  @ApiProperty({
    required: false,
    type: String,
    name: 'code',
  })
  @IsString()
  code: string;

  @ApiProperty({
    required: false,
    type: String,
    name: 'prefix',
  })
  @IsString()
  prefix: string;

  @ApiProperty({
    required: false,
    type: String,
    name: 'suffix',
  })
  @IsString()
  suffix: string;

  @ApiProperty({
    required: false,
    type: String,
    name: 'combination',
  })
  @IsString()
  combination: string;

  @ApiProperty({
    required: false,
    type: Number,
    name: 'digit_length',
  })
  @IsNumberString()
  digit_length: number;

  @ApiProperty({
    required: false,
    type: String,
    name: 'batch_no',
  })
  @IsString()
  batch_no: string;

  @ApiProperty({
    required: false,
    type: String,
    name: 'desc',
  })
  @IsString()
  desc: string;

  @ApiProperty({
    required: false,
    type: String,
    name: 'keyword_verification',
  })
  @IsString()
  keyword_verification: string;

  @ApiProperty({ required: false, type: String, enum: ['new', 'expired', 'redeemed'] })
  @IsString()
  status: string;
  

  @ApiProperty({
    required: false,
    type: Number,
    name: 'stock',
  })
  @IsNumberString()
  stock: number;

  @ApiProperty({
    required: false,
    type: Date,
    name: 'start_time',
    example: '2022-12-31T00:00:00.000Z',
  })
  @IsDateString()
  start_time: Date;

  @ApiProperty({
    required: false,
    type: Date,
    name: 'end_time',
    example: '2022-12-31T00:00:00.000Z',
  })
  @IsDateString()
  end_time: Date;

  @ApiProperty({ required: false, type: String, format: 'binary' })
  file: any;

  constructor(
    data: any
  ) {
    this.locale = data.locale
    this.voucher_type = data.voucher_type
    this.keyword = data.keyword
    this.location = data.location
    this.merchant = data.merchant
    this.type = data.type
    this.code = data.code
    this.prefix = data.prefix
    this.suffix = data.suffix
    this.combination = data.combination
    this.digit_length = data.digit_length
    this.batch_no = data.batch_no
    this.desc = data.desc
    this.keyword_verification = data.keyword_verification
    this.status = data.status
    this.start_time = data.start_time
    this.end_time = data.end_time
    this.file = data.file
  }
}

export class VoucherDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  code: string;

  @ApiProperty({ example: 'Voucher Creation' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Voucher Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
