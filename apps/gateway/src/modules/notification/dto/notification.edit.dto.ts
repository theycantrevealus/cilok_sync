import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { Lov } from '@/lov/models/lov.model';
import { Channel } from '@/channel/models/channel.model';

export class NotificationEditDTO {
  @ApiProperty({
    required:false,
    example: 'Code',
    uniqueItems: true,
  })
  @IsString()
  code: string;
  
  @ApiProperty({
    required: true,
    example: '62ffc2568a01008799e785ef',
  })
  @IsNotEmpty()
  @IsString()
  notif_type: Lov;

  @ApiProperty({
    required: true,
    example: 'Example Notif',
  })
  @IsNotEmpty()
  @IsString()
  notif_name: string;

  @ApiProperty({
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_notif_via">Data Source</a><br />
    For example only:<br />
    62fc05f14d1108a027cbe148<br />
    62fe83c3e858380ef4677eb6`,
    type: [String],
    required: true,
    example: ['62ffc2988a01008799e785fd', '62ffc2988a01008799e785fe'],
  })
  @IsNotEmpty()
  @IsArray()
  notif_via: Lov[];

  @ApiProperty({
    required: true,
    example: 'Hello World',
  })
  @IsNotEmpty()
  @IsString()
  notif_content: string;

  @ApiProperty({
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_notif_receiver">Data Source</a>
    62fc05f14d1108a027cbe148<br />
    62fe83c3e858380ef4677eb6`,
    type: [String],
    required: true,
    example: ['62fc05f14d1108a027cbe148', '62fe83c3e858380ef4677eb6'],
  })
  @IsNotEmpty()
  @IsArray()
  receiver: Lov[];

  
  @ApiProperty({
    description: `<a target="_blank" rel="noopener noreferrer" href="#/Location Management/LocationController_index">Data Source</a><br />List of channels.<br />Defining location will grant access for each of them to modify current keyword based on their role's privileges.<br />
    Front End : Need to show ID & Name. Ex : ID001 - Channel Name<br />
    Customer Channel, including but not limited to:
    <ul>
    <li>Web Channel</li>
    <li>SMS</li>
    <li>UMB</li>
    <li>External 3rd Party App Channel, e.g. Virtual Assistant, MyTelkomsel, Maxstream Microsite; MyTelkomsel Web; MyTelkomsel Mobile;</li>
    </ul>
    For example only:<br />
    62fc05f14d1108a027cbe148<br />
    62fe83c3e858380ef4677eb6`,
    type: [String],
    required: false,
    example: ['62fc05f14d1108a027cbe148', '62fe83c3e858380ef4677eb6'],
  })
  @IsNotEmpty()
  @IsArray()
  channel_id: Channel[];

  @ApiProperty({
    description: ``,
    type: [String],
    required: false,
    example: ['PROGRAM_NAME', 'KEYWORD_TIME_ZONE'],
  })
  @IsNotEmpty()
  @IsArray()
  variable: string[];
}

export class NotificationEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'NOTIFICATION_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Notification Template Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
