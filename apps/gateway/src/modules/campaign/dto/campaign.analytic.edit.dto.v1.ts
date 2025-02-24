import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { Lov } from '@/lov/models/lov.model';
import { NotificationTemplate } from '@/notification/models/notification.model';

export class CampaignAnalyticEditDTO {
  @ApiProperty({
    type: String,
    required: true,
    example: 'Campaign tukar poin',
    description: `Write campaign name in this field </br>`,
  })
  @IsString()
  name: string;

  @ApiProperty({
    type: String,
    required: true,
    example: 'Campaign ini untuk mengajak masyarakat untuk tukar poin',
    description: `Write campaign description in this field </br>`,
  })
  @IsString()
  description: string;

  @ApiProperty({
    type: String,
    required: true,
    example: '63063d4055d5193fcac95fe7',
    description: `<a target="_blank" rel="noopener noreferrer" href="#/Notification%20Template%20Management/NotificationController_index">Data Source</a><br />
      Data from notification/template.</br>
      This field is Required`,
  })
  @IsNotEmpty()
  @IsString()
  notification_template: NotificationTemplate;

  @ApiProperty({
    type: String,
    required: false,
    example: 'Berbagi untuk dunia pendidikan semudah tuker POIN',
    description: `You can write content campaign notificaition in this field </br>`,
  })
  @IsString()
  notification_content: string;

  @ApiProperty({
    type: String,
    required: true,
    example: '2017-09-15 00:00:00',
    description: `Campaign execute time </br>`,
  })
  @IsString()
  execute_time: string;

  @ApiProperty({
    type: Array,
    required: false,
    example: ['62ffc2988a01008799e785fe', '63430cb651c318ac191b1d9b'],
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV%20(List%20of%20Values)%20Management/LovController_get_notif_via">Data Source</a><br />
    Data from lov/notif_via.`,
  })
  @IsNotEmpty()
  notif_via: Array<Lov>;

  @ApiProperty({
    required: false,
    type: Array,
    example: ["KEYWORD1","KEYWORD2"],
    description: `You can add multiple data on this field, example : </br>
    <pre>
      <code>
      ["KEYWORD1","KEYWORD2"]
      </code>
    </pre><br />`,
  })
  @IsArray()
  keyword: Array<string>;

  @ApiProperty({
    required: true,
    example: {},
    description: `Segmentation filter configuration </br>`,
  })
  @IsNotEmpty()
  segmentation: any;
}
