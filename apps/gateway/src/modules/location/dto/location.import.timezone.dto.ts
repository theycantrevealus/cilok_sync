import { ApiProperty } from '@nestjs/swagger';
import {IsTypeFileCsv} from "@/transaction/dtos/voucher/voucher.upload.dto";

export class LocationImportTimezoneDTO {
  @ApiProperty({ required: true, type: String, format: 'binary' })
  @IsTypeFileCsv({
    message : "File must be type CSV"
  })
  file: any;

  constructor(data: any) {
    this.file = data.file;
  }
}
