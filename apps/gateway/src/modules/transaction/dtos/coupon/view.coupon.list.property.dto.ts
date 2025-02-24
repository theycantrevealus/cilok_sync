import { isJsonString } from '@/application/utils/FilterDT/mod';
import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsJSON,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { SchemaTypes } from 'mongoose';

export class ViewCouponParamDTO {
  @ApiProperty({
    required: true,
    example: '',
    description: 'Subscriber Number',
  })
  @IsString()
  @IsNotEmpty()
  @IsNumberString()
  @MinLength(10)
  @IsNotEmpty()
  @IsDefined()
  @Matches(/^(62)(81|82|83|85)+[0-9]+$/, {
    message: 'Invalid MSISDN format (628XX)',
  })
  msisdn: string;
}

export class ViewCouponQueryDTO {
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
    default: 5,
    description: 'Limit record, default is last 5 records ( configurable )',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.Number,
    required: false,
  })
  limit: number;

  @ApiProperty({
    required: false,
    default: 0,
    description: 'Offset data, will start record after specified value.',
  })
  @IsNumberString()
  @Prop({
    type: SchemaTypes.Number,
    required: false,
  })
  skip: number;

  @ApiProperty({
    required: false,
    description: `Return only data matching to filter <br>
    { "code": "X", "name": "Y" }
    `,
  })
  @Matches(/^(\{.*\}|\[.*\])$/, { message: 'Filter should be a valid JSON string' })
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

  @ApiProperty({
    required: false,
    description: 'Program ID',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  program_id: string;

  @ApiProperty({
    required: false,
    description: 'Keyword',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  keyword: string;

  @ApiProperty({
    required: false,
    description: 'Period Time, ex. Period 1, 2 etc. ( used for MBP )',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  period: string;
}
