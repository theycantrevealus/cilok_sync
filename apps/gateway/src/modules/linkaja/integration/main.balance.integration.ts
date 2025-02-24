import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EJSON } from 'bson';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { LinkAjaClassifyEnum } from '@/linkaja/constans/link.aja.classify.enum';
import { DisbursementCheckDTO } from '@/linkaja/dtos/disbursement.check.dto';
import { DisbursementConfirmDTO } from '@/linkaja/dtos/disbursement.confirm.dto';
import { LinkAjaDisbursementDTOResponse } from '@/linkaja/dtos/get.token.dto';
import { LinkAjaConfig } from '@/linkaja/integration/link.aja.config';

const errorResponseMessage: { status: number; message: string }[] = [];

@Injectable()
export class MainBalanceIntegration extends LinkAjaConfig {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
    this.initHttpService();
  }

  async getToken(payload): Promise<LinkAjaDisbursementDTOResponse> {
    const response = new LinkAjaDisbursementDTOResponse();
    const transactionClassify = LinkAjaClassifyEnum.getToken;
    return await lastValueFrom(
      this.getHttpService()
        .get('v1/oauth/create', {
          headers: this.getHeader('GET', '/oauth/create', payload),
        })
        .pipe(
          map(async (res) => {
            const result = res.data;
            response.status = res.status;
            response.message = result.message;
            response.transaction_classify = transactionClassify;
            response.payload = result.data;
            response.code = result.status;
            return response;
          }),
          catchError(async (err: any) => {
            if (err.code !== 'ENOTFOUND') {
              const status = err.response.status;
              throwError(() => new HttpException(err.response.data, status));
              response.status = status;
              response.message = err.data?.message;
              response.transaction_classify = transactionClassify;
              response.payload = err.data;
              return response;
            } else {
              throw new BadRequestException([err.message]);
            }
          }),
        ),
    );
  }

  async disbursementInquiry({
    payload,
    endpoint,
    token,
  }): Promise<DisbursementConfirmDTO> {
    const response = new DisbursementConfirmDTO();
    return await lastValueFrom(
      this.getHttpService()
        .post(endpoint, payload, {
          headers: {
            ...this.getHeader('POST', endpoint, payload),
            'Access-Token': token,
          },
        })
        .pipe(
          map(async (res) => {
            const result = res.data.data;
            response.invoiceID = result.invoiceID;
            response.amount = result.amount;
            response.customerNumber = result.customerNumber;
            response.partnerTrxID = result.partnerTrxID;
            response.partnerTrxDate = payload.partnerTrxDate;
            return response;
          }),
          catchError(async (err: any) => {
            errorResponseMessage.push({
              status: err.response.status,
              message: err.data?.message + ' event hit disbursement inquiry',
            });
            return response;
          }),
        ),
    );
  }

  async disbursementConfirm({
    payload,
    endpoint,
    token,
  }): Promise<DisbursementCheckDTO> {
    const response = new DisbursementCheckDTO();
    return await lastValueFrom(
      this.getHttpService()
        .post(endpoint, payload, {
          headers: {
            ...this.getHeader('POST', endpoint, payload),
            'Access-Token': token,
          },
        })
        .pipe(
          map(async (res) => {
            const result = res.data.data;
            response.partnerTrxID = result.partnerTrxID;
            return response;
          }),
          catchError(async (err: any) => {
            errorResponseMessage.push({
              status: err.response.status,
              message: err.data?.message + ' event hit disbursement confirm',
            });
            return response;
          }),
        ),
    );
  }

  async disbursementCheck({
    payload,
    endpoint,
    token,
  }): Promise<LinkAjaDisbursementDTOResponse> {
    const response = new LinkAjaDisbursementDTOResponse();
    const transactionClassify = LinkAjaClassifyEnum.mainBalance;
    return await lastValueFrom(
      this.getHttpService()
        .post(endpoint, payload, {
          headers: {
            ...this.getHeader('POST', endpoint, payload),
            'Access-Token': token,
          },
        })
        .pipe(
          map(async (res) => {
            const result = res.data;
            response.status = res.status;
            response.message = result.message;
            response.transaction_classify = transactionClassify;
            response.payload = result.data;
            response.code = result.status;
            return response;
          }),
          catchError(async (err: any) => {
            if (err.code !== 'ENOTFOUND') {
              errorResponseMessage.push({
                status: err.response.status,
                message: err.data?.message + ' event hit disbursement check',
              });
              const status = err.response.status;
              throwError(() => new HttpException(err.response.data, status));
              response.status = status;
              response.message = errorResponseMessage.toString();
              response.transaction_classify = transactionClassify;
              response.payload = err.data;
              return response;
            } else {
              throw new BadRequestException([err.message]);
            }
          }),
        ),
    );
  }

  async postDisbursement(
    payload: any,
  ): Promise<LinkAjaDisbursementDTOResponse> {
    return this.getToken(payload).then(async (res) => {
      if (res.code == '00') {
        const accessToken = res.payload.accessToken;

        const disbursementInquiryResponse = await this.disbursementInquiry({
          payload: payload,
          endpoint: '/disbursement/inquiry',
          token: accessToken,
        });
        const disbursementConfirmResponse = await this.disbursementConfirm({
          payload: disbursementInquiryResponse,
          endpoint: '/disbursement/confirm',
          token: accessToken,
        });
        return this.disbursementCheck({
          payload: disbursementConfirmResponse,
          endpoint: '/disbursement/check',
          token: accessToken,
        });
      }
    });
  }

  async post(
    payload: any,
    endpoint: string,
  ): Promise<LinkAjaDisbursementDTOResponse> {
    const transactionClassify = LinkAjaClassifyEnum.disbursementConfirm;
    const disbursementResponse = new LinkAjaDisbursementDTOResponse();
    return this.getToken(payload).then(async (res) => {
      if (res.code == '00')
        return await lastValueFrom(
          this.getHttpService()
            .post(endpoint, payload, {
              headers: {
                ...this.getHeader('POST', endpoint, payload),
                'Access-Token': res.payload.accessToken,
              },
            })
            .pipe(
              map(async (res) => {
                const result = res.data;
                disbursementResponse.status = res.status;
                disbursementResponse.message = result.message;
                disbursementResponse.transaction_classify = transactionClassify;
                disbursementResponse.payload = result.data;
                disbursementResponse.code = result.status;
                return disbursementResponse;
              }),
              catchError(async (err: any) => {
                if (err.code !== 'ENOTFOUND') {
                  const status = err.response.status;
                  throwError(
                    () => new HttpException(err.response.data, status),
                  );
                  disbursementResponse.status = status;
                  disbursementResponse.message = err.data?.message;
                  disbursementResponse.transaction_classify =
                    transactionClassify;
                  disbursementResponse.payload = err.data;
                  return disbursementResponse;
                } else {
                  throw new BadRequestException([err.message]);
                }
              }),
            ),
        );
    });
  }
}
