import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FileBatchAddDTO {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    example: 'batch_redeem.csv',
  })
  file: any;

  @ApiProperty({
    type: 'string',
    example: 'PATH_DIR',
  })
  @IsString()
  dir: string;

  @ApiProperty({
    type: 'string',
    example: 'inject_coupon',
  })
  @IsString()
  type_upload: string;
  constructor(data: any) {
    this.file = data.file;
    this.dir = data.dir;
  }
}
