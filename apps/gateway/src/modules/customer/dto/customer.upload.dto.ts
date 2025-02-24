import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ImportCustomerDto {
  @IsString()
  name: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
