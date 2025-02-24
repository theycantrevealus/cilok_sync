import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class AccountLoginDTO {
  @ApiProperty({
    example: 'id-ID',
    type: String,
  })
  @IsString()
  locale: string;

  @ApiProperty({
    example: 'business-user',
    type: String,
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: 'hendrytanaka',
    type: String,
  })
  @IsString()
  username: string;

  @ApiProperty({
    example: 's^KJ36w5',
    type: String,
  })
  @IsString()
  password: string;

  @ApiProperty({
    example: 'client-623bdcce7399b50e38fbe93a',
    type: String,
  })
  @IsString()
  client_id: string;

  @ApiProperty({
    example: 'x%V74La7',
    type: String,
  })
  @IsString()
  client_secret: string;
}

export class AccountLoginResponseDTO {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'user_login_success' })
  @IsString()
  message: string;

  @ApiProperty({ example: 'ey...' })
  @IsString()
  token: string;

  @ApiProperty({ example: null, nullable: true })
  errors: { [key: string]: any };

  account: any;
}
