import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerBadgeAddDTO {
  @ApiProperty({
    uniqueItems: true,
    required: true,
    example: 'Foodist',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Badge description.',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: 'Badge experience name.',
  })
  @IsString()
  experience_name: string;
}

export class CustomerBadgeAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'BADGE_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Badge Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
