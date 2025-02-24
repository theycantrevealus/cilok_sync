import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

import { HttpCodeTransaction } from '@/dtos/global.http.status.transaction.dto';
import { KeywordService } from '@/keyword/services/keyword.service';
import {
  VoucherUploadFileDTO,
  VoucherUploadFileDTOResponse,
} from '@/transaction/dtos/voucher/voucher.upload.dto';

import { VoucherService } from './voucher.service';

@Injectable()
export class VoucherUploadService {
  private keywordService: KeywordService;
  constructor(
    keywordService: KeywordService,
    private voucherService: VoucherService,
  ) {
    this.keywordService = keywordService;
  }

  async voucherUploadFile(
    req: any,
    account: any,
    payload: VoucherUploadFileDTO,
    new_method = false,
  ) {
    const response = new VoucherUploadFileDTOResponse();
    try {
      await this.keywordService
        .updateKeywordById(
          {
            'bonus.bonus_type': 'discount_voucher',
            'eligibility.name': payload.keyword_name,
            'eligibility.program_id': payload.program_id,
          },
          {
            $set: {
              'bonus.$.file': payload.file,
            },
          },
        )
        .then(async (res) => {
          if (res) {
            // hit upload ke core
            const keywordDetail = await this.keywordService.detailFromName(
              payload.keyword_name.toString(),
            );

            // console.log('INI DETAIL', keywordDetail);

            const resImport = await this.voucherService.voucherWithKeyword(
              keywordDetail,
              account,
              req,
              null,
              null,
              new_method,
            );

            if (resImport.code == HttpCodeTransaction.CODE_SUCCESS_200) {
              console.log('Sukses');
              response.code = HttpCodeTransaction.CODE_SUCCESS_200;
              response.transaction_classify = 'VOUCHER_UPLOAD';
              response.message = 'Voucher Upload Success';
            } else {
              console.log('Gagal');
              response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
              response.transaction_classify = 'VOUCHER_UPLOAD';
              response.message = 'Unable To Upload Voucher';
            }

            response.payload = {
              ...payload,
              response_import: resImport,
              trace_id: false,
            };
          } else {
            console.log('Keyword id not found');
            response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
            response.transaction_classify = 'VOUCHER_UPLOAD';
            response.message = 'Keyword ID not found';
            response.payload = { trace_id: false };
            this.deleteFile(payload.file.path);
          }
        })
        .catch((e) => {
          response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
          response.transaction_classify = 'VOUCHER_UPLOAD';
          response.message = e.message;
          response.payload = { trace_id: false };
          this.deleteFile(payload.file.path);
        });
    } catch (e) {
      console.log(e.message);
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'VOUCHER_UPLOAD';
      response.message = e.message;
      response.payload = { trace_id: false };
      this.deleteFile(payload.file.path);
    }

    return response;
  }

  async deleteFile(path: string) {
    try {
      await fs.promises.unlink(path);
      console.log(`Successfully deleted ${path}`);
    } catch (error) {
      console.error(`Error deleting ${path}: ${error}`);
    }
  }
}
