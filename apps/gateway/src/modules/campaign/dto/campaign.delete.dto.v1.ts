import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CampaignDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CAMPAIGN_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Campaign Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
