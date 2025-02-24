import {ApiProperty} from "@nestjs/swagger";
import {IsNotEmpty, IsString} from "class-validator";

export class PoineventAddDTO {
  @ApiProperty({
    uniqueItems: true,
    required: true,
    example: '6282199899846',
  })
  @IsString()
  msisdn: string;

  @ApiProperty({
    required: true,
    example: '40000',
  })
  @IsString()
  amount: string;

  @ApiProperty({
    required: true,
    example: '3890900011',
  })
  @IsString()
  lacci: string;

  @ApiProperty({
    required: true,
    example: '02818900000103206989',
  })
  @IsString()
  insys_serial: string;

  @ApiProperty({
    required: true,
    example: '20220919115903',
  })
  @IsString()
  recharge_dt: string;

  @ApiProperty({
    required: true,
    example: '001',
  })
  @IsString()
  recharge_type: string;

  @ApiProperty({
    required: true,
    example: 'null',
  })
  @IsString()
  dealer: string;

  @ApiProperty({
    required: true,
    example: 'MKIOS',
  })
  @IsString()
  psubj: string;

  @ApiProperty({
    required: true,
    example: 'O00',
  })
  @IsString()
  stat_code: string;

  @ApiProperty({
    required: true,
    example: '6012',
  })
  @IsString()
  channel: string;

}

