import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString } from 'class-validator';

export class MerchantOutletEditDTO {
  @ApiProperty({
    required: false,
    example: '62ffe0208ff494affb56fef1',
    description: 'Data Source: <b>[GET]merchant endpoint</b><br />',
  })
  @IsString()
  merchant: string;

  @ApiProperty({
    type: [String],
    description: `A <a target="_blank" rel="noopener noreferrer" href="#/Program Management/OutletController_get_outlet_prime">outlets</a> this is data outlets`,
    example: ['639bdf0956f06b7b3376680d', '63beb63c390a5427930367bb'],
  })
  @IsArray()
  outlet: string[];
}

export class MerchantOutletEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'MERCHANT_OUTLET_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Merchant Outlet Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
