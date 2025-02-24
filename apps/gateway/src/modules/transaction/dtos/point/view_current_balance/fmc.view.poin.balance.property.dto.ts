import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  IsString,
  MinLength,
} from 'class-validator';
import { SchemaTypes } from 'mongoose';

import { FmcIdenfitiferType } from '../fmc.member.identifier.type';

export class FmcViewPoinParamDTO {
  @ApiProperty({
    required: true,
    example: '08555555555',
    description: 'Can be MSISDN / Indohome number / Tsel service id',
  })
  // @IsNumberString()
  // @MinLength(8)
  @IsNotEmpty()
  @IsDefined()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  identifierId: string;
}

export class FmcViewPoinQueryDTO {
  @ApiProperty({
    required: true,
    enum: FmcIdenfitiferType,
    default: FmcIdenfitiferType.MSISDN,
    example: FmcIdenfitiferType.MSISDN,
    description: `Type of customer identifier, by default msisdn <br>
    Type will be shown as follow : <br>
    a.	msisdn <br>
    b.  indihome <br>
    c.  tsel_id
    By Default will be send as msisdn 
    `,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  identifier: FmcIdenfitiferType;

  @ApiProperty({
    required: false,
    enum: ['TelkomselPOIN', 'Poku'],
    example: 'TelkomselPOIN',
    description: `Type of bucket, by default Telkomsel Poin <br>
    LOV will be shown as follow : <br>
    a.	TelkomselPOIN <br>
    b.	Poku <br>
    By Default will be send as TelkomselPOIN
    `,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  bucket_type: string;

  @ApiProperty({
    required: false,
    description: 'Channel transaction if exists',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  transaction_id: string;

  @ApiProperty({
    required: false,
    description: `Channel information from source application. <br>
    Reference to List Channel From Legacy for Program Creation.
    `,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  channel_id: string;

  @ApiProperty({
    required: false,
    description: `Return only data matching to filter <br>
    { "code": "X", "name": "Y" }
    `,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  filter: string;
}
