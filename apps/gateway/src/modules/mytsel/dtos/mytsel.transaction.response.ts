import { ApiProperty } from '@nestjs/swagger';

import { MyTselResponseStatusCodeEnum } from '../constant/mytsel.response.status.code.enum';

export class MyTselTransactionResponse {
  @ApiProperty({
    description: '200 | 400 | 500',
  })
  statusCode: MyTselResponseStatusCodeEnum;

  @ApiProperty({
    description: '0000',
  })
  status: string;

  @ApiProperty({
    description: 'success | bad request | something wrong',
  })
  message: string;
}
