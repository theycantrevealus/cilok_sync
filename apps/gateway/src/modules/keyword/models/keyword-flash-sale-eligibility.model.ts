import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsNumber, IsOptional } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';

export type KeywordFlashSaleEligibilityDocument = KeywordFlashSaleEligibility &
  Document;

@Schema()
export class KeywordFlashSaleEligibility {
  @ApiProperty({
    example: false,
    description: 'Flashsale',
  })
  @IsBoolean()
  @Prop({ type: SchemaTypes.Boolean, default: false })
  status: boolean;

  @ApiProperty({
    example: '2024-05-21T13:44:00.000+07:00',
    description: 'Date of start period',
  })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : null))
  @Prop({
    type: SchemaTypes.Date,
    required: true,
    validate: (value: Date) => value >= new Date(),
  })
  start_date: Date;

  @ApiProperty({
    example: '2024-05-21T13:44:00.000+07:00',
    description: 'Date of end period',
  })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : null))
  @Prop({
    type: SchemaTypes.Date,
    required: true,
    validate: (value: Date) => value >= new Date(),
  })
  end_date: Date;

  @ApiProperty({
    example: 10,
    required: false,
    type: Number,
    description: `<p>Total POIN to be redeemed for the register into an auction program. This POIN will not be refunded to the customer in case the customer loses the auction.</p>`,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Prop({
    type: SchemaTypes.Number,
    validate: [
      {
        validator: function (value: number) {
          return value >= 0;
        },
        message:
          'Invalid value for poin_redeemed. Must be a non-negative number.',
      },
    ],
  })
  poin: number;

  constructor(
    status?: boolean,
    start_date?: Date,
    end_date?: Date,
    poin?: number,
  ) {
    this.status = status;
    this.start_date = start_date;
    this.end_date = end_date;
    this.poin = poin;
  }
}

export const KeywordFlashSaleEligibilitySchema = SchemaFactory.createForClass(
  KeywordFlashSaleEligibility,
);

// Middleware to convert date strings to Date objects
// KeywordFlashSaleEligibilitySchema.pre('save', function (next) {
//   if (typeof this.start_date === 'string') {
//     this.start_date = new Date(this.start_date);
//   }
//   if (typeof this.end_date === 'string') {
//     this.end_date = new Date(this.end_date);
//   }
//   next();
// });
