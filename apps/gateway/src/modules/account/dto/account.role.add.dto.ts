import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { RoleAuthorizesAddDTO } from './account.role.authorizes.add.dto';

export class RoleAddDTO {
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
    type: String,
    isArray: true,
    required: false,
    description: '',
  })
  @Transform((data) => {
    if (data.value) {
      if (data.value.constructor === String) {
        const value = data.value.toString();
        const raw = `[${value.replace(/\s|\\r/gm, '')}]`;
        const parsed = JSON.parse(raw);
        return parsed;
      } else {
        return data.value;
      }
    } else {
      return [];
    }
  })
  @IsNotEmpty()
  authorizes: string[];

  @ApiProperty({
    example: 'Active',
    description: 'Account status',
    enum: ['Active'],
  })
  @IsString()
  status: string;
}

export class RoleAddDTOResponse {
  @ApiProperty({ example: 201 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'ROLE_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Role Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
