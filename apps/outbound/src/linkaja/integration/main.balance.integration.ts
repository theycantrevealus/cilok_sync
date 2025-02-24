import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { LinkAjaClassifyEnum } from '../constans/link.aja.classify.enum';
import { DisbursementCheckDTO } from '../dtos/disbursement.check.dto';
import { DisbursementConfirmDTO } from '../dtos/disbursement.confirm.dto';
import { LinkAjaDisbursementDTOResponse } from '../dtos/get.token.dto';
import { LinkAjaConfig } from './link.aja.config';

const errorResponseMessage: { status: number; message: string }[] = [];

@Injectable()
export class MainBalanceIntegration extends LinkAjaConfig {
  constructor(httpService: HttpService, configService: ConfigService) {
    super(httpService, configService);
    // this.initHttpService()
  }

  async getToken(payload): Promise<LinkAjaDisbursementDTOResponse> {
    try {
      const boolValue = this.http_type === 'true';

      console.log(this.proxy_url, 'proxy_url');
      console.log(Number(this.proxy_port), 'proxy_port');
      const response = new LinkAjaDisbursementDTOResponse();
      const transactionClassify = LinkAjaClassifyEnum.getToken;

      console.log('==============LinkAja Token==============');
      console.log(this.getUrl() + 'v1/oauth/create');

      console.log('==============LinkAja payload==============');
      console.log(payload, '/payload');

      console.log('==============LinkAja header==============');
      console.log(
        this.getHeader(
          'GET',
          '/oauth/create',
          JSON.stringify(payload, null, 2),
        ),
        '/header',
      );

      const data = await lastValueFrom(
        this.getHttpService()
          .get(this.getUrl() + 'v1/oauth/create', {
            headers: this.getHeader(
              'GET',
              '/oauth/create',
              JSON.stringify(payload, null, 2),
            ),
            httpsAgent: new https.Agent({ rejectUnauthorized: boolValue }),
            proxy: {
              host: this.proxy_url,
              port: Number(this.proxy_port),
            },
            timeout: Number(this.timeout_outbound),
          })
          .pipe(
            map(async (res) => {
              console.log('==============LinkAja Token Success==============');
              console.log(res.data);
              const result = res.data;
              response.status = res.status;
              response.message = result.message;
              response.transaction_classify = transactionClassify;
              response.payload = result.data;
              response.code = result.status;
              return response;
            }),
            catchError(async (err: any) => {
              console.log('==============LinkAja Token err==============');
              console.log(err);
              const status = err.response?.status;
              throwError(() => new HttpException(err.response.data, status));

              throw new Error(err);
            }),
          ),
      );
      return data;
    } catch (error) {
      console.log('==============LinkAja Token Error==============');
      console.log(error);
      throw new Error(error);
    }
  }

  async disbursementInquiry({
    payload,
    endpoint,
    token,
  }): Promise<DisbursementConfirmDTO> {
    const boolValue = this.http_type === 'true';
    console.log(this.proxy_url, 'proxy_url');
    console.log(Number(this.proxy_port), 'proxy_port');
    const response = new DisbursementConfirmDTO();
    const headers = {
      ...this.getHeader('POST', endpoint, JSON.stringify(payload, null, 2)),
      'Access-Token': token,
    };

    const path = this.getUrl() + 'v1' + endpoint;

    console.log('LinkAja Inquery');
    console.log(path);
    console.log('payload : ' + JSON.stringify(payload));
    console.log('headers : ' + JSON.stringify(headers, null, 2));

    return await lastValueFrom(
      this.getHttpService()
        .post(path, JSON.stringify(payload, null, 2), {
          headers: headers,
          httpsAgent: new https.Agent({ rejectUnauthorized: boolValue }),
          proxy: {
            host: this.proxy_url,
            port: Number(this.proxy_port),
          },
          timeout: Number(this.timeout_outbound),
        })
        .pipe(
          map(async (res) => {
            console.log('LinkAja Inquery Success');
            console.log(JSON.stringify(res.data, null, 2));

            const result = res.data.data;
            response.invoiceID = result.invoiceID;
            response.amount = result.amount;
            response.customerNumber = result.customerNumber;
            response.partnerTrxID = result.partnerTrxID;
            response.partnerTrxDate = payload.partnerTrxDate;
            return response;
          }),
          catchError(async (err: any) => {
            console.log('LinkAja Inquery Failed');
            console.log(err.message, null, 2);

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
    const boolValue = this.http_type === 'true';
    console.log(this.proxy_url, 'proxy_url');
    console.log(Number(this.proxy_port), 'proxy_port');
    const response = new DisbursementCheckDTO();
    console.log('LinkAja disbursementConfirm');
    console.log('url : ' + this.getUrl() + 'v1' + endpoint);
    console.log('payload : ' + JSON.stringify(payload));
    console.log(
      'headers : ' +
        JSON.stringify({
          ...this.getHeader('POST', endpoint, JSON.stringify(payload, null, 2)),
          'Access-Token': token,
        }),
    );

    return await lastValueFrom(
      this.getHttpService()
        .post(
          this.getUrl() + 'v1' + endpoint,
          JSON.stringify(payload, null, 2),
          {
            headers: {
              ...this.getHeader(
                'POST',
                endpoint,
                JSON.stringify(payload, null, 2),
              ),
              'Access-Token': token,
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: boolValue }),
            proxy: {
              host: this.proxy_url,
              port: Number(this.proxy_port),
            },
            timeout: Number(this.timeout_outbound),
          },
        )
        .pipe(
          map(async (res) => {
            console.log('success disbursementConfirm : ' + JSON.stringify(res));
            const result = res.data.data;
            response.partnerTrxID = result.partnerTrxID;
            return response;
          }),
          catchError(async (err: any) => {
            console.log('LinkAja disbursementConfirm error ');
            console.log(err);
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
    const boolValue = this.http_type === 'true';
    console.log(this.proxy_url, 'proxy_url');
    console.log(Number(this.proxy_port), 'proxy_port');
    const response = new LinkAjaDisbursementDTOResponse();

    console.log('LinkAja disbursementCheck');
    console.log('url : ' + this.getUrl() + 'v1' + endpoint);
    console.log('payload : ' + JSON.stringify(payload));
    console.log(
      'headers : ' +
        JSON.stringify({
          ...this.getHeader('POST', endpoint, JSON.stringify(payload, null, 2)),
          'Access-Token': token,
        }),
    );

    const transactionClassify = LinkAjaClassifyEnum.mainBalance;
    return await lastValueFrom(
      this.getHttpService()
        .post(
          this.getUrl() + 'v1' + endpoint,
          JSON.stringify(payload, null, 2),
          {
            headers: {
              ...this.getHeader(
                'POST',
                endpoint,
                JSON.stringify(payload, null, 2),
              ),
              'Access-Token': token,
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: boolValue }),
            proxy: {
              host: this.proxy_url,
              port: Number(this.proxy_port),
            },
            timeout: Number(this.timeout_outbound),
          },
        )
        .pipe(
          map(async (res) => {
            console.log('success disbursementCheck : ' + JSON.stringify(res));
            const result = res.data;
            response.status = res.status;
            response.message = result.message;
            response.transaction_classify = transactionClassify;
            response.payload = result.data;
            response.code = result.status;
            return response;
          }),
          catchError(async (err: any) => {
            console.log('LinkAja disbursementCheck error ');
            console.log(err);
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
    try {
      console.log(this.proxy_url, 'proxy_url');
      console.log(Number(this.proxy_port), 'proxy_port');
      const res = await this.getToken(payload);
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
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async post(
    payload: any,
    endpoint: string,
  ): Promise<LinkAjaDisbursementDTOResponse> {
    const boolValue = this.http_type === 'true';
    console.log(this.proxy_url, 'proxy_url');
    console.log(Number(this.proxy_port), 'proxy_port');
    const transactionClassify = LinkAjaClassifyEnum.disbursementConfirm;
    const disbursementResponse = new LinkAjaDisbursementDTOResponse();

    return this.getToken(payload).then(async (res) => {
      console.log('LinkAja DisbursementCheck post');
      console.log(
        'url : ' + this.getUrl() + 'v1' + endpoint,
        JSON.stringify(payload, null, 2),
      );
      console.log('payload : ' + JSON.stringify(payload));
      console.log(
        'headers : ' +
          {
            headers: {
              ...this.getHeader(
                'POST',
                endpoint,
                JSON.stringify(payload, null, 2),
              ),
              'Access-Token': res.payload.accessToken,
            },
          },
      );
      if (res.code == '00')
        return await lastValueFrom(
          this.getHttpService()
            .post(
              this.getUrl() + 'v1' + endpoint,
              JSON.stringify(payload, null, 2),
              {
                headers: {
                  ...this.getHeader(
                    'POST',
                    endpoint,
                    JSON.stringify(payload, null, 2),
                  ),
                  'Access-Token': res.payload.accessToken,
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: boolValue }),
                proxy: {
                  host: this.proxy_url,
                  port: Number(this.proxy_port),
                },
                timeout: Number(this.timeout_outbound),
              },
            )
            .pipe(
              map(async (res) => {
                console.log(
                  'success disbursementCheck : ' + JSON.stringify(res),
                );
                const result = res.data;
                disbursementResponse.status = res.status;
                disbursementResponse.message = result.message;
                disbursementResponse.transaction_classify = transactionClassify;
                disbursementResponse.payload = result.data;
                disbursementResponse.code = result.status;
                return disbursementResponse;
              }),
              catchError(async (err: any) => {
                console.log('LinkAja disbursementCheck error post ');
                console.log(err);
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
