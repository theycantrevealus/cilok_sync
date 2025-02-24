import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { LinkAjaClassifyEnum } from '../constans/link.aja.classify.enum';
import { AssignVoucherLinkAjaDTOResponse } from '../dtos/assign.voucher.dto';
import { LinkAjaConfig } from './link.aja.config';

@Injectable()
export class AssignVoucherIntegration extends LinkAjaConfig {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
    // this.initHttpService();
  }

  async post(
    payload: any,
    endpoint: string,
  ): Promise<AssignVoucherLinkAjaDTOResponse> {
    console.log(this.proxy_url, 'proxy_url');
    console.log(Number(this.proxy_port), 'proxy_port');
    const transactionClassify = LinkAjaClassifyEnum.assignVoucher;
    const assignVoucherLinkAjaDTOResponse =
      new AssignVoucherLinkAjaDTOResponse();

    console.log(this.getHeaderV2(), 'header');
    const boolValue = this.http_type === 'true';

    console.log(Number(this.timeout_outbound), 'agung log voc');

    return await lastValueFrom(
      this.getHttpService()
        .post(this.getUrl() + endpoint, payload, {
          headers: this.getHeaderV2(),
          httpsAgent: new https.Agent({ rejectUnauthorized: boolValue }),
          proxy: {
            host: this.proxy_url,
            port: Number(this.proxy_port),
          },
          timeout: Number(this.timeout_outbound),
        })
        .pipe(
          map(async (res) => {
            console.log(res.data, 'assign voc');
            const responseVoc = res.data;
            if (responseVoc.voucher) {
              assignVoucherLinkAjaDTOResponse.status = '00';
              assignVoucherLinkAjaDTOResponse.id = responseVoc.id;
              assignVoucherLinkAjaDTOResponse.transactionId =
                responseVoc.transactionId;
              assignVoucherLinkAjaDTOResponse.msisdn = responseVoc.msisdn;
              assignVoucherLinkAjaDTOResponse.createdAt = responseVoc.createdAt;
              assignVoucherLinkAjaDTOResponse.transaction_classify =
                transactionClassify;
              assignVoucherLinkAjaDTOResponse.voucher = responseVoc.voucher;
              return assignVoucherLinkAjaDTOResponse;
            } else {
              assignVoucherLinkAjaDTOResponse.status = responseVoc.status;
              assignVoucherLinkAjaDTOResponse.message = responseVoc.message;
              assignVoucherLinkAjaDTOResponse.xid = responseVoc.xid;
              assignVoucherLinkAjaDTOResponse.transaction_classify =
                transactionClassify;
              return assignVoucherLinkAjaDTOResponse;
            }
          }),
          catchError(async (err: any) => {
            throw new BadRequestException([err.message]);
          }),
        ),
    );
  }
}
