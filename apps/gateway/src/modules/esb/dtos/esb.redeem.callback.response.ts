import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

import { EsbBaseResponseBadRequest } from './ebs.base.response';

export class EsbRedeemCallbackResponse {
  @ApiProperty({
    example: 'C002150810103800199678900',
    description: 'Transaction ID.',
  })
  @IsString()
  @IsNotEmpty()
  TransactionID: string;

  @ApiProperty({
    example: '1',
    description: 'Status of transaction. Length 40',
  })
  @IsString()
  @IsNotEmpty()
  @Length(40)
  CompletionStatus: string;

  @ApiProperty({
    example: '1',
    description: 'UNIX timestamp.',
  })
  @IsString()
  @IsNotEmpty()
  Timestamp: string;
}

export class EsbRedeemResponseBadRequest extends EsbBaseResponseBadRequest {
  @ApiProperty({
    example: 'E02000',
    default: 'E02000',
    description: 'BAD REQUEST Submit Redeem ESB',
  })
  code: string;

  constructor() {
    super();
    this.code = 'E02000';
  }
}
