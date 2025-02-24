import { ApiProperty } from '@nestjs/swagger';

export class LuckyDrawUploadDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
  constructor(
    data: any
  ) {
    this.file = data.file
  }
}
