import { ApiProperty } from '@nestjs/swagger';

import { HttpCodeTransaction } from './global.http.status.transaction.dto';

export class GlobalTransactionResponse {
  @ApiProperty({
    example: HttpCodeTransaction.CODE_SUCCESS_200,
    description: 'Status code successfully',
  })
  code: string;

  @ApiProperty({
    example: 'Your request proceed successfully',
    description: 'Returning a message',
  })
  message: string;

  @ApiProperty({
    example: 'TRANSACTION_NAME_FOR_CLASSIFICATION',
    description: 'Transaction classification',
  })
  transaction_classify: string;

  @ApiProperty({
    type: Object,
    description: 'Return data from process that may useful for you',
  })
  payload: object;
}

export class GlobalTransactionErrorResponse {
  @ApiProperty({
    example: HttpCodeTransaction.ERR_NOT_FOUND_404,
    description: 'Error not found',
  })
  code: string;

  @ApiProperty({
    example: 'Your request proceed failed',
    description: 'Returning a message',
  })
  message: string;
}
