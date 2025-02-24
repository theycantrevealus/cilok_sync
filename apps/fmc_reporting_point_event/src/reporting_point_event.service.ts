import { CallApiConfig } from '@configs/call-api.config';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { plainToClass } from 'class-transformer';
import { readFileSync } from 'fs';
import * as https from 'https';
import { Model } from 'mongoose';

import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';

import { PointEventDTO } from './model/point-event.dto';
const http = process.env.NODE_ENV === '' ? require('https') : require('http');

import { HttpService } from '@nestjs/axios';
import { ExceptionHandler } from '@utils/logger/handler';
import { LoggingData } from '@utils/logger/transport';
import { AxiosError, AxiosResponse } from 'axios';
import { catchError, lastValueFrom, map } from 'rxjs';

import { TransactionBiLog } from './model/bi.log.model';

@Injectable()
export class ReportingPointEventService {
  private bi_raw_core: string;
  private bi_raw_port: number;
  private bi_timeout: number;

  private bi_cert_ca: string;
  private bi_cert: string;

  protected callApiConfigService: CallApiConfigService;
  protected httpService: HttpService;
  protected configService: ConfigService;

  constructor(
    configService: ConfigService,
    callApiConfigService: CallApiConfigService,
    httpService: HttpService,

    @InjectModel(TransactionBiLog.name)
    private transactionBiLogModel: Model<TransactionBiLog>,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
  ) {
    this.bi_raw_core = `${configService.get<string>('core-backend.raw_bi')}`;
    this.bi_raw_port = configService.get<number>('core-backend.raw_port_bi');
    this.bi_timeout = configService.get<number>('core-backend.bi_timeout');

    this.bi_cert_ca = `${configService.get<string>('core-backend.bi_cert_ca')}`;
    this.bi_cert = `${configService.get<string>('core-backend.bi_cert')}`;

    this.callApiConfigService = callApiConfigService;
    this.httpService = httpService;
    this.configService = configService;
  }

  getHello(): string {
    return 'Hello World!';
  }

  async listenerSubcribtion(payload): Promise<boolean> {
    const bodyRequest = {
      json_format: payload.payload,
      xml_format: null,
    };

    console.log('Raw Request: ' + JSON.stringify(payload.payload));

    try {
      let res = null;
      let isSuccess = true;

      const body = plainToClass(PointEventDTO, payload.payload);
      const data = body.buildSoapBody();

      const isEnabled = await this.callApiConfigService.callApiIsEnabled(
        CallApiConfig.API_POINT_EVENT_BI,
      );
      if (isEnabled) {
        bodyRequest.xml_format = data;
        const resfromapi = await this.poinEventV2(data);
        if (resfromapi.code !== HttpStatusTransaction.CODE_SUCCESS) {
          isSuccess = false;
        }
        res = resfromapi;
      }

      if (isSuccess) {
        await this.save_to_log(payload, bodyRequest, res, true, null);
      } else {
        await this.save_to_log(payload, bodyRequest, res, false, res.message);
      }
    } catch (error) {
      console.error(error);
      await this.save_to_log(payload, bodyRequest, null, false, error.message);
    }

    return true;
  }

  async poinEvent(data): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;

    // config cert
    const requestOptionsAgent = {
      rejectUnauthorized: false,
      ciphers: 'DEFAULT:!DH',
    };

    if (this?.bi_cert_ca?.length && this?.bi_cert?.length) {
      const caFile = readFileSync(this.bi_cert_ca);
      const certFile = readFileSync(this.bi_cert);

      requestOptionsAgent['caFile'] = caFile;
      requestOptionsAgent['certFile'] = certFile;
    }

    await new Promise(async (resolve, reject) => {
      const options = {
        method: 'POST',
        hostname: _this.bi_raw_core,
        port: _this.bi_raw_port > 0 ? _this.bi_raw_port : null,
        path: '/pointevent',
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
        },
        data: data,
        agent: new http.Agent(requestOptionsAgent),
      };

      const req = http.request(options, function (res) {
        const chunks = [];
        res.on('data', function (chunk) {
          chunks.push(chunk);
        });

        res.on('end', async () => {
          if (chunks) {
            console.info('Success With Body : ' + data);
            console.info(chunks);

            responseGlobal.code = HttpStatusTransaction.CODE_SUCCESS;
            responseGlobal.message = 'Data Posted';
            responseGlobal.transaction_classify = 'POINT_EVENT_REPORTING';
            responseGlobal.payload = {
              trace_id: true,
            };
            resolve(responseGlobal);
          }
        });
      });

      req.on('error', function (e) {
        console.error('Failed With Body : ' + data);
        console.error(e);

        responseGlobal.code = HttpStatusTransaction.UNKNOWN_ERROR;
        responseGlobal.message = e.message;
        responseGlobal.transaction_classify = 'POINT_EVENT_REPORTING';
        responseGlobal.payload = {
          trace_id: false,
        };
        resolve(responseGlobal);
      });
    });

    // responseGlobal.code = HttpStatusTransaction.CODE_SUCCESS;
    // responseGlobal.message = 'e.message';
    // responseGlobal.transaction_classify = 'POINT_EVENT_REPORTING';
    // responseGlobal.payload = {
    //   trace_id: false,
    //   data: data,
    // };

    return responseGlobal;
  }

  async poinEventV2(payload): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();

    // config cert
    const httpsAgentOptions = {
      rejectUnauthorized: false,
      ciphers: 'DEFAULT:!DH',
    };

    if (this?.bi_cert_ca?.length && this?.bi_cert?.length) {
      const caFile = readFileSync(this.bi_cert_ca);
      const certFile = readFileSync(this.bi_cert);

      httpsAgentOptions['caFile'] = caFile;
      httpsAgentOptions['certFile'] = certFile;
    }

    const options = {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
      },
      httpsAgent: new https.Agent(httpsAgentOptions),
      timeout: this.bi_timeout,
      // maxRedirects: 0,
    };

    const requestUrl = `https://${this.bi_raw_core}:${this.bi_raw_port}/poinevent`;
    const response: any = await lastValueFrom(
      this.httpService.post(requestUrl, payload, options).pipe(
        map((res: AxiosResponse) => {
          return res;
        }),
        catchError((err: AxiosError): any => {
          console.error('<--- ERROR: REPORTING_POINT_EVENT_BI --->');
          console.error(err);
          console.error('<--- ERROR: REPORTING_POINT_EVENT_BI --->');

          responseGlobal.code = HttpStatusTransaction.UNKNOWN_ERROR;
          responseGlobal.message = err.message;
          responseGlobal.transaction_classify = 'POINT_EVENT_REPORTING';
          responseGlobal.payload = {
            trace_id: false,
            response: err?.response?.data,
          };

          throw responseGlobal;
        }),
      ),
    );

    console.info('<--- SUCCESS: REPORTING_POINT_EVENT_BI --->');
    console.info(response);
    console.info('<--- SUCCESS: REPORTING_POINT_EVENT_BI --->');

    responseGlobal.code = HttpStatusTransaction.CODE_SUCCESS;
    responseGlobal.message = 'Data Posted';
    responseGlobal.transaction_classify = 'POINT_EVENT_REPORTING';
    responseGlobal.payload = {
      trace_id: true,
      response: response?.data,
    };

    return responseGlobal;
  }

  // utilities
  async save_to_log(
    payload,
    request,
    response,
    is_success,
    error,
  ): Promise<void> {
    const start = new Date();
    const data = {
      trace_id: payload.tracing_id,
      master_id: payload.tracing_master_id,
      is_success,
      request,
      response,
      error,
    };

    const log = new this.transactionBiLogModel(data);
    log.save();

    const end = new Date();
    await this.exceptionHandler.handle({
      statusCode: is_success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
      level: is_success ? 'verbose' : 'error',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.tracing_id,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      payload: {
        transaction_id: payload?.tracing_id,
        statusCode: is_success
          ? HttpStatus.OK
          : HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'kafka',
        url: payload?.origin.split('.').pop(),
        service: 'REPORTING POINT EVENT',
        step: 'BI RESPONSE',
        param: payload,
        payload: {
          msisdn: payload?.payload?.msisdn,
          url: payload?.origin.split('.').pop(),
        },
        result: {
          msisdn: payload?.payload?.msisdn,
          message: error,
          trace: payload?.tracing_id,
          data: error,
          result: {
            message: is_success ? 'success' : error,
            stack: JSON.stringify(response?.payload?.response),
          },
        },
      } satisfies LoggingData,
    });
  }
}
