import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class LocationDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'LOCATION_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Location Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
