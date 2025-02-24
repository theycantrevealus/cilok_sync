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

const TRANSACTION_CLASSIFY = 'TRANSACTIONS_PREPAID_CALLBACK';

export class CallbackPrepaidResponseOk {
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

export class CallbackPrepaidResponseCreated {
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

export class CallbackPrepaidResponseAccepted {
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

export class CallbackPrepaidResponseNoContent {
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

export class CallbackPrepaidResponseBadRequest {
  @ApiProperty({
    example: HttpStatus.BAD_REQUEST,
    description: DESC_RESP_BAD_REQUEST,
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

export class CallbackPrepaidResponseUnauthorized {
  @ApiProperty({
    example: HttpStatus.UNAUTHORIZED,
    description: DESC_RESP_UNAUTHORIZED,
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

export class CallbackPrepaidResponseNotFound {
  @ApiProperty({
    example: HttpStatus.NOT_FOUND,
    description: DESC_RESP_NOT_FOUND,
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

export class CallbackPrepaidResponseForbidden {
  @ApiProperty({
    example: HttpStatus.FORBIDDEN,
    description: DESC_RESP_FORBIDDEN,
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

export class CallbackPrepaidResponseMethodNotAllowed {
  @ApiProperty({
    example: HttpStatus.METHOD_NOT_ALLOWED,
    description: DESC_RESP_METHOD_NOT_ALLOWED,
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

export class CallbackPrepaidResponseUnprocessableEntity {
  @ApiProperty({
    example: HttpStatus.UNPROCESSABLE_ENTITY,
    description: DESC_RESP_UNPROCESSABLE_ENTITY,
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

export class CallbackPrepaidResponseFailedDepedency {
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

export class CallbackPrepaidResponseInternalServerError {
  @ApiProperty({
    example: HttpStatus.INTERNAL_SERVER_ERROR,
    description: DESC_INTERNAL_SERVER_ERROR,
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
