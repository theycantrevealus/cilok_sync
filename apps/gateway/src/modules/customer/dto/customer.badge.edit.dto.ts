import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CustomerBadgeEditDTO {
  @ApiProperty({
    uniqueItems: true,
    required: true,
    example: 'Travelist',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Badge description.',
  })
  @IsString()
  description: string;
}

export class CustomerBadgeEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'BADGE_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Customer Badge Edit Successfully' })
  @IsString()
  message: string;

  payload: any;
}
