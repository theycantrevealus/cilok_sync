import { TransactionErrorMsgResp } from "@/dtos/property.dto";
import { Prop } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { IsDefined, IsNotEmpty, IsNumber, IsNumberString, IsString, MinLength } from "class-validator";
import { SchemaTypes } from "mongoose";

export class RewardCalaogueParamDTO {
  @ApiProperty({
    name: 'msisdn',
    type: String,
    required: true,
    description: `Subscriber number`,
  })
  @MinLength(10)
  @IsNumberString()
  @IsNotEmpty()
  @IsDefined({
    message: TransactionErrorMsgResp.required.msisdn,
  })
  msisdn: string;
}

export class RewardCalaogueQueryDTO {
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
  @IsString()
  @Prop({
    type: SchemaTypes.Number,
    required: false,
  })
  skip: number;

  @ApiProperty({
    name: 'transaction_id',
    type: String,
    required: false,
    description: `Channel transaction id`,
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    name: 'channel_id',
    type: String,
    required: false,
    description: `Channel information from source application`,
  })
  @IsString()
  channel_id: string;

  @ApiProperty({
    name: 'filter',
    type: String,
    required: false,
    description: `Return only data matching to filter<br>
      { "code": "X", "name": "Y" }
      `,
  })
  @IsString()
  filter: string;

  @ApiProperty({
    name: 'additional_param',
    type: String,
    required: false,
    description: `Additional	parameter	if needed, with format :<br>
      { "code": "X", "name": "Y" }
      `,
  })
  @IsString()
  additional_param: string;
}
export interface ListOfPoint {
  total_point: number;
}

