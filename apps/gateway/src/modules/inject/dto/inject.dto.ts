import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class InjectCouponDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiProperty({ type: 'string' })
  @IsString()
  program_id: string;

  @ApiProperty({ type: 'string' })
  @IsString()
  keyword: string;

  @ApiProperty({ type: 'boolean' })
  @IsString()
  send_notification: boolean;
}
export class InjectPointDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiProperty({ type: 'string' })
  @IsString()
  program_id: string;

  @ApiProperty({ type: 'string' })
  @IsString()
  keyword: string;

  @ApiProperty({ type: 'boolean' })
  @IsString()
  send_notification: boolean;
}
export class RedeemDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiProperty({ type: 'string' })
  @IsString()
  keyword_redeem: string;
}
