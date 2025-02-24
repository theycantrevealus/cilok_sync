import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class FilterAuditTrailDto {
  @ApiProperty()
  @IsOptional()
  lazyEvent: string;
}
