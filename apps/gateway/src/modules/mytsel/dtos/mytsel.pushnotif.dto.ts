import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { MyTselTypeEnum } from '../constant/mytsel.type.enum';

export class MyTselPushNotifDetailDto {
  @ApiProperty({
    description: 'indihome number / tsel id',
  })
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    required: false,
    description: 'Title of push notif',
  })
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    required: false,
    description: 'Content of push notif',
  })
  @IsNotEmpty()
  content: string;
}

export class MyTselPushNotifDto {
  @ApiProperty({
    description: 'push_notif',
  })
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    required: false,
    description: 'state_123',
  })
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    required: false,
    description: 'i1',
  })
  @IsNotEmpty()
  channel: string;

  @ApiProperty({
    required: false,
    description: 'TRX_20231101212314412',
  })
  @IsNotEmpty()
  transaction_id: string;

  @ApiProperty({
    required: false,
    description: 'Push notif content',
  })
  @Type(() => MyTselPushNotifDetailDto)
  inbox: MyTselPushNotifDetailDto;

  constructor() {
    this.type = MyTselTypeEnum.pushNotif;
  }
}
