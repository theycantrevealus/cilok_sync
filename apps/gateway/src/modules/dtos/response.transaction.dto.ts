import { ApiProperty } from '@nestjs/swagger';

import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';

export class GlobalTransactionResponse {
  @ApiProperty({
    example: HttpStatusTransaction.CODE_SUCCESS,
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
    example: 'TRANSACTION_NAME_FOR_CLASSIFICATION',
    description: 'Transaction classification',
  })
  trace_custom_code: string;

  @ApiProperty({
    type: Object,
    description: 'Return data from process that may useful for you',
  })
  payload: any;
}

export class GlobalTransactionErrorResponse {
  @ApiProperty({
    example: HttpStatusTransaction.ERR_NOT_FOUND,
    description: 'Error not found',
  })
  code: string;

  @ApiProperty({
    example: 'Your request proceed failed',
    description: 'Returning a message',
  })
  message: string;
}
