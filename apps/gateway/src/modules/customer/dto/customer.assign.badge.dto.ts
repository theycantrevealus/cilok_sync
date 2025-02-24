import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

import { CustomerBadge } from '../models/customer.badge.model';
import { Customer } from '../models/customer.model';

export class CustomerBadgeAssignDTO {
  @ApiProperty({
    required: true,
    example: '',
  })
  @IsString()
  customer: Customer;

  @ApiProperty({
    required: true,
    example: '',
  })
  @IsString()
  badge: CustomerBadge;
}

export class CustomerBadgeAssignDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'CUSTOMER_ASSIGN_BADGE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Badge Assign Successfully' })
  @IsString()
  message: string;

  payload: any;
}
