import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SetConfigDTO {
  @ApiProperty({
    required: true,
    example: 'DEFAULT_STATUS_PROGRAM_ADD',
  })
  @IsNotEmpty()
  @IsString()
  param_key: string;

  @ApiProperty({
    required: true,
    example: 'Configuration Value',
  })
  @IsNotEmpty()
  param_value: object | string;

  @ApiProperty({
    required: true,
    example: 'Configuration Explanation',
  })
  @IsString()
  description: string;
}

export class SetConfigDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CONFIG_SYSTEM_UPDATE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Application Config Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
