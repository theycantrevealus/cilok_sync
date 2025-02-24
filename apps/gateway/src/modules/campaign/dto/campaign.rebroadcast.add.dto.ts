import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { Lov } from '@/lov/models/lov.model';
import { NotificationTemplate } from '@/notification/models/notification.model';

export class CampaignRebroadcastDTO {
  @ApiProperty({
    type: String,
    required: true,
    example: '63063d4055d5193fcac95fe7',
    description: `Write campaign id in this field </br>`,
  })
  @IsString()
  campaign_id: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'Berbagi untuk lingkungan hijau semudah tuker POIN',
    description: `Write campaign notification content for rebroadcast in this field </br>`,
  })
  @IsString()
  notif_content: string;

  @ApiProperty({
    type: String,
    required: true,
    example: '2023-05-30 10:00:00',
    description: `Campaign execute time </br>`,
  })
  @IsString()
  execute_time: string;
}
