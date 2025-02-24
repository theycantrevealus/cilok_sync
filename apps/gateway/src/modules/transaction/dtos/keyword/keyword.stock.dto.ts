import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KeywordStockParamDTO {
  @ApiProperty({
    required: false,
    description: `Return only data matching to filter <br>
    { "code": "X", "name": "Y" }
    `,
  })
  @IsString()
  filter: string;
}
