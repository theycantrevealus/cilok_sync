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

export class ViewDonationParamDTO {
  @ApiProperty({
    required: true,
    example: '',
    description: 'Keyword',
  })
  @IsString()
  @IsNotEmpty()
  // @IsDefined()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  keyword: string;
}

export class ViewDonationQueryDTO {
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

  @ApiProperty({
    required: false,
    description: `Additional parameter if needed, with format :<br>
    { "code": "X", "name": "Y" }
    `,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  additional_param: string;
}
