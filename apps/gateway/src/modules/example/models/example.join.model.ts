import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsString } from 'class-validator';
import { Document, SchemaTypes } from 'mongoose';
export type ExampleJoinDocument = ExampleJoin & Document;

@Schema()
export class ExampleJoin {
  @ApiProperty({
    example: 'join string example',
    description: 'For string input checker',
  })
  @Prop({ type: SchemaTypes.String })
  @IsString()
  ab1: string;

  @ApiProperty({
    example: 22,
    description: 'For string input checker',
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  ab2: number;

  @ApiProperty({
    example: new Date().toISOString(),
    description: 'Join date example',
  })
  @IsDate()
  @Prop({ type: SchemaTypes.Date })
  @Type(() => Date)
  forreign_date: Date;

  constructor(ab1?: string, ab2?: number, forreign_date?: Date) {
    this.ab1 = ab1;
    this.ab2 = ab2;
    this.forreign_date = forreign_date;
  }
}

export const ExampleJoinSchema = SchemaFactory.createForClass(ExampleJoin);
