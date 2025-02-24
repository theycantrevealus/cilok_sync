import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ProgramIsDraftEditDTO {
  @ApiProperty({
    required: true,
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  is_draft: boolean;
}

export class ProgramIsDraftEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'PROGRAM_IS_DRAFT_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Program Is Draft Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
