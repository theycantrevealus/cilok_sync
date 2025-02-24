import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Document, SchemaTypes, Types } from 'mongoose';
export type ExampleJoinv2Document = ExampleJoinv2 & Document;

@Schema()
export class ExampleJoinv2 {
  @ValidateNested()
  @Prop({ type: Types.ObjectId }) // No need ref if it is an join _id
  @Type(() => Types.ObjectId)
  examplev2: Types.ObjectId;

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

  constructor(
    examplev2: Types.ObjectId,
    ab1?: string,
    ab2?: number,
    forreign_date?: Date,
  ) {
    this.examplev2 = examplev2;
    this.ab1 = ab1;
    this.ab2 = ab2;
    this.forreign_date = forreign_date;
  }
}

export const ExampleJoinv2Schema = SchemaFactory.createForClass(ExampleJoinv2);
