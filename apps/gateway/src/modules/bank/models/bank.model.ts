import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import mongoose, { Document, SchemaTypes } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { TimeManagement } from '@/application/utils/Time/timezone';
export type BankDocument = Bank & Document;

@Schema()
export class Bank {
  @ApiProperty({
    example: '20133300',
    description: '-',
  })
  @Prop({ type: SchemaTypes.Number })
  @IsNumber()
  cpn_prg_id: number;

  @ApiProperty({
    example: 'BRI3',
    description: 'Name of program',
  })
  @Prop({ type: SchemaTypes.String })
  @IsString()
  program_name: string;

  @ApiProperty({
    example: '3300',
    description: '-',
  })
  @Prop({ type: SchemaTypes.String })
  @IsString()
  bank: string;

  @ApiProperty({
    example: '10.1.89.183',
    description: 'IP Address of bank access',
  })
  @Prop({ type: SchemaTypes.String })
  @IsString()
  ip_address: string;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: Account.name,
    required: true,
  })
  @Type(() => Account)
  created_by: Account | null;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  created_at: Date;

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date;

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null;

  constructor(
    cpn_prg_id?: number,
    program_name?: string,
    bank?: string,
    ip_address?: string,
    created_by?: Account,
  ) {
    this.cpn_prg_id = cpn_prg_id;
    this.program_name = program_name;
    this.bank = bank;
    this.ip_address = ip_address;
    this.created_by = created_by;
  }
}

export const BankSchema = SchemaFactory.createForClass(Bank);
