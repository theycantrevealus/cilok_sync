import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KeywordShiftAddDTO {
  @ApiProperty({
    example: '00:00',
  })
  @IsString()
  from: string;

  @ApiProperty({
    example: '00:00',
  })
  @IsString()
  to: string;
}
