import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';

export class VoucherResponse {
  @ApiProperty({
    description: 'Channel transaction id.',
    required: false,
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    description: 'Trasaction of Redeem Voucher ex. 2022-12-22T16:59:59.999Z',
    required: false,
  })
  @IsString()
  redeemed_date: string;

  @ApiProperty({
    description: 'Keyword.',
    required: false,
  })
  @IsString()
  keyword_redeem: string;

  @ApiProperty({
    description: 'Voucher code.',
    required: false,
  })
  @IsString()
  voucher_code: string;

  @ApiProperty({
    description:
      'Voucher status, please refer to section Voucher Status at the last pages.',
    required: false,
  })
  @IsString()
  voucher_status: string;

  @ApiProperty({
    description: 'Voucher expired date ex. 2022-12-22T16:59:59.999Z',
    required: false,
  })
  @IsString()
  expired_date: string;

  @ApiProperty({
    description:
      'Voucher verified date, with format : 2022-12-22T16:59:59.999Z',
    required: false,
  })
  @IsString()
  verified_date: string;

  @ApiProperty({
    description: 'Voucher Description',
    required: false,
  })
  @IsString()
  voucher_desc: string;
}

export class VoucherListResponsePayload {
  @ApiProperty({
    description: 'Information of Total Record.',
    required: false,
  })
  @IsNumber()
  total_record: number;

  @ApiProperty({
    description: 'Total page based on query result.',
    required: false,
  })
  @IsNumber()
  page_size: number;

  @ApiProperty({
    description: 'Current page number.',
    required: false,
  })
  @IsNumber()
  page_number: number;

  @ApiProperty({
    description: 'Information of query result',
    required: false,
    isArray: true,
    type: VoucherResponse,
  })
  @Type(() => VoucherResponse)
  list_of_voucher: VoucherResponse[];
}

export class VoucherListResponseDto extends GlobalTransactionResponse {
  @ApiProperty({
    type: VoucherListResponsePayload,
  })
  @Type(() => VoucherListResponsePayload)
  payload: VoucherListResponsePayload;
}
