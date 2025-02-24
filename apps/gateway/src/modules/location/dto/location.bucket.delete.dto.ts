import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class LocationBucketDeleteDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'BUCKET_DELETE' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Location Bucket Deleted Successfully' })
  @IsString()
  message: string;

  payload: any;
}
