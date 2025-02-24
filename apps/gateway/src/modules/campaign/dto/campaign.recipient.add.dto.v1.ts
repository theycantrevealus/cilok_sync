import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { Campaign } from '@/campaign/models/campaign.model';
import { HttpCodeTransaction, HttpMsgTransaction } from '@/dtos/global.http.status.transaction.dto';

export class CampaignRecipientAddDTO {
  @ApiProperty({
    example: '6311f6d3e11c4bf476a889d6',
    type: String,
    description: `Campaign ID`,
  })
  @IsString()
  campaign_id: Campaign;

  @ApiProperty({ 
    required: true,
    type: String, 
    format: 'binary',
    description: '.csv file',
  })
  @IsNotEmpty()
  file: any;
}

export class CampaignRecipientAddDTOResponse {
  @ApiProperty({
    example: HttpCodeTransaction.CODE_SUCCESS_200,
    description: HttpMsgTransaction.DESC_CODE_SUCCESS_200,
  })
  code: string;

  @ApiProperty({
    example: 'Your request proceed failed',
    description: 'Returning a message',
  })
  message: string;

  payload: any;
}
