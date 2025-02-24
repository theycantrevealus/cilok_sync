import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class NotificationDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'NOTIFICATION_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Notification Template Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
