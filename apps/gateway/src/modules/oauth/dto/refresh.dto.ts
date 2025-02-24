import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class AccountRefreshDTO {
  @ApiProperty({
    example: 'id-ID',
  })
  @IsString()
  locale: string;

  @ApiProperty({
    example: '',
  })
  @IsString()
  refresh_token: string;

  @ApiProperty({
    example:
      process.env.MODE === 'production'
        ? ''
        : 'client-623bdcce7399b50e38fbe93a',
  })
  @IsString()
  client_id: string;

  @ApiProperty({
    example: process.env.MODE === 'production' ? '' : 'x%V74La7',
  })
  @IsString()
  client_secret: string;
}

export class AccountLoginResponseDTO {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'user_refresh_success' })
  @IsString()
  message: string;

  @ApiProperty({ example: 'ey...' })
  @IsString()
  token: string;

  @ApiProperty({ example: null, nullable: true })
  errors: { [key: string]: any };

  account: any;
}
