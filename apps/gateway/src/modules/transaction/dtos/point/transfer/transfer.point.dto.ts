import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  IsString,
  MinLength,
} from 'class-validator';

import { Channel } from '@/channel/models/channel.model';

export class TransferPointDto {
  @ApiProperty({
    required: false,
    example: 'en-US',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Subscriber number origin',
  })
  @IsString()
  @IsNotEmpty()
  @IsNumberString()
  @MinLength(10)
  @IsNotEmpty()
  @IsDefined()
  indihome_number_source: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Subscriber target transfer',
  })
  @IsString()
  @IsNotEmpty()
  @IsNumberString()
  @MinLength(10)
  @IsNotEmpty()
  @IsDefined()
  indihome_number_target: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({
    required: true,
    type: 'string',
    example: '',
    description: `Channel information from source application`,
  })
  @IsString()
  channel_id: Channel;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({
    required: true,
    example: '',
    description: `Channel transaction id`,
  })
  @IsString()
  transaction_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @ApiProperty({
    required: true,
    example: '',
    maxLength: 200,
    description: `Reason. Maximum 200 characters`,
  })
  @IsString()
  reason: string;
}
