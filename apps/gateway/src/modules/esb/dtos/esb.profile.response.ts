import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { EsbBaseResponseBadRequest } from './ebs.base.response';
import { EsbTransactionResponse } from './esb.transaction.response';

export class EsbProfileResponse {
  @ApiProperty({
    description: 'Transaction',
  })
  @Type(() => EsbTransactionResponse)
  transaction: EsbTransactionResponse;

  @ApiProperty({
    description: 'Msisdn',
    minLength: 11,
    maxLength: 13,
    required: true,
  })
  service_id: string;

  @ApiProperty({
    description: 'Network Profile.',
  })
  network_profile: any;
}

export class EsbProfileResponseBadRequest extends EsbBaseResponseBadRequest {
  @ApiProperty({
    example: 'E02000',
    default: 'E02000',
    description: 'BAD REQUEST Profile ESB',
  })
  code: string;

  constructor() {
    super();
    this.code = 'E02000';
  }
}
