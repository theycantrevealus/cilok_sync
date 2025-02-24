import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import {
  DESC_INTERNAL_SERVER_ERROR,
  DESC_RESP_ACCEPTED,
  DESC_RESP_BAD_REQUEST,
  DESC_RESP_CREATED,
  DESC_RESP_FAILED_DEPENDENCY,
  DESC_RESP_FORBIDDEN,
  DESC_RESP_METHOD_NOT_ALLOWED,
  DESC_RESP_NO_CONTENT,
  DESC_RESP_NOT_FOUND,
  DESC_RESP_OK,
  DESC_RESP_UNAUTHORIZED,
  DESC_RESP_UNPROCESSABLE_ENTITY,
} from '@/transaction/dtos/transaction.var.dto';

const TRANSACTION_CLASSIFY = 'REFUND_POINT';

export class RefundPointResponseOk {
  @ApiProperty({
    example: HttpStatus.OK,
    description: DESC_RESP_OK,
  })
  statusCode: number;

  @ApiProperty({
    example: 'Your request proceed successfully',
    description: 'Returning a message',
  })
  message: string;

  @ApiProperty({
    type: Object,
    description: 'Return data from process that may useful for you',
  })
  payload: object;

  @ApiProperty({
    example: TRANSACTION_CLASSIFY,
    description: 'Transaction classification',
  })
  transaction_classify: string;
}

export class RefundPointResponseCreated {
  @ApiProperty({
    example: HttpStatus.CREATED,
    description: DESC_RESP_CREATED,
  })
  statusCode: number;

  @ApiProperty({
    example: 'Your request proceed successfully',
    description: 'Returning a message',
  })
  message: string;

  @ApiProperty({
    type: Object,
    description: 'Return data from process that may useful for you',
  })
  payload: object;

  @ApiProperty({
    example: TRANSACTION_CLASSIFY,
    description: 'Transaction classification',
  })
  transaction_classify: string;
}

export class RefundPointResponseAccepted {
  @ApiProperty({
    example: HttpStatus.ACCEPTED,
    description: DESC_RESP_ACCEPTED,
  })
  statusCode: number;

  @ApiProperty({
    example: 'Your request proceed successfully',
    description: 'Returning a message',
  })
  message: string;

  @ApiProperty({
    type: Object,
    description: 'Return data from process that may useful for you',
  })
  payload: object;

  @ApiProperty({
    example: TRANSACTION_CLASSIFY,
    description: 'Transaction classification',
  })
  transaction_classify: string;
}

export class RefundPointResponseNoContent {
  @ApiProperty({
    example: HttpStatus.NO_CONTENT,
    description: DESC_RESP_NO_CONTENT,
  })
  statusCode: number;

  @ApiProperty({
    example: 'Your request proceed successfully',
    description: 'Returning a message',
  })
  message: string;

  @ApiProperty({
    type: Object,
    description: 'Return data from process that may useful for you',
  })
  payload: object;

  @ApiProperty({
    example: TRANSACTION_CLASSIFY,
    description: 'Transaction classification',
  })
  transaction_classify: string;
}

export class RefundPointResponseBadRequest {
  @ApiProperty({
    example: 'E02000',
    default: 'E02000',
    description: DESC_RESP_BAD_REQUEST,
  })
  code: string;

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

  constructor() {
    this.code = 'E02000';
  }
}

export class RefundPointResponseUnauthorized {
  @ApiProperty({
    example: 'E01001',
    default: 'E01001',
    description: DESC_RESP_UNAUTHORIZED,
  })
  code: string;

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

  constructor() {
    this.code = 'E01001';
  }
}

export class RefundPointResponseNotFound {
  @ApiProperty({
    example: 'E00000',
    default: 'E00000',
    description: DESC_RESP_NOT_FOUND,
  })
  code: string;

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

  constructor() {
    this.code = 'E00000';
  }
}

export class RefundPointResponseForbidden {
  @ApiProperty({
    example: 'E01002',
    default: 'E01002',
    description: DESC_RESP_FORBIDDEN,
  })
  code: string;

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

  constructor() {
    this.code = 'E01002';
  }
}

export class RefundPointResponseMethodNotAllowed {
  @ApiProperty({
    example: 'E02002',
    default: 'E02002',
    description: DESC_RESP_METHOD_NOT_ALLOWED,
  })
  code: string;

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

  constructor() {
    this.code = 'E02002';
  }
}

export class RefundPointResponseUnprocessableEntity {
  @ApiProperty({
    example: 'E7002',
    default: 'E7002',
    description: DESC_RESP_UNPROCESSABLE_ENTITY,
  })
  code: string;

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

  constructor() {
    this.code = 'E07002';
  }
}

export class RefundPointResponseFailedDepedency {
  @ApiProperty({
    example: HttpStatus.FAILED_DEPENDENCY,
    description: DESC_RESP_FAILED_DEPENDENCY,
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

export class RefundPointResponseInternalServerError {
  @ApiProperty({
    example: 'X00000',
    default: 'X00000',
    description: DESC_INTERNAL_SERVER_ERROR,
  })
  code: string;

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

  constructor() {
    this.code = 'X00000';
  }
}
