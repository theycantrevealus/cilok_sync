import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { identifierSSO } from '@/application/utils/Msisdn/formatter';

export class programSegmentationBulkDeleteBodyDto {
  @ApiProperty({
    required: true,
    example: '6318bfafac660c99cf6557b1',
    description: 'Program ID',
  })
  @IsNotEmpty()
  @IsDefined()
  @IsMongoId()
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  program: string;

  @ApiProperty({
    required: true,
    example: 'whitelist',
    description: 'Type of program segmentation, whitelist/blacklist',
  })
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  type: string;

  @ApiProperty({ example: identifierSSO })
  @IsString()
  identifier: string;
}
