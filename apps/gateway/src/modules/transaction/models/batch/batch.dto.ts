import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class BatchDto {
  @ApiProperty({
    title: 'Name Of Directory',
    description:
      'You can set the location file upload target to start scanning the directory location',
    required: true,
    example: './uploads/redeem',
  })
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  dir: string;

  @ApiProperty({
    title: 'send notification flag',
    description: 'flag send notification',
    required: false,
    example: false,
  })
  @IsBoolean()
  send_notification: boolean;

  @ApiProperty({
    title: 'Token',
    description:
      'Token',
    required: false
  })
  @IsString()
  token?: string;

  @IsString()
  identifier?: string;
}
