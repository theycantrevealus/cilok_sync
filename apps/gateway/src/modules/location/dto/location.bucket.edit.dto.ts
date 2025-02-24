import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class LocationBucketEditDTO {
  @ApiProperty({
    required: false,
    example: 'Bucket Name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class LocationBucketEditDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'BUCKET_EDIT' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Location Bucket Updated Successfully' })
  @IsString()
  message: string;

  payload: any;
}
