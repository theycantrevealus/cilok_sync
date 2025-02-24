import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class OutletEditDTO {
  @ApiProperty({
    required: false,
    example: '21421421',
    description: 'Outlet Code',
  })
  @IsString()
  outlet_code: string;
  
  @ApiProperty({
    required: false,
    example: '62ffe0208ff494affb56fef1',
    description: 'Data Source: <b>[GET]location endpoint</b><br />',
  })
  @IsString()
  regional: string;

  @ApiProperty({
    required: false,
    example: '630de9a4e28162d7696c908d',
    description: 'Data Source: <b>[GET]location endpoint</b><br />',
  })
  @IsString()
  branch: string;

  @ApiProperty({
    required: false,
    example: 'M SPACE - SMS',
    description: 'Outlet name',
  })
  @IsString()
  outlet_name: string;

  @ApiProperty({
    required: false,
    example: 'Plaza Medan fair',
    description: 'Outlet Address',
  })
  @IsString()
  outlet_address: string;

  @ApiProperty({
    required: false,
    example: '-6.160799',
    description: 'longtitude maps',
  })
  @IsString()
  longtitude: string;

  @ApiProperty({
    required: false,
    example: '106.818717',
    description: 'latitude maps',
  })
  @IsString()
  latitude: string;

  @ApiProperty({
    required: true,
    example: '62ffe0208ff494affb56fef1',
    description: 'Data Source: <b>[GET]location endpoint</b><br />',
  })
  @IsNotEmpty()
  @IsString()
  location_id: string;

  @ApiProperty({
    example: '6310e4d77efae2c4a2b34462',
    required: false,
    description: '',
  })
  @IsString()
  location_type: string;

  @ApiProperty({
    example: '6310e4d77efae2c4a2b34462',
    required: false,
    description: '',
  })
  @IsString()
  location_area_identifier: string;

  @ApiProperty({
    example: '6310e4d77efae2c4a2b34462',
    required: false,
    description: '',
  })
  @IsString()
  location_region_identifier: string;
}

export class OutletEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'OUTLET_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Outlet Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
