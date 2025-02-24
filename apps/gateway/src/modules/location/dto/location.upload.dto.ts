import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LocationImportDto {
  @ApiProperty({ required: false, type: String, enum: ['LACIMA', 'Telkomsel'] })
  @IsString()
  data_source: string;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
