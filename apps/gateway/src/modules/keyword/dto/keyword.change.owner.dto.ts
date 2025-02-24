import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class KeywordChangeOwnerDTO {
  @ApiProperty({
    example: '63b40180924c2b8461462d45',
    required: true,
    description: 'User Id in collection accounts in NonCore',
  })
  @IsString()
  user_id: string;

  @ApiProperty({
    example: '65cde3f20c7bb78d53434bf7',
    required: true,
    description: 'Keyword Id in collection keywords in NonCore',
  })
  @IsString()
  keyword_id: string;
}
