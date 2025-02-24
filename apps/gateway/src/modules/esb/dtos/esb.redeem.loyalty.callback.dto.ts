import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

import { EsbServiceType } from '../constans/esb.servicetype.enum';

export class EsbRedeemLoyaltyCallbackServiceDto {
  @ApiProperty({
    required: true,
    example: '628123456789 | 100000000001',
    description:
      'Subscriber MSISDN or indihome number. Must start with “62” if MSISDN or starts with 1 and must 12 digit if indihome number',
  })
  @IsString()
  @IsNotEmpty()
  service_id: string;

  @ApiProperty({
    required: true,
    example: 'MSISDN | IH',
    description: 'Subscriber identifier type',
  })
  @IsString()
  @IsNotEmpty()
  service_type: EsbServiceType;
}

export class EsbRedeemLoyaltyCallbackInfoDto {
  @ApiProperty({
    example: 'wof',
    description: 'Gamification Type. See section 2.1.5.1 for list of values',
  })
  type: string;

  @ApiProperty({
    required: true,
    example: '1',
    description: 'Status of transaction',
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    example:
      'https%3A%2F%2Fqua-telkomsel-dap.timwe.com%2Fprizeredeem%2Fcallback',
    description: 'Callback URL to Partner',
  })
  @IsString()
  partner_callback_url: string;

  @ApiProperty({
    example: 'test',
    description: 'Username of caller',
  })
  @IsString()
  username: string;

  @ApiProperty({
    example: 'test',
    description: 'Password of caller',
  })
  @IsString()
  password: string;

  @ApiProperty({
    required: true,
    example: 'WOPPAT42',
    description: 'Keyword of the redeemed product',
  })
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @ApiProperty({
    required: true,
    example:
      'Trm+ksh.+Masukkan+kode+voucher+7019198480291665+utk+Beli+1+gratis+1+jam+reservasi+KTV+Inul+Vizta+di+https: //bit.ly/20NQRwD+sd+29-NOV-18.+SKB',
    description: 'Notification to be sent to customer',
  })
  @IsString()
  @IsNotEmpty()
  notif: string;

  @ApiProperty({
    required: true,
    example: '1542745772088',
    description: 'UNIX timestamp of the transaction',
  })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({
    required: true,
    example: '000',
    description: 'Status code of the transaction',
  })
  @IsString()
  @IsNotEmpty()
  err_code: string;

  @ApiProperty({
    required: true,
    example: 'Success',
    description: 'Status description of the transaction',
  })
  @IsString()
  @IsNotEmpty()
  msg_code: string;

  @ApiProperty({
    required: true,
    example: 'Success',
    description: 'Status description of the transaction',
  })
  @IsString()
  @IsNotEmpty()
  err_msg: string;
}

export class EsbRedeemLoyaltyCallbackBodyDto {
  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  @Type(() => EsbRedeemLoyaltyCallbackServiceDto)
  service: EsbRedeemLoyaltyCallbackServiceDto;

  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  @Type(() => EsbRedeemLoyaltyCallbackInfoDto)
  callback_info: EsbRedeemLoyaltyCallbackInfoDto;
}

export class EsbRedeemLoyaltyCallbackDto {
  @ApiProperty({
    required: true,
  })
  @IsNotEmpty()
  @Type(() => EsbRedeemLoyaltyCallbackBodyDto)
  body: EsbRedeemLoyaltyCallbackBodyDto;

  @ApiProperty({
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  transaction_id: string;

  // value for header: x-channel
  @ApiProperty({
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  channel: string;
}
