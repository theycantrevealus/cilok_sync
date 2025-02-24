import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, Length } from 'class-validator';

import { SetConfigDTOResponse } from '@/application/dto/set.config.dto';

import { EsbRedeemCallbackResponse } from './esb.redeem.callback.response';

export class EsbRedeemCallbackRequestPayloadDTO {
  query_params: EsbRedeemCallbackRequestQueryParamsDTO;
  body: EsbRedeemCallbackRequestBodyDTO;
}

export class EsbRedeemCallbackRequestQueryParamsDTO {
  @ApiProperty({
    example: '628123456789',
    description:
      'Subscriber MSISDN. Must start with “62” for Indonesia calling code.',
  })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({
    example: 'wof',
    description: 'Gamification Type. See section 2.8.1 for list of values.',
    required: false,
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: 'C002150810103800199678900111111111111111',
    description: 'Transaction ID. Length 40',
  })
  @IsString()
  @IsNotEmpty()
  @Length(40)
  trx_id: string;

  @ApiProperty({
    example: '1',
    description: 'Status of transaction.',
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    example: 'UX',
    description: 'Channel where the transaction comes from.',
  })
  @IsString()
  @IsNotEmpty()
  channel: string;

  @ApiProperty({
    example:
      'https%3A%2F%2Fqua-telkomsel-dap.timwe.com%2Fprize-redeem%2Fcallback',
    description: 'Callback URL',
  })
  @IsString()
  @IsNotEmpty()
  callback_url: string;

  @ApiProperty({
    example:
      'https%3A%2F%2Fqua-telkomsel-dap.timwe.com%2Fprize-redeem%2Fcallback',
    description: 'Partner Callback URL',
  })
  @IsString()
  @IsNotEmpty()
  partner_callback_url: string;
}

export class EsbRedeemCallbackRequestBodyDTO {
  @ApiProperty({
    example: 'test',
    description: 'Username of caller.',
  })
  @IsString()
  @IsNotEmpty()
  Username: string;

  @ApiProperty({
    example: 'test',
    description: 'Password of caller.',
  })
  @IsString()
  @IsNotEmpty()
  Password: string;

  @ApiProperty({
    example: 'WOPPAT42',
    description: 'Keyword of the redeemed product.',
  })
  @IsString()
  @IsNotEmpty()
  KEYWORD: string;

  @ApiProperty({
    example:
      'Trm+ksh.+Masukkan+kode+voucher+7019198480291665+utk+Beli+1+gratis+1+jam+reservasi+KTV+Inul+Vizta+di+https://bit.ly/20NQRwD+sd+29-NOV-18.+SKB',
    description: 'Notification to be sent to customer.',
  })
  @IsString()
  @IsNotEmpty()
  NOTIF: string;

  @ApiProperty({
    example: '628123456789',
    description:
      'Subscriber MSISDN. Must start with “62” for Indonesia calling code.',
  })
  @IsString()
  @IsNotEmpty()
  MSISDN: string;

  @ApiProperty({
    example: '1542745772088',
    description: 'UNIX timestamp of the transaction.',
  })
  @IsString()
  @IsNotEmpty()
  TIMESTAMP: string;

  @ApiProperty({
    example: '000',
    description: 'Status code of the transaction.',
  })
  @IsString()
  @IsNotEmpty()
  ERR_CODE: string;

  @ApiProperty({
    example: 'Success',
    description: 'Status description of the transaction.',
  })
  @IsString()
  @IsNotEmpty()
  MSG_CODE: string;

  @ApiProperty({
    example: 'null',
    description: 'Ignore this parameter.',
  })
  @IsString()
  PAR_VALUE: string;

  @ApiProperty({
    example: 'C002150810103800199678900111111111111111',
    description: 'Transaction ID. Length 40',
  })
  @IsString()
  @IsNotEmpty()
  @Length(40)
  TRXID: string;

  @ApiProperty({
    example: 'test',
    description: 'Merchant name.',
  })
  @IsString()
  @IsNotEmpty()
  merchant: string;

  @ApiProperty({
    example: '0',
    description: 'Point deducted.',
  })
  @IsString()
  @IsNotEmpty()
  poin: string;
}

export class EsbRedeemCallbackResponseDTO extends SetConfigDTOResponse {
  @ApiProperty({
    description: 'Response from redeem callback.',
    type: EsbRedeemCallbackResponse,
  })
  @Type(() => EsbRedeemCallbackResponse)
  payload: EsbRedeemCallbackResponse;
}
