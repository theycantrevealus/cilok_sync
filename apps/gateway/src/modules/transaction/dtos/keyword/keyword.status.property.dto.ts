import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { SchemaTypes } from 'mongoose';

export class KeywordStatusParamDTO {
  @ApiProperty({
    required: true,
    example: 'KEYWORDNAME',
    description: 'Keyword',
  })
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  keyword: string;
}

export class KeywordStatusQueryDTO {
  @ApiProperty({
    required: false,
    example: 'en-US',
    description: '“en-US” ',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  locale: string;
  // ----------------------
  @ApiProperty({
    required: false,
    description: 'Channel transaction id',
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  transaction_id: string;
  // ---------------------
  @ApiProperty({
    required: false,
    description: `Channel information from source application`,
  })
  @IsString()
  @Prop({
    type: SchemaTypes.String,
    required: false,
  })
  channel_id: string;
  // ---------------------
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
  // ---------------------
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
