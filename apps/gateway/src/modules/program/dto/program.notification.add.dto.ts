import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ProgramNotificationAddDTO {
  @ApiProperty({
    required: true,
    example: 'Notification template id',
  })
  @IsNotEmpty()
  @IsString()
  notification: string;

  @ApiProperty({
    example: 'LOVs NOTIF_VIA',
  })
  @IsString()
  via: string;

  @ApiProperty({
    example: '',
  })
  @IsString()
  receiver: string;
}
