import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KeywordNotificationAddDTOV2 {
  @ApiProperty({
    required: true,
    example: '63008b6c746163c934b99aa2',
  })
  @IsNotEmpty()
  @IsString()
  notification: string;

  @ApiProperty({
    example:
      'Notification template content loaded from selected notification template',
  })
  @IsString()
  notification_content: string;

  @ApiProperty({
    example: 'Notification type',
  })
  @IsString()
  notif_type: string;

  @ApiProperty({
    example: 'Notification type',
  })
  @IsString()
  transaction_type: string;

  @ApiProperty({
    description: '',
    example: '62ffc2568a01008799e785ef',
  })
  @IsString()
  via: string;
}
