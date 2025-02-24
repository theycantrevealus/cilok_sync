import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { Channel } from '@/channel/models/channel.model';
import { KeywordEligibility } from '@/keyword/models/keyword.eligibility.model';
import { ProgramV2 } from '@/program/models/program.model.v2';
import { Prop } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

export class RefundPointDTO {
  @ApiProperty({
    example: 'en-US',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    required : true,
    description: 'Subscriber Number. Format : 68xxxxxx',
  })
  @IsNotEmpty()
  @Prop({ type: SchemaTypes.String})
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
    required: true,
    example: '',
    description: `Ref_transaction_id must come from channel and must match with recorded transaction </br> Transaction id must refer to trace_id in previous deduct transaction api response.`,
  })
  @IsString()
  ref_transaction_id: string;

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
  channel_id: Channel;

  @ApiProperty({
    example: '',
    description: `Callback url from channel, if exists, then SL will call channel based on given url`,
  })
  @IsString()
  callback_url: string;

  @ApiProperty({
    example: '',
    description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
  })
  @IsString()
  additional_param: string;
}
