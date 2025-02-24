import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { isValidObjectId, ObjectId } from 'mongoose';

import { toMongoObjectId } from '@/decorators/object.id.decorator';
import { Lov } from '@/lov/models/lov.model';

export class ProgramNotificationV2DTO {
  @ApiProperty({
    required: true,
    example: '62ffc0fc8a01008799e785bd',
    description: `Required, Not Empty,`,
  })
  @IsNotEmpty()
  @Transform(toMongoObjectId)
  @Type(() => isValidObjectId)
  _id: ObjectId;

  @ApiProperty({
    required: false,
    type: String,
    isArray: true,
    example: ['62ffc2988a01008799e785fd', '62ffc2988a01008799e785fe'],
    description: `<a target="_blank" rel="noopener noreferrer" href="#/LOV (List of Values) Management/LovController_get_notif_via">Data Source</a>`,
  })
  @IsArray()
  via: string[];

  @ApiProperty({
    required: false,
    type: String,
    isArray: true,
    example: ['6302488d53b5ef1a0e17457b', '6302489253b5ef1a0e174589'],
    description: 'Reciver',
  })
  @IsArray()
  receiver: string[];

  @ApiProperty({
    required: false,
    example: 'Example of program threshold alarm expired',
    description: `Load notification content from selected <b>template</b>. Customizable content notification template`,
  })
  @IsString()
  template_content: string;
}
