import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsMongoId, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class LocationBucketAddDTO {
  @ApiProperty({
    required: true,
    example: 'Bucket 001',
  })
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  bucket_name: string;

  @ApiProperty({
    required: true,
    example: '636de5484a5bee4e15294f48',
    description: 'Lov ID, reference to API (GET: /v1/lov), filter: {"group_name":"BUCKET_TYPE"}'
  })
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  @IsMongoId()
  bucket_type: string;

  @ApiProperty({
    required: true,
    example: {
      username:"username (only if LinkAja Bucket Type)",
      secret_key:"secret_key (only if LinkAja Bucket Type)",
      short_code:"short_code (only if NGRS Bucket Type)",
    },
    description: 
      `Type your value by bucket type: <br>`+
      `LinkAja (Main) & LinkAja (Bonus) : username & secret_key <br>`+
      `NGRS : short_code`
  })
  @IsNotEmpty()
  @IsDefined()
  @IsObject()
  specify_data: object;

  @ApiProperty({
    required: true,
    example: '63208c59860f4880de169ee8',
    description: 'Pic ID, reference to API (GET: /v1/lov)'
  })
  @IsNotEmpty()
  @IsDefined()
  @IsString()
  @IsMongoId()
  pic: string;

  @ApiProperty({
    required: true,
    example: 'NzM5jjN1W',
    description: ''
  })
  @IsOptional()
  @IsDefined()
  @IsString()
  element1: string;

}

export class LocationBucketAddDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'BUCKET_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Location Bucket Created Successfully' })
  @IsString()
  message: string;

  payload: any;
}
