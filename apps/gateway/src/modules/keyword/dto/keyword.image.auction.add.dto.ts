import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ImageAuctionAddDTO {
  @ApiProperty({ type: 'string', format: 'binary' })
  @IsNotEmpty()
  @IsString()
  image: any;
}

export class ImageLocationDTOResponse {
  @ApiProperty({ example: 'Image Location Local' })
  @IsString()
  image_local: string;

  @ApiProperty({ example: 'Image Location Telkomsel' })
  @IsString()
  image_telkomsel: string;
}

export class ImageAuctionDTOResponse {
  @ApiProperty({ example: 200 })
  @IsNumber()
  status: number;

  @ApiProperty({ example: 'IMAGE_AUCTION_ADD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Image Auction Created Successfully' })
  @IsString()
  message: string;

  payload: any | ImageLocationDTOResponse;
}


