import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class AccountLogoutDTO {
  @ApiProperty({
    example: 'id-ID',
  })
  @IsString()
  locale: string;
}

export class AccountLogoutResponseDTO {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'user_logout_success' })
  @IsString()
  message: string;

  @ApiProperty({ example: 'ey...' })
  @IsString()
  token: string;

  @ApiProperty({ example: null, nullable: true })
  errors: { [key: string]: any };

  account: any;
}
