import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';


export class ResendSmsDto {
  @ApiProperty({
    example: '08xxxxx',
    description: 'Sender origin',
  })
  @IsString()
  from: string;

  @ApiProperty({
    example: '08xxxxx',
    description: 'No destination to send otp',
  })
  @IsString()
  to: string;

  @ApiProperty({
    example: 'Request send otp',
    description: 'Request for send otp',
  })
  @IsString()
  text: string;
}
