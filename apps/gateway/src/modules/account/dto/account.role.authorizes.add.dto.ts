import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RoleAuthorizesAddDTO {
  @ApiProperty({
    example: 'Page:Merchant:Payment',
  })
  @IsString()
  object_code: string;

  @ApiProperty({
    type: 'string',
    isArray: true,
  })
  @IsString()
  action_codes: string[];
}
