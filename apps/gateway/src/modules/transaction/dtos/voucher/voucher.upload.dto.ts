import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Types } from 'mongoose';

import { HttpCodeTransaction } from '@/dtos/global.http.status.transaction.dto';
import { Keyword } from '@/keyword/models/keyword.model';
import { Program } from '@/program/models/program.model';

export class VoucherUploadFileDTO {
  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Keyword.name })
  @Type(() => Keyword)
  keyword_name: Keyword;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  @Prop({ type: Types.ObjectId, ref: Program.name })
  @Type(() => Program)
  program_id: Program;

  @ApiProperty({ required: true, type: String, format: 'binary' })
  @IsTypeFileCsv({
    message: 'File must be type CSV',
  })
  file: any;

  constructor(data: any) {
    this.keyword_name = data.keyword_name;
    this.program_id = data.program_id;
    this.file = data.file;
  }
}

export class VoucherUploadFileDTOResponse {
  @ApiProperty({ example: HttpCodeTransaction.CODE_SUCCESS_200 })
  @IsNumber()
  code: string;

  @ApiProperty({ example: 'VOUCHER_UPLOAD' })
  @IsString()
  transaction_classify: string;

  @ApiProperty({ example: 'Voucher Upload Successfully' })
  @IsString()
  message: string;

  payload: any;
}

export class VoucherSummaryParamDTO {
  @ApiProperty({
    name: 'keyword_id',
    type: String,
    required: true,
    description: `Keyword Id`,
  })
  @IsNotEmpty()
  keyword_id: string;
}

export class VoucherTransactionDetailParamDTO {
  @ApiProperty({
    name: 'batch_no',
    type: String,
    required: true,
    description: `Batch Number`,
  })
  @IsNotEmpty()
  batch_no: string;

  @ApiProperty({
    name: 'voucher_code',
    type: String,
    required: true,
    description: `Voucher Code`,
  })
  @IsNotEmpty()
  voucher_code: string;
}

export function IsTypeFileCsv(options?: ValidationOptions) {
  return (object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(mimeType) {
          const acceptMimeTypes = ['text/csv'];
          const fileType = acceptMimeTypes.find((type) => type === mimeType);
          return !fileType;
        },
      },
    });
  };
}
