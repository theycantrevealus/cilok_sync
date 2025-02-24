import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

import { KeywordEligibility } from '@/keyword/models/keyword.eligibility.model';
import { ProgramV2 } from '@/program/models/program.model.v2';

export class InjectCouponDTO {
  @ApiProperty({
    example: 'en-US',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    example: '',
    description: 'Subscriber Number',
  })
  @IsString()
  msisdn: string;

  @ApiProperty({
    example: '',
    description: `Program Id ( Need one of parameter Program Id or Keyword )`,
  })
  @IsString()
  program: ProgramV2;

  @ApiProperty({
    example: '',
    description: `Keyword Linked by Program Id ( Need one of parameter Program Id or Keyword )`,
  })
  @IsString()
  keyword: KeywordEligibility;

  @ApiProperty({
    example: 10,
    minimum: 1,
    description: `Total Coupon Will Be Redeemed`,
  })
  @IsNumber()
  total_coupon: number;

  @ApiProperty({
    required: false,
    example: false,
    description: `If flag not send, then notification will follow keyword configuration, if it set, will override the flag on the keyword configuration`,
  })
  @IsBoolean()
  send_notification: boolean;

  @ApiProperty({
    example: '',
    description: `Channel transaction if exists`,
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    example: '',
    description: `Callback url from channel, if exists, then SL will call channel based on given url`,
  })
  @IsString()
  callback_url: string;
}

export class InjectCouponDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'INJECT_COUPON' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Coupon injected successfully' })
  @IsString()
  message: string;

  payload: any;
}
