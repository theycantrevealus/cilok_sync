import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ChannelEditDTO {
  @ApiProperty({
    required: true,
    example: 'A0',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    required: false,
    example: '10.12.125.122',
  })
  // @IsNotEmpty()
  @IsString()
  ip: string;

  @ApiProperty({
    required: true,
    example: 'MyTelkomsel',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    required: false,
    example: 'description for current channel',
  })
  @IsString()
  description: string;
}

export class ChannelEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CHANNEL_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Channel Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
