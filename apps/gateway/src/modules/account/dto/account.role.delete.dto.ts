import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class RoleDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'ROLE_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Role Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
