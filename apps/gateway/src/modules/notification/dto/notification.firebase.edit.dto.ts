import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { Lov } from '@/lov/models/lov.model';
import { Channel } from '@/channel/models/channel.model';

export class NotificationFirebaseEditDTO {
  @ApiProperty({
    required:false,
    example: true,
  })
  @IsBoolean()
  is_read: boolean;
}

export class NotificationFirebaseEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'NOTIFICATION_FIREBASE_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Notification Message Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
