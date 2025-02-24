import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class VoucherListQuery {
  @ApiProperty({
    description: `Voucher Status : Redeem ( R ) or Verified ( V )</br>If variable not send, will return both redeem and verified voucher`,
    required: false,
  })
  @IsString()
  voucher_status: string;

  @ApiProperty({
    description: 'Limit record, default is last 5 records ( configurable )',
    required: false,
  })
  @IsNumber()
  limit: number;

  @ApiProperty({
    description: 'Offset data, will start record after specified value.',
    required: false,
  })
  @IsNumber()
  skip: number;

  @ApiProperty({
    description: 'Start date with format YYYY-MM-DD',
    required: false,
  })
  @IsString()
  from: string;

  @ApiProperty({
    description: 'End date with format YYYY-MM-DD',
    required: false,
  })
  @IsString()
  to: string;

  @ApiProperty({
    description: 'Channel transaction id',
    required: false,
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    description: 'Channel information from source application',
    required: false,
  })
  @IsString()
  channel_id: string;

  @ApiProperty({
    description:
      'Return only data matching to filter</br>{ "code": "X", "name": "Y" }',
    required: false,
  })
  @IsString()
  filter: string;

  @ApiProperty({
    description:
      'Additional parameter if needed, with format :</br>{ "code": "X", "name": "Y" }',
    required: false,
  })
  @IsString()
  additional_param: string;
}

export class VoucherListRequestDto {
  /**
   * msisdn is a path or params
   */
  @IsString()
  msisdn: string;

  /**
   * query is a object for query params
   */
  @Type(() => VoucherListQuery)
  query: VoucherListQuery;

  /**
   * token is bearer token to request core api
   */
  @IsString()
  token: string;
}
