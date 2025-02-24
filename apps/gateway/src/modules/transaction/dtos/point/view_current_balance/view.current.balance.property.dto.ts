import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { SchemaTypes } from 'mongoose';

export class ViewPointParamDTO {
  @ApiProperty({
    required: true,
    example: '08555555555',
    description: 'Subscriber Number',
  })
  @IsNumberString()
  @MinLength(10)
  @IsNotEmpty()
  @IsDefined()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  @Matches(/^(62)(81|82|83|85)+[0-9]+$/, {
    message: 'Invalid MSISDN format (628XX)',
  })
  msisdn: string;
}

export class ViewPointQueryDTO {
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
    description: 'Offset data, will start record after specified value.',
  })
  @IsString()
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

// const ApiQueryViewCurrentBalance = {
//   msisdn: {
//     name: 'msisdn',
//     type: String,
//     required: true,
//     description: `Subscriber number`,
//   },
//   bucket_type: {
//     name: 'bucket_type',
//     type: String,
//     enum: ['TelkomselPOIN', 'Poku'],
//     example: 'TelkomselPOIN',
//     required: false,
//     description: `Type of bucket, by default Telkomsel Poin`,
//   },
//   transaction_id: {
//     name: 'transaction_id',
//     type: String,
//     required: false,
//     description: `Channel transaction id`,
//   },
//   channel_id: {
//     name: 'channel_id',
//     type: String,
//     required: false,
//     description: `Channel information from source application. <br>
//     Reference to List Channel From Legacy for Program Creation.
//     `,
//   },
//   limit: {
//     name: 'limit',
//     type: String,
//     required: false,
//     description: `Limit record, default is last 5 records ( configurable )`,
//   },
//   skip: {
//     name: 'skip',
//     type: String,
//     required: false,
//     description: `Offset data, will start record after specified value.`,
//   },

//   filter: {
//     name: 'filter',
//     type: String,
//     required: false,
//     example:'{}',
//     description: `Return only data matching to filter<br>
//     { "code": "X", "name": "Y" }
//     `,
//   },
//   additional_param: {
//     name: 'additional_param',
//     type: String,
//     required: false,
//     example:'{}',
//     description: `Additional	parameter	if needed, with format :<br>
//     { "code": "X", "name": "Y" }
//     `,
//   },

// };

// export { ApiQueryViewCurrentBalance };
