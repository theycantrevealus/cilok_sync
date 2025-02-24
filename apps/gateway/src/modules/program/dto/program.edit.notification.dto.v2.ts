import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNumber, IsString } from 'class-validator';

import { ProgramNotification } from '@/program/models/program.notification.model.v2';
import { ProgramNotificationV2DTO } from './program.notification.dto.v2';

export class ProgramNotificationEditDTO {
  @ApiProperty({
    type: [ProgramNotificationV2DTO],
    required: true,
    nullable: false,
    description: 'List of Program Notification',
  })
  @IsArray()
  @ArrayNotEmpty()
  data: ProgramNotification[];
}

export class ProgramNotificationEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PROGRAM_NOTIFCATION_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Notification Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
