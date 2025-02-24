import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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
export class WhitelistCounterParamDTO {
  @ApiProperty(ApiParamTransaction.msisdn)
  @MinLength(10)
  @IsNumberString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  @Matches(/^((08|628)+(11|12|13|21|22|23|51|52|53))+([0-9]{1,13})$/, {
    message: 'Invalid MSISDN format',
  })
  msisdn: string;
}

export class WhitelistCounterQueryDTO {
  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

  @ApiProperty(ApiQueryTransaction.program_id)
  @ValidateIf((o) => o.keyword == '' || !o.keyword)
  @IsDefined({
    message: TransactionErrorMsgResp.one_is_required.program_id,
  })
  @IsNotEmpty()
  @IsString()
  program_id: string;

  @ApiProperty(ApiQueryTransaction.keyword_primary)
  @ValidateIf((o) => o.program_id == '' || !o.program_id)
  @IsDefined({
    message: TransactionErrorMsgResp.one_is_required.keyword,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z|A-Z|0-9]+[ ]*[0-9]*$/gm, {
    message: TransactionErrorMsgResp.matches.keyword,
  })
  @Transform((e) => {
    return e.value ? e.value.trimEnd() : '';
  })
  keyword: string;

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
