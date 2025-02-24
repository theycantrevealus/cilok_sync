import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { Lov } from '../../lov/models/lov.model';
import { Location } from '../models/location.model';

export class LocationAddDTO {
  @ApiProperty({
    required: true,
    example: 'Location Code',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    enum: ['LACIMA','Telkomsel'],
    example: 'LACIMA',
    required: false,
    description: `
    <ol>
    <li>LACIMA</li>
    <li>Telkomsel</li>
    </ol>
    `,
  })
  @IsString()
  data_source: string;

  @ApiProperty({
    description: `<a target="_blank" rel="noopener noreferrer" href="#/Location Management/LocationController_index">Data Source</a><br />
    For example only:<br />
    62fc05f14d1108a027cbe148<br />
    62fe83c3e858380ef4677eb6`,
    type: [String],
    required: true,
    example: ['62ffc2988a01008799e785fd', '62ffc2988a01008799e785fe'],
  })
  @IsArray()
  adhoc_group: Location[];

  @ApiProperty({
    required: true,
    example: 'Location Name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    required: true,
    example: '[LOV] LOCATION_TYPE',
  })
  @IsString()
  @IsNotEmpty()
  type: Lov;

  @ApiProperty({
    required: false,
    example: 'Location id as parent',
  })
  parent: Location;
}

export class LocationBulkDTO {
  @ApiProperty({
    required: true,
    type: [LocationAddDTO],
    example: [],
  })
  @IsNotEmpty()
  @IsArray()
  datas: LocationAddDTO[];
}

export class LocationAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'LOCATION_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Location Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
