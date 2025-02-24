import { availableDataSync } from '@data_sync/const/available-sync';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsObject, IsString } from 'class-validator';

export class DataSyncDTO {
  @ApiProperty({
    required: true,
    type: String,
    example: 'accounts',
    enum: availableDataSync,
    description: 'Data source',
  })
  @IsString()
  target: string;

  @ApiProperty({
    required: true,
    example: 'create',
    type: String,
    description: 'create, update, or delete',
  })
  @IsString()
  event: string;

  @ApiProperty({
    required: true,
    example: 'user-xxxxxxxx',
    type: String,
    description: 'Core data identifier',
  })
  @IsString()
  identifier: string;

  @ApiProperty({
    required: false,
    example: {},
    description: '',
  })
  @IsDefined()
  @IsObject()
  additional: any;

  @ApiProperty({
    required: false,
    example: {},
    description: '',
  })
  // @IsDefined()
  @IsObject()
  result: any;
}
