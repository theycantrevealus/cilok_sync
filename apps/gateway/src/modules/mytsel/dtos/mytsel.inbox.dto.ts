import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { MyTselTypeEnum } from '../constant/mytsel.type.enum';

export class MyTselInboxDetailDto {
  @ApiProperty({
    required: true,
    description: 'indihome number / tsel id',
  })
  @IsNotEmpty()
  service_id: string;

  @ApiProperty({
    required: true,
    description: 'Title of inbox',
  })
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    required: true,
    description: 'Content of inbox',
  })
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    required: true,
    description: 'id',
  })
  @IsNotEmpty()
  language: string;

  @ApiProperty({
    required: true,
    description: '2023-12-12 12:12:12',
  })
  @IsNotEmpty()
  timestamp: string;
}

export class MyTselInboxDto {
  @ApiProperty({
    description: 'inbox',
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
    description: 'Inbox content',
  })
  @Type(() => MyTselInboxDetailDto)
  inbox: MyTselInboxDetailDto;

  constructor() {
    this.type = MyTselTypeEnum.inbox;
  }
}
