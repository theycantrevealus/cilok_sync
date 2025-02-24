import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as https from 'https';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map, throwError } from 'rxjs';

import { CustomerDocument } from '@/customer/models/customer.model';

import { LinkAjaClassifyEnum } from '../constans/link.aja.classify.enum';
import { AdjustLinkAjaDTOResponse } from '../dtos/adjust.customer.point.dto';
import { AdjustCustomerPoint } from '../models/adjust.customer.point.model';
import { LinkAjaConfig } from './link.aja.config';

@Injectable()
export class AdjustCustomerPointIntegration extends LinkAjaConfig {
  constructor(
    httpService: HttpService,
    configService: ConfigService,
    @InjectModel(AdjustCustomerPoint.name)
    private adjustCustomerPointModel: Model<CustomerDocument>,
  ) {
    super(httpService, configService);
    // this.initHttpService()
  }

  async post(
    payload: any,
    endpoint: string,
  ): Promise<AdjustLinkAjaDTOResponse> {
    const transactionClassify = LinkAjaClassifyEnum.adjustLinkAjaBonus;
    const adjustLinkAjaDTOResponse = new AdjustLinkAjaDTOResponse();

    console.log(this.proxy_url, 'proxy_url');
    console.log(this.proxy_port, 'proxy_port');

    console.log('==============LinkAja Token==============');
    console.log(this.getUrlBonus() + endpoint);

    console.log('==============LinkAja payload==============');
    console.log(payload, '/payload');

    console.log('==============LinkAja header==============');
    console.log(this.getHeaderBonus('POST', endpoint, payload), '/header');

    const boolValue = this.http_type === 'true';

    console.log(Number(this.timeout_outbound), 'agung log bonus');

    return await lastValueFrom(
      this.getHttpService()
        .post(this.getUrlBonus() + endpoint, JSON.stringify(payload, null, 2), {
          headers: this.getHeaderBonus('POST', endpoint, payload),
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
            const data = res.data;
            if (data.status === '00') {
              const memberNew = new this.adjustCustomerPointModel({
                msisdn: payload.msisdn,
              });
              const process = memberNew.save().then(async (returning) => {
                return returning;
              });
              if (!process) {
                console.log(res.data, 'agung testing din 2');
                adjustLinkAjaDTOResponse.status = res.status;
                adjustLinkAjaDTOResponse.trxid = data?.trxid;
                adjustLinkAjaDTOResponse.message =
                  'Adjust Customer Point Failed to Created';
                adjustLinkAjaDTOResponse.procTime = data?.procTime;
                adjustLinkAjaDTOResponse.transaction_classify =
                  transactionClassify;
                adjustLinkAjaDTOResponse.status = 400;
                adjustLinkAjaDTOResponse.payload = payload;
              }
              adjustLinkAjaDTOResponse.status = data?.status;
              adjustLinkAjaDTOResponse.trxid = data?.trxid;
              adjustLinkAjaDTOResponse.message = data?.message;
              adjustLinkAjaDTOResponse.procTime = data?.procTime;
              adjustLinkAjaDTOResponse.transaction_classify =
                transactionClassify;
              adjustLinkAjaDTOResponse.payload = res.data;
              return adjustLinkAjaDTOResponse;
            }
            adjustLinkAjaDTOResponse.status = res.status;
            adjustLinkAjaDTOResponse.trxid = data?.trxid;
            adjustLinkAjaDTOResponse.message = data?.message;
            adjustLinkAjaDTOResponse.procTime = data?.procTime;
            adjustLinkAjaDTOResponse.transaction_classify = transactionClassify;
            adjustLinkAjaDTOResponse.payload = res.data;
            return adjustLinkAjaDTOResponse;
          }),
          catchError(async (err: any) => {
            console.log('==============LinkAja Token Error==============');
            console.log(err);
            throw new BadRequestException([err.message]);
          }),
        ),
    );
  }
}
