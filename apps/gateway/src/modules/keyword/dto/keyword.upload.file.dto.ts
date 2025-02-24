import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KeywordUploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    example: 'image.png',
  })
  file: any;

  @ApiProperty({
    type: 'string',
    example: 'PATH_IMAGE_REWARD_CATALOG_SMALL',
  })
  @IsString()
  identifier: string;
  constructor(data: any) {
    this.file = data.file;
    this.identifier = data.identifier;
  }
}
