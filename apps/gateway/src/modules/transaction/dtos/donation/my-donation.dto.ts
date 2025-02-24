import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  IsString,
  MinLength,
} from 'class-validator';

import { TransactionErrorMsgResp } from '@/dtos/property.dto';
import {
  ApiParamMyDonation,
  ApiQueryMyDonation,
} from '@/transaction/dtos/donation/donation.property.dto';

export class MyDonationParamDTO {
  @ApiProperty(ApiParamMyDonation.msisdn)
  @MinLength(10)
  @IsNumberString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;
}

export class MyDonationQueryDTO {
  @ApiProperty(ApiQueryMyDonation.limit)
  @IsNumberString()
  limit: string;

  @ApiProperty(ApiQueryMyDonation.skip)
  @IsNumberString()
  skip: string;

  @ApiProperty(ApiQueryMyDonation.transaction_id)
  @IsString()
  transaction_id: string;

  @ApiProperty(ApiQueryMyDonation.channel_id)
  @IsString()
  channel_id: string;

  @ApiProperty(ApiQueryMyDonation.filter)
  @IsString()
  filter: string;

  @ApiProperty(ApiQueryMyDonation.additional_param)
  @IsString()
  additional_param: string;
}
