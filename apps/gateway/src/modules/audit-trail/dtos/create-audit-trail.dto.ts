import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAuditTrailDto {
  @ApiProperty({
    type: String,
    example: 'business-user',
    description: 'required | string',
  })
  @IsString()
  @IsNotEmpty()
  user_name: string;

  @ApiProperty({
    type: String,
    example: 'program.keyword',
    description: 'required | string',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  menu: string;

  @ApiProperty({
    type: String,
    example: '/v1/keywords',
    description: 'required | string',
  })
  @IsString()
  @IsNotEmpty()
  request_api: string;

  @ApiProperty({
    type: String,
    example: 'GET / POST / PUT',
    description: 'required | string',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.toUpperCase())
  method: string;

  @ApiProperty({
    type: Number,
    example: '200',
    description: 'required | number',
  })
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  status: number;

  @ApiProperty({
    type: Object,
    description: 'optional | must object',
  })
  @IsOptional()
  @IsObject()
  @Transform(({ value }) => convertedObject(value))
  json: object = null;

  // @ApiProperty({
  //   type: Object,
  //   description: 'optional | must object',
  // })
  // @IsOptional()
  // @IsObject()
  // @Transform(({ value }) => convertedObject(value))
  // additional_param: object = null;
  @ApiProperty({
    type: Object,
    description: 'optional | must array',
  })
  @IsOptional()
  @IsArray()
  additional_param: Array<string> = null;
}

function convertedObject(value: any): any {
  if (value) {
    return Object.keys(value).length === 0 ? null : value;
  }

  return null;
}
