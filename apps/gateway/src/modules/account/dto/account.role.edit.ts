import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class RoleEditDTO {
  @ApiProperty({
    example: 'Basic Role',
    description: 'New role name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Role description',
    description: 'Role description',
  })
  @IsString()
  desc: string;

  @ApiProperty({
    example: [],
    description: 'Authorize items',
  })
  @IsArray()
  authorizes: [];

  @ApiProperty({
    example: 'Active',
    description: 'Account status',
    enum: ['Active'],
  })
  @IsString()
  status: string;

  @ApiProperty({
    example: 0,
    description: 'Account status',
  })
  @Transform((value) => value.value + 1)
  @IsNumber()
  __v: number;
}

export class RoleEditDTOResponse {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'ROLE_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Role Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
