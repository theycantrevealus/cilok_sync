import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

import { SetConfigDTOResponse } from '@/application/dto/set.config.dto';

import { EsbOrderResponse } from './esb.order.response';
import { OrderActiveMemberDTO } from './order.activemember.dto';
import { OrderCustomerInfoDto } from './order.customerinfo.dto';
import { OrderExpiryDto } from './order.expiry.dto';
import { OrderMerchantProfileDto } from './order.marchantprofile.dto';

export class EsbProfileDTO {
  @ApiProperty({
    example: '1234567890987654321234567',
    description: 'Transaction ID, Leng 25',
    // maxLength: 25,
  })
  @IsString()
  // @IsNotEmpty()
  // @Length(25)
  transaction_id: string;

  @ApiProperty({
    example: 'c1',
    description: 'Channel ID.',
  })
  @IsString()
  @IsNotEmpty()
  // @Length(2)
  channel: string;

  @ApiProperty({
    description: 'Service ID for initiator.',
    // maxLength: 13,
  })
  @IsString()
  @IsNotEmpty()
  // @Length(13)
  service_id: string;

  @ApiProperty({
    description: 'Criteria Searching',
    required: false,
  })
  @IsString()
  criteria: string;

  @ApiProperty({
    description: 'Criteria Searching',
    required: false,
  })
  @IsString()
  imsi: string;
}

export class EsbProfileDTOResponse extends SetConfigDTOResponse {
  @ApiProperty({
    description: 'Response from submit order',
    type: EsbOrderResponse,
  })
  @Type(() => EsbOrderResponse)
  payload: EsbOrderResponse;
}
