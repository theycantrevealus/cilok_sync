import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

import { Campaign } from '@/campaign/models/campaign.model.v1';
import { Customer } from '@/customer/models/customer.model';

export class CampaignRecipientEditDTO {
  @ApiProperty({
    required: false,
    type: String,
    description: `_Id`,
  })
  @IsString()
  _id: string;

  @ApiProperty({
    required: true,
    type: String,
    description: `Campaign`,
  })
  @IsString()
  campaign: Campaign;

  @ApiProperty({
    required: true,
    type: Customer,
    description: `Customer`,
  })
  @IsString()
  customer: Customer;

  @ApiProperty({
    example: '08192188291',
    description: `Msisdn`,
  })
  @IsString()
  msisdn: string;

  @ApiProperty({
    example: 'test@gmail.com',
    description: `Email`,
  })
  @IsString()
  email: string;
}

export class CampaignRecipientEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CAMPAIGN_RECIPIENT_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Campaign Recipient Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
