import { HttpStatus, Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

import { Account } from '../models/account.model';

export type Constructor<I> = new (...args: any[]) => I;
function Fetching(status = 0, message = ''): Constructor<Error> {
  class AccountFetchResponse implements Error {
    @ApiProperty({ example: [{}] })
    @IsArray()
    data: [
      {
        //
      },
    ];

    @ApiProperty({ example: 0 })
    @IsNumber()
    total: number;

    name: string;
    type: string;

    @ApiProperty({ example: status })
    @IsNumber()
    status: number;

    @ApiProperty({ example: message })
    @IsString()
    message: string;
  }
  return AccountFetchResponse;
}

function Manipulating(
  responseStatus: number,
  transaction_classify: string,
  message: string,
  payload: any,
): Constructor<Error> {
  class AccountDTOResponse implements Error {
    @ApiProperty({ example: responseStatus })
    @IsNumber()
    status: number;

    @ApiProperty({ example: transaction_classify })
    @IsString()
    transaction_classify: string;

    @ApiProperty({ example: message })
    @IsString()
    message: string;

    @ApiProperty({
      type: payload,
      example: payload,
    })
    @ValidateNested({ each: true })
    payload: any;

    name: string;
  }
  return AccountDTOResponse;
}

export { Fetching, Manipulating };
