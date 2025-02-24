import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerBadgeUnAssignDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CUSTOMER_UNASSIGN_BADGE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Badge Unassigned Successfully' })
  @IsString()
  message: string;

  payload: any;
}
