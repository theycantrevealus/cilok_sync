import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class LovEditDTO {
  @ApiProperty({
    required: true,
    example: 'group name',
  })
  @IsNotEmpty()
  @IsString()
  group_name: string;

  @ApiProperty({
    required: true,
    example: 'set value',
  })
  @IsNotEmpty()
  @IsString()
  set_value: string;

  @ApiProperty({
    required: true,
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

export class LovEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'LOV_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Lov Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
