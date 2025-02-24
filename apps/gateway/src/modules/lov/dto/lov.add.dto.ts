import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class LovAddDTO {
  @ApiProperty({
    required: true,
    type: 'string',
    example: 'group name',
  })
  @IsNotEmpty()
  @IsString()
  group_name: string;

  @ApiProperty({
    required: true,
    type: 'string',
    example: 'set value',
  })
  @IsNotEmpty()
  @IsString()
  set_value: string;

  @ApiProperty({
    required: true,
    type: 'string',
    example: 'description for current lov',
  })
  @IsString()
  description: string;

  @ApiProperty({
    required: false,
    example: '',
  })
  @IsOptional()
  additional: object | any;
}

export class LovAddBulkDTO {
  @ApiProperty({
    required: true,
    type: [LovAddDTO],
    example: [],
  })
  @IsNotEmpty()
  @IsArray()
  lov_datas: LovAddDTO[];
}

export class LovAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'LOV_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Lov Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
