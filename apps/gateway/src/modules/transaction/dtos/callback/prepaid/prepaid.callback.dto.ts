import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CallbackPrepaidDTO {
  @ApiProperty({
    required: false,
    example: '',
    description: `Channel transaction id`,
  })
  @IsString()
  transaction_id: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `A Number`,
  })
  @IsString()
  service_id_a: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `B Number`,
  })
  @IsString()
  service_id_b: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Error Code`,
  })
  @IsString()
  error_code: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Messages`,
  })
  @IsString()
  detail_code: string;

  @ApiProperty({
    required: false,
    example: '',
    description: `Order Id`,
  })
  @IsString()
  charging_orderid: string;
}
