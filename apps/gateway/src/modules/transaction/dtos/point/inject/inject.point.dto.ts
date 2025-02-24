import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

import { Channel } from '@/channel/models/channel.model';
import { KeywordEligibility } from '@/keyword/models/keyword.eligibility.model';
import { ProgramV2 } from '@/program/models/program.model.v2';

export class InjectPointDTO {
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
    example: 10,
    minimum: 1,
    description: `Total point to be injected, this parameter will be used if keyword apply flexible methode`,
  })
  @IsNumber()
  total_point: number;

  @ApiProperty({
    required: false,
    example: false,
    description: `True or False, If flag not send, then notification will follow keyword configuration, if it set, will override the flag on the keyword configuration`,
  })
  @IsBoolean()
  send_notification: boolean;

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
