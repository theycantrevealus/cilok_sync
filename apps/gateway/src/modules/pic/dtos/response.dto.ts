import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { PIC } from '../models/pic.model';

export class PICResponse {
  @ApiProperty({
    example: HttpStatus.CREATED,
    description: 'Created',
  })
  statusCode: number;

  @ApiProperty({
    example: 'Your request proceed successfully',
    description: 'Returning message of created',
  })
  message: string;

  @ApiProperty({
    type: Object,
    description: 'Return data from process that may useful for you',
  })
  payload: PIC;

  @ApiProperty({
    example: 'TRANSACTION_NAME_FOR_CLASSIFICATION',
    description: 'Transaction classification',
  })
  transaction_classify: string;
}

export class PICErrorResponse {
  @ApiProperty({
    example: 666,
    description: 'Error status code',
  })
  statusCode: number;

  @ApiProperty({
    example: ['Error 1', 'Error 2', 'Error 3'],
    description: 'Returning list of error',
  })
  message: string[];

  @ApiProperty({
    example: 'Error cause of...',
    description: 'Error description',
  })
  description: string;

  @ApiProperty({
    example: new Date(),
    description: 'When is the error occuring. For logging purpose',
  })
  timestamp: string;

  @ApiProperty({
    example: '/path',
    description: 'Where is the error is occuring. For logging purpose',
  })
  path: string;
}
