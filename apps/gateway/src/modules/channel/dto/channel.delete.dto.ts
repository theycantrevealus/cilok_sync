import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ChannelDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CHANNEL_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Channel Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
