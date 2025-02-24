import { TransactionErrorMsgResp } from '@/dtos/property.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiParamRedeemVoucherCode } from './voucher.property.dto';

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
    required: false,
    type: String,
  })
  @IsString()
  exp_voucher: string;

  @ApiProperty({
    required: true,
    enum: ['Generate', 'Upload'],
    type: String,
  })
  @IsString()
  voucher_type: string;

  @ApiProperty({
    required: true,
    name: 'Voucher ID',
    type: String,
  })
  @IsString()
  id: string;

  @ApiProperty({
    required: true,
    name: 'keyword id',
    type: String,
  })
  @IsString()
  keyword_id: string;

  @ApiProperty({
    required: true,
    name: 'keyword name',
    type: String,
  })
  @IsString()
  keyword_name: string;

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

  @ApiProperty({
    required: false,
    name: 'merchant_id',
    type: String,
  })
  @IsString()
  merchant_id: string;

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

  
  @ApiProperty({ required: false, type: String, enum: ['Alphanumeric', 'Alphabet', 'Numeric'] })
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

  @ApiProperty({ required: false, type: String, enum: ['Active','Inactive','Redeem'] })
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
    type: Number,
    name: 'current_stock',
  })
  @IsNumberString()
  current_stock: number;

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

export class GetMsisdnRedeemerByVoucherCodeParamDTO {
  @ApiProperty(ApiParamRedeemVoucherCode.voucher_code)
  @MinLength(1)
  @IsString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.voucher_code,
  })
  voucher_code: string;
}

export class VoucherTaskResultDTO {
  total_record? : number;
  total_success? : number;
  total_fail? : number;
}

export class CheckStockVoucherImportOrBatchDTO{
  stock? : number|string;
  accumulated_stock? : number|string;
  remaining_stock? : number|string;
  status? : boolean;
  status_task?: string; 
  status_fulfillment?: boolean; 
  total_fail?: number|string;
  desc?:string;
}

export class AccumulateVoucherDTO{
  status? : boolean;
  in_progress? : boolean;
  message? : string;
  desc? : any;
  data? : any;
  constructor(data: any) {
    this.status = data?.status ?? false;
    this.in_progress = data?.in_progress ?? false;
    this.message = data?.message ?? 'Failed';
    this.desc = data?.desc ?? '-';
    this.data = data?.data ?? null;
  }
}
