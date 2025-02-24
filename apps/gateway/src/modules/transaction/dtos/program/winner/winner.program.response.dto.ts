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

const TRANSACTION_CLASSIFY = 'UPDATE_KYC_WINNER_PROFILE';

export class ProgramWinnerResponseOk {
  @ApiProperty({
    example: HttpStatus.OK,
    description: DESC_RESP_OK,
  })
  code: string;

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

export class ProgramWinnerResponseCreated {
  @ApiProperty({
    example: HttpStatus.CREATED,
    description: DESC_RESP_CREATED,
  })
  code: string;

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

  constructor() {
    this.code = 'S00000';
  }
}

export class ProgramWinnerResponseAccepted {
  @ApiProperty({
    example: HttpStatus.ACCEPTED,
    description: DESC_RESP_ACCEPTED,
  })
  code: string;

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

export class ProgramWinnerResponseNoContent {
  @ApiProperty({
    example: HttpStatus.NO_CONTENT,
    description: DESC_RESP_NO_CONTENT,
  })
  code: string;

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

export class ProgramWinnerResponseBadRequest {
  @ApiProperty({
    example: HttpStatus.BAD_REQUEST,
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

export class ProgramWinnerResponseUnauthorized {
  @ApiProperty({
    example: HttpStatus.UNAUTHORIZED,
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

export class ProgramWinnerResponseNotFound {
  @ApiProperty({
    example: HttpStatus.NOT_FOUND,
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

export class ProgramWinnerResponseForbidden {
  @ApiProperty({
    example: HttpStatus.FORBIDDEN,
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
    this.code = 'E01000';
  }
}

export class ProgramWinnerResponseMethodNotAllowed {
  @ApiProperty({
    example: HttpStatus.METHOD_NOT_ALLOWED,
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

export class ProgramWinnerResponseUnprocessableEntity {
  @ApiProperty({
    example: HttpStatus.UNPROCESSABLE_ENTITY,
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
}

export class ProgramWinnerResponseFailedDepedency {
  @ApiProperty({
    example: HttpStatus.FAILED_DEPENDENCY,
    description: DESC_RESP_FAILED_DEPENDENCY,
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
}

export class ProgramWinnerResponseInternalServerError {
  @ApiProperty({
    example: HttpStatus.INTERNAL_SERVER_ERROR,
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
