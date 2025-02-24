import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDefined,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
export class StockDTO {
  @ApiProperty({
    description: 'Id Location from smile loyalty DB',
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  location: string;

  @ApiProperty({
    description: 'Id Product from smile loyalty DB',
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  product: string;

  @ApiProperty({
    description: 'QTY greater than 0',
    type: Number,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsNumber()
  @Min(1, {
    message: 'QTY greater than 0',
  })
  qty?: number;

  @ApiProperty({
    description: 'Id Keyword from smile loyalty DB',
    type: String,
    required: false,
  })
  @IsString()
  @IsMongoId()
  keyword?: string;

  @ApiProperty({
    description: 'transaction_id form transaction_master',
    type: String,
    required: false,
  })
  @IsString()
  transaction_id?: string;

  @ApiProperty({
    description: 'notification_code from transaction_master',
    type: String,
    required: false,
  })
  @IsString()
  notification_code?: string;

  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  stock_update_id?: string;

  @ApiProperty({
    description: 'initial_balance for prevention rollback_stock',
    type: Number,
    required: false,
  })
  @IsString()
  initial_balance?: number;

  @ApiProperty({
    description: 'QTY FlashSale greater than 0',
    type: Number,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsNumber()
  @Min(1, {
    message: 'QTY FlashSale greater than 0',
  })
  qty_flashsale?: number;

  @ApiProperty({
    description: 'notification_code from transaction_master',
    type: Boolean,
    required: false,
  })
  @IsBoolean()
  is_flashsale?: boolean | false;

  added_by?: string;
  logged_at?: Date;
  __v?: number;
}
