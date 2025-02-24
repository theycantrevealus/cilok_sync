import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { Lov } from '@/lov/models/lov.model';
import { NotificationTemplate } from '@/notification/models/notification.model';

export class CampaignEditDTO {
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
}

/**
 * @deprecated
 */
export class CampaignWithReceiptEditDTO {
  @ApiProperty({
    type: String,
    required: true,
    example: '63063d4055d5193fcac95fe9',
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV%20(List%20of%20Values)%20Management/LovController_get_notif_type">Data Source</a><br />
      Data from lov/notif_type.</br>
      This field is Required`,
  })
  @IsNotEmpty()
  @IsString()
  notification_type: Lov;

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
    required: false,
    example: '63063d4055d5193fcac95fe9',
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV%20(List%20of%20Values)%20Management/LovController_get_notif_via">Data Source</a><br />
    Data from lov/notif_via.`,
  })
  @IsNotEmpty()
  @IsString()
  notif_via: Lov;

  @ApiProperty({
    required: false,
    type: Array,
    example: [
      {
        customer: '63063d4055d5193fcac95f12',
        msisdn: '626162712',
        email: 'test1@gmail.com',
      },
    ],
    description: `You can add multiple data on this field, example : </br>
    <pre>
      <code>
      [
        {
          customer : "63063d4055d5193fcac95f12",
          msisdn : "626162712",
          email : "test1@gmail.com"
        },
        {
          customer : "63063d4055d5113fcac98f12",
          msisdn : "626162782",
          email : "test2@gmail.com"
        }
      ]
      </code>
    </pre>
    Field Customer from this : <a target="_blank" rel="noopener noreferrer" href="#/Customer%20Management/CustomerController_get_customer">Data Source</a><br />`,
  })
  @IsArray()
  recipient: [];
}

export class CampaignEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CAMPAIGN_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Campaign Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
