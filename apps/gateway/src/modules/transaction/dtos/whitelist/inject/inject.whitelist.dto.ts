import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { KeywordEligibility } from '@/keyword/models/keyword.eligibility.model';
import { ProgramV2 } from '@/program/models/program.model.v2';
import { Transform, TransformFnParams } from 'class-transformer';

export class InjectWhitelistDTO {
  @ApiProperty({
    example: 'en-US',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    required: true,
    example: '',
    description: 'Customer MSISDN',
  })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({
    example: '',
    description: `Program Id ( Need one of parameter Program Id or Keyword )`,
  })
  @IsString()
  program_id: ProgramV2;

  @ApiProperty({
    example: '',
    description: `Keyword Linked by Program Id ( Need one of parameter Program Id or Keyword )`,
  })
  @IsString()
  keyword: KeywordEligibility;

  @ApiProperty({
    example: '',
    description: `Channel transaction if exists`,
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    type: 'string',
    example: '',
    description: `Channel information from source application`,
  })
  @IsString()
  channel_id: string;

  @ApiProperty({
    example: '',
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  })
  @IsString()
  additional_param: string;
}
