import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { isValidObjectId, ObjectId } from 'mongoose';

import { toMongoObjectId } from '@/decorators/object.id.decorator';

export class ProgramNotificationDTO {
  @ApiProperty({
    required: true,
    description: `Notification template _id. Produce this step in FE:
    <ol>
    <li>Load program notification requirements list from <a target="_blank" rel="noopener noreferrer" href="#/Notification Template Management/NotificationController_index">here</a></li>
    <li>Select notification template and the content on selected event</li>
    <li>Store it on array of object and send it as program_notification</li>
    </ol>
    `,
    example: '63008b6c746163c934b99aa2',
  })
  @IsNotEmpty()
  @IsString()
  @Transform(toMongoObjectId)
  @Type(() => isValidObjectId)
  template: ObjectId;

  @ApiProperty({
    example: 'Notification template example',
    description: `Load notification content from selected <b>template</b>. Customizable content notification template`,
  })
  @IsString()
  template_content: string;

  @ApiProperty({
    required: false,
    type: String,
    isArray: true,
    example: ['62ffc2988a01008799e785fd', '62ffc2988a01008799e785fe'],
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_notif_via">Data Source</a>`,
  })
  @IsArray()
  // @Transform(toMongoObjectId)
  // @Type(() => isValidObjectId)
  via: string[];

  @ApiProperty({
    required: false,
    type: String,
    isArray: true,
    example: ['6302488d53b5ef1a0e17457b', '6302489253b5ef1a0e174589'],
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_notif_receiver">Data Source</a>`,
  })
  @IsArray()
  receiver: string[];
  
  @ApiProperty({
    example: '62ffc2568a01008799e785ef',
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_notif_type">Data Source</a>`,
  })
  @IsString()
  @Transform(toMongoObjectId)
  @Type(() => isValidObjectId)
  notif_type: string;
}
