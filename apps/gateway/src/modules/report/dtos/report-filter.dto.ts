import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId } from 'class-validator';

export class ReportFilterDTO {
  @ApiProperty({
    description: 'Program (Object ID)',
    example: '635a73b81125eba1458719c7',
  })
  @IsMongoId()
  program: string;

  @ApiProperty({ description: 'Start Date' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'End Date' })
  @IsDateString()
  end_date: string;
}
