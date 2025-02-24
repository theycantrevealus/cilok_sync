import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ProgramSingleTempAddDTO {
  @ApiProperty({
    enum: ['whitelist', 'blacklist'],
    example: 'whitelist',
    description: 'Type of data',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: '682322888787',
    description: `MSISDN of the customer you want to save. Must be starts with 68`,
  })
  @IsString()
  msisdn: string;

  @ApiProperty({
    example: '',
    description: `Program  OID`,
  })
  @IsString()
  program: string;

  @ApiProperty({
    required: false,
    type: 'number',
    example: 10,
    description: `Whitelist counter of each msisdn. Ignored for blacklist type`,
  })
  @IsNumber()
  counter: string;
}
