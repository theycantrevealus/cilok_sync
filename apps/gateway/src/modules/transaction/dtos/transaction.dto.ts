import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { TransactionErrorMsgResp } from '@/dtos/property.dto';
import {
  ApiParamTransaction,
  ApiQueryTransaction,
} from '@/transaction/dtos/transaction.property.dto';

// View Point History
export class CheckCustPotentialPointParamDTOParamDTO {
  @ApiProperty(ApiParamTransaction.msisdn)
  @MinLength(10)
  @IsNumberString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;
}

export class CheckCustPotentialPointParamDTOQueryDTO {
  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

  @ApiProperty(ApiQueryTransaction.city)
  @IsString()
  city: string;

  @ApiProperty(ApiQueryTransaction.amount)
  @IsNumberString()
  amount: string;

  @ApiProperty(ApiQueryTransaction.transaction_id)
  @IsString()
  transaction_id: string;

  @ApiProperty(ApiQueryTransaction.channel_id)
  @IsString()
  channel_id: string;

  @ApiProperty(ApiQueryTransaction.filter)
  @IsString()
  filter: string;

  @ApiProperty(ApiQueryTransaction.additional_param)
  @IsString()
  additional_param: string;
}

export class CheckTransactionParamDTOParamDTO {
  @ApiProperty(ApiParamTransaction.msisdn)
  @MinLength(10)
  @IsNumberString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;
}

export class CheckTransactionParamDTOQueryDTO {
  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

  @ApiProperty(ApiQueryTransaction.ref_transaction_id)
  @IsString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.ref_transaction_id,
  })
  ref_transaction_id: string;

  @ApiProperty(ApiQueryTransaction.sleep)
  @IsNumber()
  sleep: number;

  @ApiProperty(ApiQueryTransaction.transaction_id)
  @IsString()
  transaction_id: string;

  @ApiProperty(ApiQueryTransaction.channel_id)
  @IsString()
  channel_id: string;

  @ApiProperty(ApiQueryTransaction.filter)
  @IsString()
  filter: string;

  @ApiProperty(ApiQueryTransaction.additional_param)
  @IsString()
  additional_param: string;
}

export class CheckTransactionLinkAjaParamDTOQueryDTO {
  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

  @ApiProperty(ApiQueryTransaction.ref_transaction_id)
  @IsString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.ref_transaction_id,
  })
  ref_transaction_id: string;

  @ApiProperty(ApiQueryTransaction.sleep)
  @IsNumber()
  sleep: number;

  @ApiProperty(ApiQueryTransaction.transaction_id)
  @IsString()
  transaction_id: string;

  @ApiProperty(ApiQueryTransaction.channel_id)
  @IsString()
  @IsNotEmpty()
  @IsDefined({
    message: 'channel_id is required',
  })
  channel_id: string;

  @ApiProperty(ApiQueryTransaction.filter)
  @IsString()
  filter: string;

  @ApiProperty(ApiQueryTransaction.additional_param)
  @IsString()
  additional_param: string;
}
