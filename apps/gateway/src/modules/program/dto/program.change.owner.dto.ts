import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ProgramChangeOwnerDTO {
  @ApiProperty({
    example: '63b40180924c2b8461462d45',
    required: true,
    description: 'User Id in collection accounts in NonCore',
  })
  @IsString()
  user_id: string;

  @ApiProperty({
    example: '62ffc0fc8a01008799e785bd',
    required: true,
    description: 'program_owner  in collection programv2 in NonCore',
  })
  @IsString()
  program_owner: string;

  @ApiProperty({
    example: '64350ed37ed9b59e7d46862c',
    required: true,
    description: 'program_owner_detail  in collection programv2 in NonCore',
  })
  @IsString()
  program_owner_detail: string;

  @ApiProperty({
    example: '659527f41227a9cbdb3542b5',
    required: true,
    description: 'Program Id in collection programv2 in NonCore',
  })
  @IsString()
  program_id: string;
}
