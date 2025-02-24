import { TransactionErrorMsgResp } from '@/dtos/property.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsNumber, IsNumberString, IsString, MinLength } from 'class-validator';
import { ApiParamTransaction, ApiQueryTransaction } from '@/transaction/dtos/transaction.property.dto';

// My Auction
export class MyEauctionParamDTO {
  @ApiProperty(ApiParamTransaction.msisdn)
  @MinLength(10)
  @IsNumberString()
  @IsNotEmpty()
  @IsDefined({
    message : TransactionErrorMsgResp.required.msisdn
  })
  msisdn: string;
}

export class MyEauctionQueryDTO {
  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

  @ApiProperty(ApiQueryTransaction.limit)
  @IsNumberString()
  limit: string;

  @ApiProperty(ApiQueryTransaction.skip)
  @IsNumberString()
  skip: string;

  @ApiProperty(ApiQueryTransaction.transaction_id)
  @IsString()
  transaction_id: string;

  @ApiProperty(ApiQueryTransaction.channel_id)
  @IsString()
  channel_id: string;

  @ApiProperty(ApiQueryTransaction.filter)
  @IsString()
  filter: any;

  @ApiProperty(ApiQueryTransaction.additional_param)
  @IsString()
  additional_param: string;
}

// Total Bidder Per Keyword
export class TotalBidderPerKeywordEauctionParamDTO {
  @ApiProperty(ApiParamTransaction.keyword)
  @IsString()
  @IsNotEmpty()
  @IsDefined({
    message : TransactionErrorMsgResp.required.keyword
  })
  keyword: string;
}

export class TotalBidderPerKeywordQueryDTO {
  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

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

// Registration Status
export class RegistrationStatusEauctionParamDTO {
  @ApiProperty(ApiParamTransaction.msisdn)
  @MinLength(10)
  @IsNumberString()
  @IsNotEmpty()
  @IsDefined({
    message : TransactionErrorMsgResp.required.msisdn
  })
  msisdn: string;
}

export class RegistrationStatusQueryDTO {
  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

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

// Top Bidder per Keyword
export class TopBidderPerKeywordEauctionParamDTO {
  @ApiProperty(ApiParamTransaction.keyword)
  @IsString()
  @IsNotEmpty()
  @IsDefined({
    message : TransactionErrorMsgResp.required.keyword
  })
  keyword: string;
}

export class TopBidderPerKeywordQueryDTO {
  @ApiProperty(ApiQueryTransaction.locale)
  @IsString()
  locale: string;

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