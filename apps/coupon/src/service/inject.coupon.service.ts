import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';
import { Logger } from 'winston';

import { Account } from '@/account/models/account.model';
import { HttpCodeTransaction } from '@/dtos/global.http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import {
  InjectCoupon,
  InjectCouponDocument,
} from '@/transaction/models/inject.coupon.model';
const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');

import { formatIndihomeCore } from '@utils/logger/formatters';

import { WINSTON_MODULE_PROVIDER } from '../../../utils/logger/constants';
import { ExceptionHandler } from '../../../utils/logger/handler';
import { CouponLogService } from './log.service';

@Injectable()
export class InjectCouponService {
  private httpService: HttpService;
  private url: string;
  private realm: string;
  private branch: string;
  private merchant: string;
  private raw_core: string;
  private raw_port: number;

  constructor(
    @InjectModel(InjectCoupon.name)
    private injectCouponModel: Model<InjectCouponDocument>,
    httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    private readonly couponLogService: CouponLogService,
  ) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
  }

  /**
   * defrecated
   * @param id
   * @param token
   * @returns
   */
  async core_find_coupon(id: string, token: string) {
    const start = new Date();

    const _this = this;
    let data;

    await this.couponLogService.verbose(
      {},
      {},
      `[core_find_coupon] Find coupon from core with code ${id}`,
      start,
    );

    await new Promise(async (resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: _this.raw_core,
        path: `/gateway/v3.0/vouchers/${id}?merchant_id=${_this.merchant}`,
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, function (res) {
        const chunks = [];

        res.on('data', function (chunk) {
          chunks.push(chunk);
        });

        res.on('end', async () => {
          if (chunks) {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());

            await this.couponLogService.verbose(
              {},
              {},
              `[core_find_coupon] Response from core ${JSON.stringify(
                response,
              )}`,
              start,
            );

            data = response;
            resolve(response);
          }
        });
      });

      req.on('error', async (e) => {
        await this.couponLogService.verbose(
          {},
          {},
          `[core_find_coupon] Error from core ${JSON.stringify(e)}`,
          start,
        );

        resolve(e);
      });

      req.end();
    });
    return data;
  }

  /**
   * deprecated
   * @param request
   * @param account
   * @param token
   * @returns
   */
  async inject_coupon(
    request,
    account: Account,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;

    // TODO : Should eligibility check first here
    await new Promise(async (resolve, reject) => {
      if (account) {
        const options = {
          method: 'POST',
          hostname: _this.raw_core,
          port: _this.raw_port > 0 ? _this.raw_port : null,
          path: '/gateway/v3.0/vouchers',
          headers: {
            Authorization: `${token}`,
            'Content-Type': 'application/json',
          },
        };

        const req = http.request(options, function (res) {
          const chunks = [];

          res.on('data', function (chunk) {
            chunks.push(request);
          });

          res.on('end', async () => {
            if (chunks) {
              const body = Buffer.concat(chunks);
              const resp = JSON.parse(body.toString());
              const resPayload = resp.payload;
              if (resp.code === 'S00000') {
                await _this
                  .core_find_coupon(resPayload.id, token)
                  .then(async (voucher_detail: any) => {
                    const vd_payload = voucher_detail.payload.voucher;
                    const newData = new _this.injectCouponModel({
                      ...request,
                      core_id: resPayload.id,
                      core_type: vd_payload.type,
                      // core_serial_code: vd_payload.serial_code,
                      // core_name: vd_payload.name,
                      // core_desc: vd_payload.desc,
                      // core_remark: vd_payload.remark,
                      // core_product_name: vd_payload.product_name,
                      // core_owner_name: vd_payload.owner_name,
                      // core_owner_phone: vd_payload.owner_phone,
                      // core_provider_flag: vd_payload.core_provider_flag,
                      // core_merchant_flag: vd_payload.merchant_flag,
                      core_start_time: vd_payload.start_time,
                      core_end_time: vd_payload.end_time,
                      core_status: vd_payload.status,
                      core_redeem_time: vd_payload.redeem_time,
                      core__v: vd_payload.__v,
                      core_time: vd_payload.time,
                      created_by: (account as any)?._id,
                    });

                    await newData
                      .save()
                      .then(() => {
                        responseGlobal.code = resp.code;
                        responseGlobal.message = resp.message;
                        responseGlobal.transaction_classify = 'COUPON_INJECT';
                        responseGlobal.payload = {
                          ...resPayload,
                          ...request,
                          core_id: resPayload.id,
                          core_type: vd_payload.type,
                          // core_serial_code: vd_payload.serial_code,
                          // core_name: vd_payload.name,
                          // core_desc: vd_payload.desc,
                          // core_remark: vd_payload.remark,
                          // core_product_name: vd_payload.product_name,
                          // core_owner_name: vd_payload.owner_name,
                          // core_owner_phone: vd_payload.owner_phone,
                          // core_provider_flag: vd_payload.core_provider_flag,
                          // core_merchant_flag: vd_payload.merchant_flag,
                          core_start_time: vd_payload.start_time,
                          core_end_time: vd_payload.end_time,
                          core_status: vd_payload.status,
                          core_redeem_time: vd_payload.redeem_time,
                          core__v: vd_payload.__v,
                          core_time: vd_payload.time,
                          created_by: (account as any)?._id,
                        };
                        resolve(responseGlobal);
                      })
                      .catch((e) => {
                        responseGlobal.code =
                          HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                        responseGlobal.message = 'Failed to log inject voucher';
                        responseGlobal.transaction_classify = 'COUPON_INJECT';
                        responseGlobal.payload = resPayload;
                        resolve(responseGlobal);
                      });
                  })
                  .catch((e) => {
                    responseGlobal.code =
                      HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                    responseGlobal.message = 'Created voucher is not sync';
                    responseGlobal.transaction_classify = 'COUPON_INJECT';
                    responseGlobal.payload = resPayload;
                    resolve(responseGlobal);
                  });
              } else {
                responseGlobal.code = resp.code;
                responseGlobal.message = resp.message;
                responseGlobal.transaction_classify = 'COUPON_INJECT';
                responseGlobal.payload = resPayload;
                resolve(responseGlobal);
              }
            }
          });
        });

        req.on('error', function (e) {
          responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
          responseGlobal.message = e.message;
          responseGlobal.transaction_classify = 'COUPON_INJECT';
          responseGlobal.payload = {
            trace_id: false,
          };

          resolve(responseGlobal);
        });
      } else {
        resolve([{ isUnknown: 'unauthorized action' }]);
      }
    });

    return responseGlobal;
  }

  async push_to_core(
    request,
    account: Account,
    token: string,
    dataSet: any = {},
  ) {
    const start = new Date();

    const responseGlobal = new GlobalTransactionResponse();

    // console.log(`Generate coupon to : ${this.url}/vouchers`);
    // console.log(`With Payload : ${JSON.stringify(request)}`);

    await this.couponLogService.verbose(
      dataSet,
      {
        request: request,
      },
      `[push_to_core] Generate coupon to: ${this.url}/vouchers`,
      start,
    );

    return await lastValueFrom(
      this.httpService
        .post(`${this.url}/vouchers`, request, {
          headers: {
            Authorization: `${token}`,
            'Content-Type': 'application/json',
          },
        })
        .pipe(
          map(async (res) => {
            const resPayload = res.data.payload;

            // console.log(`Response from core : ${res}`);
            // console.log('SUCCESS_TO_CORE', res.data);

            await this.couponLogService.verbose(
              dataSet,
              {
                request: request,
              },
              `[push_to_core] Response from core: ${JSON.stringify(res.data)}`,
              start,
            );

            if (res.data.code === 'S00000') {
              // save to DB
              const newData = new this.injectCouponModel({
                ...request,
                msisdn: dataSet?.msisdn,
                core_id: resPayload?.id,
                core_type: 'Coupon',
                created_by: (account as any)?._id,
                program_id: dataSet?.program_id,
                program_name: dataSet?.program_name,
                program_start: dataSet?.program_start,
                program_end: dataSet?.program_end,
                keyword: dataSet?.keyword_name,
                transaction_id: dataSet?.transaction_id,
                parent_transaction_id: dataSet?.parent_master_id,
              });

              return await newData
                .save()
                .then(() => {
                  responseGlobal.code = res.data.code;
                  responseGlobal.message = res.data.message;
                  responseGlobal.transaction_classify = 'COUPON_INJECT';
                  responseGlobal.payload = {
                    ...resPayload,
                    ...request,
                    created_by: (account as any)?._id,
                    program_id: dataSet.program_id,
                    program_name: dataSet.program_name,
                    program_start: dataSet.program_start,
                    program_end: dataSet.program_end,
                    keyword: dataSet.keyword_name,
                    transaction_id: dataSet.transaction_id,
                  };

                  // setTimeout(async () => {
                  // get detail voucher to core
                  // const voucher_detail = await this.get_detail_voucher(
                  //   resPayload.id,
                  //   token,
                  //   request.merchant_id,
                  // );
                  // if (voucher_detail) {
                  //   const vd_payload = voucher_detail.payload['voucher'];

                  //   await this.injectCouponModel
                  //     .findOneAndUpdate(
                  //       {
                  //         core_id: resPayload?.id,
                  //       },
                  //       {
                  //         core_type: vd_payload?.type,
                  //         // core_serial_code: vd_payload?.serial_code,
                  //         // core_name: vd_payload?.name,
                  //         // core_desc: vd_payload?.desc,
                  //         // core_remark: vd_payload?.remark,
                  //         // core_product_name: vd_payload?.product_name,
                  //         // core_owner_name: vd_payload?.owner_name,
                  //         // core_owner_phone: vd_payload?.owner_phone,
                  //         // core_provider_flag: vd_payload?.core_provider_flag,
                  //         // core_merchant_flag: vd_payload?.merchant_flag,
                  //         core_start_time: vd_payload?.start_time,
                  //         core_end_time: vd_payload?.end_time,
                  //         core_status: vd_payload?.status,
                  //         core_redeem_time: vd_payload?.redeem_time,
                  //         core__v: vd_payload?.__v,
                  //         core_time: vd_payload?.time,
                  //       },
                  //     )
                  //     .then(async () => {
                  //       await this.couponLogService.verbose(
                  //         dataSet,
                  //         {
                  //           voucher: vd_payload,
                  //         },
                  //         `[get_detail_voucher] Success update coupon!`,
                  //         start,
                  //       );
                  //     })
                  //     .catch(async (err) => {
                  //       await this.couponLogService.error(
                  //         {
                  //           voucher: vd_payload,
                  //         },
                  //         start,
                  //         `[get_detail_voucher] Error update coupon! ${err?.message}`,
                  //       );
                  //     });
                  // }
                  // }, 10); // delay 10 ms

                  return responseGlobal;
                })
                .catch(async (e) => {
                  // console.log(`Failed to save non core ${e}`);

                  await this.couponLogService.error(
                    resPayload,
                    start,
                    `[COUPON_INJECT] Failed to save on non-core db! ${e?.message}`,
                  );

                  responseGlobal.code =
                    HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                  responseGlobal.message = 'Failed to log inject voucher';
                  responseGlobal.transaction_classify = 'COUPON_INJECT';
                  responseGlobal.payload = resPayload;

                  return responseGlobal;
                });
            } else {
              responseGlobal.code = res.data.code;
              responseGlobal.message = res.data.message;
              responseGlobal.transaction_classify = 'COUPON_INJECT';
              responseGlobal.payload = resPayload;

              await this.couponLogService.verbose(
                {},
                {},
                `[push_to_core] Failed to push coupon data! ${res?.data?.message}`,
                start,
              );

              return responseGlobal;
            }
          }),
          catchError(async (e) => {
            // console.log('-------error--------');
            // console.log('status', e?.response?.status);
            // console.log('statusText', e?.response?.statusText);
            // console.log('config', e?.response?.config);
            // console.log('data', e?.response?.data);

            await this.couponLogService.error(
              {},
              start,
              `[push_to_core] An error occured: ${JSON.stringify(
                e?.response?.data,
              )}`,
            );

            const response = new GlobalTransactionResponse();
            response.code = e?.response?.data.code;
            response.message = e?.response?.data.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };
            return response;
          }),
        ),
    );
  }

  async get_detail_voucher(id: string, token, merchant_id: string) {
    const start = new Date();

    // console.log(`${this.url}/vouchers/${id}?merchant_id=${merchant_id}`);
    await this.couponLogService.verbose(
      {},
      {},
      `[get_detail_voucher] Requesst to core with param: ${id} - ${this.merchant}`,
      start,
    );

    return await lastValueFrom(
      this.httpService
        .get(`${this.url}/vouchers/${id}?merchant_id=${merchant_id}`, {
          headers: {
            Authorization: `${token}`,
            'Content-Type': 'application/json',
          },
        })
        .pipe(
          map(async (res) => {
            const response = new GlobalTransactionResponse();

            response.code = res?.data.code;
            response.message = res?.data.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              voucher: res.data.payload.voucher,
            };

            // console.log('-------response get detail voucher--------');
            // console.log(response);

            await this.couponLogService.verbose(
              {},
              {},
              `[get_detail_voucher] Response from core: ${JSON.stringify(
                res.data,
              )}`,
              start,
            );

            return response;
          }),
          catchError(async (e) => {
            const response = new GlobalTransactionResponse();
            response.code = e?.response?.data.code;
            response.message = e?.response?.data.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };

            // console.log('-------error get detail voucher--------');
            // console.log('status', e?.response?.status);
            // console.log('statusText', e?.response?.statusText);
            // console.log('config', e?.response?.config);
            // console.log('data', e?.response?.data);

            await this.couponLogService.error(
              {},
              start,
              `[get_detail_voucher] An error occured: ${JSON.stringify(
                e?.response?.data,
              )}`,
            );

            return response;
          }),
        ),
    );
  }

  /*
  async loggerCoupon(payload, data, account, error, start) {
    const end = new Date();
    await this.exceptionHandler.handle({
      level: 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: data.transaction_id,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      payload: {
        service: InjectCouponService.name,
        user_id: account,
        step: 'InjectCouponService Service',
        param: payload,
        result: {
          message: error?.message,
          trace: data?.transaction_id,
          msisdn: data?.msisdn,
          response: error?.response?.data,
        },
      } satisfies LoggingData,
    });
  }
  */
}
