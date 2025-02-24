import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class LovDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'LOV_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Lov deleted successfully' })
  @IsString()
  message: string;

  payload: any;
}
