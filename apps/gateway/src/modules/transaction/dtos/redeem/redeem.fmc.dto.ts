import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsObject,
  IsString,
  MinLength,
} from 'class-validator';

import { Channel } from '@/channel/models/channel.model';

import { RedeemDTO } from './redeem.dto';

// export class RedeemFmcDTO {
//   @ApiProperty({
//     required: false,
//     example: 'en-US',
//   })
//   @IsString()
//   locale: string;

//   @ApiProperty({
//     required: false,
//     example: '',
//     description: 'Telkomsel ID',
//   })
//   @IsString()
//   tsel_id: string;

//   @ApiProperty({
//     required: true,
//     example: '',
//     description: 'Subscriber Number',
//   })
//   @IsString()
//   @IsNotEmpty()
//   @IsNumberString()
//   @MinLength(10)
//   @IsNotEmpty()
//   @IsDefined()
//   msisdn: string;

//   @ApiProperty({
//     required: true,
//     example: '',
//     description: `
//     keyword will refer to keyword
//     configuration rule, the keyword can
//     refer to redeem transaction,
//     notification and confirmation with
//     otp.
//     Below possibility combination
//     keyword value :
//       - [keyword]
//       - [keyword][delimiter][parameter]
//       - [keyword_notif]
//     `,
//   })
//   @IsString()
//   @IsNotEmpty()
//   @IsDefined()
//   @Transform((e) => e.value.trimEnd())
//   keyword: string;

//   @ApiProperty({
//     required: false,
//     example: '',
//     description: `Additional parameter if needed, with format : { "code": "X", "name": "Y" }`,
//   })
//   @IsObject()
//   @Prop({
//     type: Object,
//     required: false,
//   })
//   additional_param: object;

//   @ApiProperty({
//     required: false,
//     example: 2,
//     description: `Total coupon or point will be redeem. This only apply for flexible and fixed multiple point.`,
//   })
//   @IsNumber()
//   total_redeem: number;

//   @ApiProperty({
//     required: false,
//     default: null,
//     example: 3,
//     description: `Total bonus earned. This only apply for flexible point.`,
//   })
//   @IsNumber()
//   total_bonus: number;

//   @ApiProperty({
//     required: false,
//     example: '',
//     description: `
//     Type of redeem based on redeem
//     behaviour : </br>
//     </br>
//       a. general
//       b. auction
//     </br>
//     if it’s empty, will set as general
//     redeem process
//     `,
//   })
//   @IsString()
//   redeem_type: string;

//   @ApiProperty({
//     required: false,
//     example: '',
//     description: `Value of adn with default value 777`,
//   })
//   @IsString()
//   adn: string;

//   @ApiProperty({
//     required: false,
//     example: false,
//     default: true,
//     description: `True or False, If flag not send, then notification will follow keyword configuration, if it set, will override the flag on the keyword configuration`,
//   })
//   @IsBoolean()
//   send_notification: boolean;

//   @ApiProperty({
//     required: false,
//     example: '',
//     description: `Channel transaction if exists`,
//   })
//   @IsString()
//   transaction_id: string;

//   @ApiProperty({
//     required: false,
//     type: 'string',
//     example: '',
//     description: `Channel information from source application`,
//   })
//   @IsString()
//   channel_id: Channel;

//   @ApiProperty({
//     required: false,
//     example: '',
//     description: `Callback url from channel, if exists, then SL will call channel based on given url`,
//   })
//   @IsString()
//   callback_url: string;
// }

export class RedeemFmcDTO extends RedeemDTO {
  @ApiProperty({
    required: true,
    example: '',
    description: 'Subscriber Number',
  })
  @IsString()
  @IsNotEmpty()
  @IsNumberString()
  @MinLength(10)
  @IsDefined()
  msisdn: string;

  @ApiProperty({
    required: false,
    example: '',
    description: 'Telkomsel ID',
  })
  @IsString()
  tsel_id: string;
}
