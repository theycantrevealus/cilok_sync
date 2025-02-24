import { ApiProperty } from '@nestjs/swagger';

import { GlobalErrorResponse, GlobalResponse } from '@/dtos/response.dto';

export class VoucherResponse extends GlobalResponse {
  @ApiProperty({
    description: 'transaction code',
    example: 'S00000',
  })
  code: string;
}

export class VoucherErrorResponse extends GlobalErrorResponse {
  @ApiProperty({
    description: 'transaction code',
    example: 'S00000',
  })
  code: string;
}
