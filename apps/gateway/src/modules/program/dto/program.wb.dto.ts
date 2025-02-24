import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ProgramImportWBDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiProperty({ type: 'string', enum: ['whitelist', 'blacklist'] })
  @IsString()
  type: string;

  @ApiProperty({ type: 'string', enum: ['msisdn', 'indihome', 'tselid'] })
  @IsString()
  identifier: string;

  @ApiProperty({ type: 'string' })
  @IsString()
  program: string;
  constructor(data: any) {
    this.file = data.file;
    this.type = data.type;
    this.program = data.program;
    this.identifier = data.identifier;
  }
}
