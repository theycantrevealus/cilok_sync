import { CallApiConfig } from '@configs/call-api.config';
import { EsbServiceType } from '@gateway/esb/constans/esb.servicetype.enum';
import {
  EsbRedeemLoyaltyCallbackBodyDto,
  EsbRedeemLoyaltyCallbackDto,
  EsbRedeemLoyaltyCallbackInfoDto,
  EsbRedeemLoyaltyCallbackServiceDto,
} from '@gateway/esb/dtos/esb.redeem.loyalty.callback.dto';
import { FmcIdenfitiferType } from '@gateway/transaction/dtos/point/fmc.member.identifier.type';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as https from 'https';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map, timestamp } from 'rxjs';

import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  allowedIndihomeNumber,
  checkCustomerIdentifier,
  formatMsisdnToID,
} from '@/application/utils/Msisdn/formatter';
import { walkingCheckOriginBefore } from '@/application/utils/Validation/general.validation';
import {
  MerchantV2,
  MerchantV2Document,
} from '@/merchant/models/merchant.model.v2';

import { ExceptionHandler } from '../../utils/logger/handler';
import { IAccount } from '../../utils/logger/transport';
import { LoggingData } from '../../utils/logger/transport';

@Injectable()
export class CallbackService {
  constructor(
    @InjectModel(MerchantV2.name)
    private merchantModel: Model<MerchantV2Document>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly callApiConfigService: CallApiConfigService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(NotificationContentService)
    private readonly notificationContentService: NotificationContentService,
    @Inject(ApplicationService)
    private readonly applicationService: ApplicationService,
  ) {}
  async submit(payload) {
    const isFMC = allowedIndihomeNumber(payload.msisdn);
    let isTMS = false;

    if (!isFMC) {
      const tmsOrigin = await this.applicationService.getConfig(
        CallApiConfig.TMS_BASE_URL,
      );
      const tmsOriginUrl = new URL(tmsOrigin);
      const callbackUrl = new URL(payload?.target_url);

      isTMS = tmsOriginUrl.host === callbackUrl.host;
    }

    // kirim callback sesuai kondisi
    if (isFMC) {
      // console.log('callback FMC');
      const isEnabled = await this.applicationService.getConfig(
        CallApiConfig.API_REDEEM_LOYALTY_CALLBACK_ESB,
      );
      if (isEnabled) {
        await this.callbackRoyaltyESB(payload);
      }
    } else if (isTMS) {
      // console.log('callback TMS');
      const isEnabled = await this.applicationService.getConfig(
        CallApiConfig.API_CALLBACK_TMS,
      );
      if (isEnabled) {
        await this.callbackTMS(payload);
      }
    } else {
      // console.log('callback BAU');
      const isEnabled = await this.applicationService.getConfig(
        CallApiConfig.API_CALLBACK_ESB,
      );
      if (isEnabled) {
        await this.callbackESBV2(payload);
      }
    }
  }

  async send(transactionId, targetUrl, header, body, query: any = {}) {
    // console.log(`CALLBACK ${transactionId} TARGET URL`, targetUrl);
    // console.log(`CALLBACK ${transactionId} QUERY`, JSON.stringify(query));
    // console.log(`CALLBACK ${transactionId} BODY`, JSON.stringify(body));
    // console.log(`CALLBACK ${transactionId} HEADER`, JSON.stringify(header));

    const start = new Date();
    await lastValueFrom(
      this.httpService
        .post(targetUrl, body, {
          params: query,
          headers: header,
          httpsAgent: new https.Agent({
            ca: fs.readFileSync(
              this.configService.get<string>('esb-backend.api.ca'),
            ),
            rejectUnauthorized: false,
          }),
          timeout: Number(
            this.configService.get<string>('esb-backend.api.timeout'),
          ),
        })
        .pipe(
          map(async (response) => {
            // console.log(
            //   `CALLBACK ${transactionId} SUCCESS RESPONSE`,
            //   JSON.stringify(response.data),
            // );

            // print to logger
            const end = new Date();
            const takenTime = Math.abs(start.getTime() - end.getTime());
            await this.exceptionHandler.handle({
              statusCode: HttpStatus.OK,
              level: 'verbose',
              notif_operation: true,
              notif_customer: false,
              transaction_id: query?.trx_id,
              config: this.configService,
              taken_time: takenTime,
              payload: {
                transaction_id: transactionId,
                statusCode: HttpStatus.OK,
                method: 'kafka',
                url: targetUrl,
                service: 'CALLBACK',
                step: 'CALLBACK SUCCESS',
                taken_time: takenTime,
                param: {
                  query: query,
                  body: body,
                },
                result: {
                  statusCode: HttpStatus.OK,
                  level: 'verbose',
                  message: `Request BODY ${JSON.stringify(
                    body,
                  )}, QUERY ${JSON.stringify(
                    query,
                  )}, Response : ${JSON.stringify(response.data)}, Info : null`,
                  trace: transactionId,
                },
              } satisfies LoggingData,
            });
          }),
          catchError(async (error) => {
            // if (error.response) {
            //   console.log(
            //     `CALLBACK ${transactionId} ERROR RESPONSE`,
            //     error?.response?.data,
            //   );
            // } else if (error.request) {
            //   console.log(
            //     `CALLBACK ${transactionId} ERROR REQEST`,
            //     error?.request,
            //   );
            // } else {
            //   console.log(`CALLBACK ${transactionId} ERROR`, error);
            // }

            // print to logger
            const end = new Date();
            const takenTime = Math.abs(start.getTime() - end.getTime());
            await this.exceptionHandler.handle({
              statusCode: HttpStatus.BAD_REQUEST,
              level: 'verbose',
              notif_operation: true,
              notif_customer: false,
              transaction_id: query?.trx_id,
              config: this.configService,
              taken_time: takenTime,
              payload: {
                transaction_id: transactionId,
                statusCode: HttpStatus.BAD_REQUEST,
                method: 'kafka',
                url: targetUrl,
                service: 'CALLBACK',
                step: 'CALLBACK FAILED',
                taken_time: takenTime,
                param: {
                  query: query,
                  body: body,
                },
                result: {
                  statusCode: HttpStatus.BAD_REQUEST,
                  level: 'verbose',
                  message: `Request BODY ${JSON.stringify(
                    body,
                  )}, QUERY ${JSON.stringify(
                    query,
                  )}, Response : ${JSON.stringify(
                    error?.response?.data,
                  )}, Info : ${error}`,
                  trace: transactionId,
                },
              } satisfies LoggingData,
            });
          }),
        ),
    );
  }

  async callbackESBV2(payload) {
    const start = new Date();
    try {
      const query = {
        msisdn: payload?.msisdn,
        trx_id: payload?.trx_id,
        status: payload?.status === 'success' ? 1 : 0,
        channel: payload?.channel,
        type: payload?.type,
      };

      let notifContent = '';
      let notifCode = '';

      if (payload?.notif_fail !== undefined) {
        notifContent =
          payload?.status === 'success'
            ? encodeURIComponent(payload?.notif)
            : encodeURIComponent(payload?.notif_fail);

        notifCode =
          payload?.status === 'success'
            ? payload?.notif_code
            : payload?.notif_code_fail;
      } else {
        notifContent = encodeURIComponent(payload?.notif);
        notifCode = payload?.notif_code;
      }

      const body = `[
        Username=undefined,
        Password=undefined,
        KEYWORD=${payload?.keyword},
        NOTIF=${notifContent},
        MSISDN=${payload?.msisdn},
        TIMESTAMP=${Math.floor(
          new Date(payload?.submit_time).getTime() / 1000,
        ).toString()},
        ERR_CODE=${payload?.status === 'success' ? '000' : '010'},
        MSG_CODE=${payload?.status},
        ERR_MSG=${notifCode},
        PAR_VALUE=undefined,
        TRXID=${payload?.trx_id},
        merchant=${payload?.merchant},
        poin=${payload?.total_poin}
      ]`;

      const header = {
        'Content-Type': 'text/plain',
        Accept: 'application/json',
        api_key: `${this.configService.get<string>(
          'esb-backend.client.api_key',
        )}`,
        'x-signature': this.generateSignatureEsb(),
      };

      // print to logger
      const end = new Date();
      await this.exceptionHandler.handle({
        statusCode: HttpStatus.OK,
        level: 'verbose',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload?.trx_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          transaction_id: payload?.trx_id,
          statusCode: HttpStatus.OK,
          method: 'kafka',
          url: 'callback',
          service: 'CALLBACK',
          step: 'MAPPING PARAMETER',
          param: payload,
          result: {
            result: {
              message: 'debug parameter',
              stack: {
                url: payload?.target_url,
                header: JSON.stringify(header),
                query: JSON.stringify(query),
                body,
              },
            },
          },
        } satisfies LoggingData,
      });

      this.send(payload?.trx_id, payload?.target_url, header, body, query);
    } catch (error) {
      // console.log(`----ERROR MAPPING PARAMETER ${payload?.trx_id}-------`);
      // console.log(error);
      const end = new Date();
      await this.exceptionHandler.handle({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        level: 'error',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload?.trx_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          transaction_id: payload?.trx_id,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          method: 'kafka',
          url: 'callback',
          service: 'CALLBACK',
          step: `Callback ${error.message}`,
          param: payload,
          result: {
            msisdn: payload?.msisdn,
            message: error.message,
            trace: payload?.trx_id,
            data: error,
          },
        } satisfies LoggingData,
      });
    }
  }

  private generateSignatureEsb() {
    const date = new Date();
    const unixTimeStamp = Math.floor(date.getTime() / 1000);
    const value = `${this.configService.get<string>(
      'esb-backend.client.api_key',
    )}${this.configService.get<string>(
      'esb-backend.client.secret',
    )}${unixTimeStamp}`;

    return createHash('md5').update(value).digest('hex');
  }

  private getPointByOrigin(payload) {
    const firstOrigin = payload?.origin.split('.')[0];
    let point;
    switch (firstOrigin) {
      case 'inject_point':
        point = `${payload?.payload?.inject_point?.amount}`;
        break;
      case 'redeem':
        point = `${payload?.payload?.deduct?.amount}`;
        break;
      case 'deduct':
        point = `${payload?.payload?.deduct?.amount}`;
        break;
      case 'refund':
        point = `${payload?.incoming?.point_refund}`;
        break;
      default:
        point = `${payload?.payload?.deduct?.amount}`;
        break;
    }

    return point;
  }

  /**
   * fungsi callback ke ESB dari transaksi FMC
   * @param payload
   */
  private async callbackRoyaltyESB(payload) {
    const start = new Date();
    try {
      // TODO, need check identifier type to define msisdn/indihome number/tsel_id
      const checkIdentifier = checkCustomerIdentifier(payload.msisdn);

      let custNumber = checkIdentifier.custNumber;
      if (checkIdentifier.type == FmcIdenfitiferType.MSISDN) {
        custNumber = formatMsisdnToID(custNumber);
      }

      let notifContent = '';
      let notifCode = '';

      if (payload?.notif_fail !== undefined) {
        notifContent =
          payload?.status === 'success'
            ? payload?.notif
            : payload?.notif_fail;

        notifCode =
          payload?.status === 'success'
            ? payload?.notif_code
            : payload?.notif_code_fail;
      } else {
        notifContent = payload?.notif;
        notifCode = payload?.notif_code;
      }

      const submitTime = payload?.submit_time ?? new Date().toISOString();

      const body = {
        service: {
          service_id: custNumber,
          service_type:
            checkIdentifier.type.toString() == EsbServiceType.MSISDN.toString()
              ? EsbServiceType.MSISDN
              : EsbServiceType.IH,
        },
        callback_info: {
          status: payload?.status == 'success' ? '1' : '0',
          partner_callback_url:
            'http://hoverfly-fmc:8500/redeem-callback-hoverfly',
          username: 'test',
          password: 'test',
          keyword: payload?.keyword,
          notif: notifContent,
          timestamp: Math.floor(
            new Date(submitTime).getTime() / 1000,
          ).toString(),
          err_code: payload?.status == 'success' ? '000' : '010',
          msg_code: notifCode,
          err_msg: payload?.status,
        },
      };

      const header = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        api_key: `${this.configService.get<string>(
          'esb-backend.client.api_key',
        )}`,
        'x-signature': this.generateSignatureEsb(),
        'x-transaction-id': payload?.trx_id,
        'x-channel': payload?.channel ?? 'SMS',
      };

      // print to logger
      const end = new Date();
      await this.exceptionHandler.handle({
        statusCode: HttpStatus.OK,
        level: 'verbose',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload?.trx_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          transaction_id: payload?.trx_id,
          statusCode: HttpStatus.OK,
          method: 'kafka',
          url: 'callback',
          service: 'CALLBACK',
          step: 'MAPPING PARAMETER FMC',
          param: payload,
          result: {
            result: {
              message: 'debug parameter',
              stack: {
                url: payload?.target_url,
                header: JSON.stringify(header),
                query: '',
                body,
              },
            },
          },
        } satisfies LoggingData,
      });

      await this.send(payload?.trx_id, payload?.target_url, header, body);
    } catch (error) {
      // console.log(`----ERROR MAPPING PARAMETER FMC ${payload?.trx_id}-------`);
      // console.log(error);
      const end = new Date();
      await this.exceptionHandler.handle({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        level: 'error',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload?.trx_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          transaction_id: payload?.trx_id,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          method: 'kafka',
          url: 'callback',
          service: 'CALLBACK',
          step: `Callback ${error.message}`,
          param: payload,
          result: {
            msisdn: payload?.msisdn,
            message: error.message,
            trace: payload?.trx_id,
            data: error,
          },
        } satisfies LoggingData,
      });
    }
  }

  /**
   * fungsi callback ke TMS
   * @param payload
   */
  async callbackTMS(payload) {
    const start = new Date();
    try {
      const query = {
        trx_id: payload?.trx_id,
        status: payload?.status === 'success' ? 1 : 0,
      };

      const tereOrigin = await this.applicationService.getConfig(
        CallApiConfig.TMS_HEADER_ORIGIN,
      );
      const tereUrl = new URL(tereOrigin);

      const header = {
        'Content-Type': 'text/plain',
        Accept: 'application/json',
        Host: tereUrl.host,
        Origin: tereOrigin,
        'x-api-key': await this.applicationService.getConfig(
          CallApiConfig.TMS_HEADER_API_KEY,
        ),
      };

      const body = `${JSON.stringify(query)}`;

      // print to logger
      const end = new Date();
      await this.exceptionHandler.handle({
        statusCode: HttpStatus.OK,
        level: 'verbose',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload?.trx_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          transaction_id: payload?.trx_id,
          statusCode: HttpStatus.OK,
          method: 'kafka',
          url: 'callback',
          service: 'CALLBACK',
          step: 'MAPPING PARAMETER TMS',
          param: payload,
          result: {
            result: {
              message: 'debug parameter',
              stack: {
                url: payload?.target_url,
                header: JSON.stringify(header),
                query: JSON.stringify(query),
                body,
              },
            },
          },
        } satisfies LoggingData,
      });

      this.send(payload?.trx_id, payload?.target_url, header, body, query);
    } catch (error) {
      // console.log(`----ERROR MAPPING PARAMETER TMS ${payload?.trx_id}-------`);
      // console.log(error);
      const end = new Date();
      await this.exceptionHandler.handle({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        level: 'error',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload?.trx_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          transaction_id: payload?.trx_id,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          method: 'kafka',
          url: 'callback',
          service: 'CALLBACK',
          step: `Callback ${error.message}`,
          param: payload,
          result: {
            msisdn: payload?.msisdn,
            message: error.message,
            trace: payload?.trx_id,
            data: error,
          },
        } satisfies LoggingData,
      });
    }
  }
}
