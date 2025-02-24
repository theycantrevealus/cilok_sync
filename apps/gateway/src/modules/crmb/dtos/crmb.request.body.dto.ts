import {ApiProperty} from "@nestjs/swagger";
import {IsString} from "class-validator";
export class CrmbRequestBodyDto {
  @ApiProperty({
    example: '12328123456789',
    required: true,
  })
  @IsString()
  tselId: string;

  @ApiProperty({
    example: 'ESB0410202109230220001',
    required: false,
  })
  @IsString()
  transactionId: string;

  @ApiProperty({
    example: 'A6',
    required: true,
  })
  @IsString()
  channel: string;

  @ApiProperty({
    example: 'User01',
    required: false,
  })
  @IsString()
  userId?: string;

  @ApiProperty({
    example: '20210910 12:33:33:334',
    required: true,
  })
  @IsString()
  timestamp: string;

  @ApiProperty({
    default: 'SSOGetTselIdBindingsGrouped',
    example: 'SSOGetTselIdBindingsGrouped',
    required: false,
  })
  @IsString()
  intRef?: string;
}
