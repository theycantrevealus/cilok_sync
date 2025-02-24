import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { Lov } from '../../lov/models/lov.model';
import { NotificationTemplate } from '../../notification/models/notification.model';

export class KeywordNotificationAddDTO {
  @ApiProperty({
    required: true,
    example: 'Notification template id',
  })
  @IsNotEmpty()
  @IsString()
  notification: NotificationTemplate;

  @ApiProperty({
    example: 'LOVs NOTIF_VIA',
  })
  @IsString()
  via: Lov;

  @ApiProperty({
    example: '',
  })
  @IsString()
  receiver: Lov;
}
