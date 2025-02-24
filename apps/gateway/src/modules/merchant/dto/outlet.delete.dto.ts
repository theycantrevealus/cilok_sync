import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class OutletDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'OUTLET_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Outlet Delete Successfully' })
  @IsString()
  message: string;

  payload: any;
}
