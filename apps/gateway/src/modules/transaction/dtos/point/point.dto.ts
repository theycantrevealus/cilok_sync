import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

import { TransactionErrorMsgResp } from '@/dtos/property.dto';
import {
  ApiParamTransaction,
  ApiQueryTransaction,
} from '@/transaction/dtos/transaction.property.dto';

// View Point History
export class ViewPointHistoryParamDTO {
  @ApiProperty(ApiParamTransaction.msisdn)
  @MinLength(10)
  @IsNumberString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  @Matches(/^(62)(81|82|83|85)+[0-9]+$/, {
    message: 'Invalid MSISDN format (628XX)',
  })
  msisdn: string;
}

export class ViewPointHistoryQueryDTO {
  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

  @ApiProperty(ApiQueryTransaction.transaction_id)
  @IsString()
  transaction_id: string;

  @ApiProperty(ApiQueryTransaction.channel_id)
  @IsString()
  channel_id: string;

  @ApiProperty(ApiQueryTransaction.limit)
  @IsNumberString()
  limit: string;

  @ApiProperty(ApiQueryTransaction.skip)
  @IsNumberString()
  skip: string;

  @ApiProperty(ApiQueryTransaction.from)
  @IsString()
  @Matches(/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/, {
    message: TransactionErrorMsgResp.matches.from,
  })
  from: string;

  @ApiProperty(ApiQueryTransaction.to)
  @IsString()
  @Matches(/^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/, {
    message: TransactionErrorMsgResp.matches.to,
  })
  to: string;

  @ApiProperty(ApiQueryTransaction.type)
  @IsString()
  // @IsNotEmpty()
  // @IsDefined({
  //   message: TransactionErrorMsgResp.required.type,
  // })
  type: string;

  @ApiProperty(ApiQueryTransaction.bucket_type)
  @IsString()
  bucket_type: string;

  @ApiProperty(ApiQueryTransaction.filter)
  @IsString()
  filter: string;

  @ApiProperty(ApiQueryTransaction.additional_param)
  @IsString()
  additional_param: string;
}

export class ViewPointHistoryCoreQueryDTO {
  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

  @ApiProperty(ApiQueryTransaction.transaction_id)
  @IsString()
  transaction_id: string;

  @IsString()
  member_id: string;
}
