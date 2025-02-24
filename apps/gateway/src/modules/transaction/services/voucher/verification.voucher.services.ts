import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount } from '@utils/logger/transport';
import { LoggingData } from '@utils/logger/transport';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';
import { Logger } from 'winston';

import { Account } from '@/account/models/account.model';
import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  allowedMSISDN,
  formatMsisdnCore,
} from '@/application/utils/Msisdn/formatter';
import { CustomerService } from '@/customer/services/customer.service';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import {
  KeywordNotification,
  KeywordNotificationDocument,
} from '@/keyword/models/keyword.notification.model';
import {
  MerchantOutlet,
  MerchantOutletDocument,
} from '@/merchant/models/merchant.outlet.model';
import { Outlet, OutletDocument } from '@/merchant/models/outlet.model';
import { MerchantV2Service } from '@/merchant/services/merchant.service.v2';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { RedeemDTO } from '@/transaction/dtos/redeem/redeem.dto';
import {
  VerificationVoucher,
  VerificationVoucherDocument,
} from '@/transaction/models/voucher/verification.voucher.model';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';
import { Voucher, VoucherDocument } from '@/transaction/models/voucher/voucher.model';

const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');

const moment = require('moment');

@Injectable()
export class VerificationVoucherService {
  private httpService: HttpService;
  private url: string;
  private branch: string;
  private realm: string;
  private merchant: string;
  private raw_port: number;
  private raw_core: string;
  private redeemService: RedeemService;
  private client: ClientKafka;
  private applicationService: ApplicationService;
  private notificationContentService: NotificationContentService;
  private customerService: CustomerService;
  private merchantService: MerchantV2Service;

  constructor(
    httpService: HttpService,

    @InjectModel(MerchantOutlet.name)
    private merchantOutletModel: Model<MerchantOutletDocument>,

    @InjectModel(Outlet.name)
    private outletModel: Model<OutletDocument>,

    @InjectModel(VerificationVoucher.name)
    private verificationVoucherModel: Model<VerificationVoucherDocument>,
    // @Inject('NOTIFICATION_PRODUCER')
    // private readonly client: ClientKafka,

    @InjectModel(Voucher.name)
    private voucherModel: Model<VoucherDocument>,

    @InjectModel(Voucher.name, 'secondary')
    private voucherModelSecondary: Model<VoucherDocument>,

    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,
    private transactionOptional: TransactionOptionalService,
    redeemService: RedeemService,
    notificationContentService: NotificationContentService,
    customerService: CustomerService,
    merchantService: MerchantV2Service,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @InjectModel(KeywordNotification.name)
    private keywordNotificationModel: Model<KeywordNotificationDocument>,
  ) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.redeemService = redeemService;
    this.notificationContentService = notificationContentService;
    this.customerService = customerService;
    this.merchantService = merchantService;
  }

  private async isExpired(id) {
    const voucher = await this.voucherModel.findById(id);
    const voucherEndDate = moment.utc(voucher.end_time);
    const today = moment.utc();
    const diff = voucherEndDate.diff(today, 'milliseconds');

    console.log('today', today.format());
    console.log('voucherEndDate', voucherEndDate.format());
    console.log(
      `Voucher Expiration -> Comparing ${today.format(
        'DD-MM-YYYY HH:mm:ss',
      )} with ${voucherEndDate.format(
        'DD-MMM-YYYY HH:mm:ss.SSS',
      )} with diff ${diff} seconds`,
    );

    if (diff <= 0) {
      return true;
    }
    return false;
  }

  async voucher_verification(
    request: VerificationVoucher,
    account: Account,
    authToken: string,
    path: string,
  ) {
    // toString
    let endTime: Date;
    const startTime = new Date();
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'VOUCHER_VERIFICATION';
    response.trace_custom_code = 'TRX';

    const trace_id = this.transactionOptional.getTracingId(request, response);

    await this.loggerVoucherVerification(
      account,
      request,
      trace_id,
      `[${trace_id} - ${
        request.msisdn
      }] Start voucher verification. Data: ${JSON.stringify(request)}`,
      startTime,
    );

    // console.log('resquest : ', request);
    if (!request.msisdn) {
      response.code = HttpStatusTransaction.ERR_MSISDN_INVALID;
      response.message = 'MSISDN not found.';
      response.transaction_classify = 'VOUCHER_VERIFICATION';
      response.payload = {
        trace_id: trace_id,
      };
      await this.loggerVoucherVerification(
        account,
        request,
        trace_id,
        `[${trace_id} - ${request.msisdn}] MSISDN not found !`,
        startTime,
        true,
      );

      return response;
    }

    if (!request.merchant_id) {
      response.code = HttpStatusTransaction.ERR_MERCHANT_CODE_INVALID;
      response.message = 'Merchant not found.';
      response.transaction_classify = 'VOUCHER_VERIFICATION';
      response.payload = {
        trace_id: trace_id,
      };
      await this.loggerVoucherVerification(
        account,
        request,
        trace_id,
        `[${trace_id} - ${request.msisdn}] Merchant not found !`,
        startTime,
        true,
      );

      return response;
    }

    let payloadEmitNotif;
    if (request.keyword_verification) {
      const outletRes: any = await this.outletModel
        .findOne({ outlet_code: request.merchant_id })
        .exec();

      // console.log(outletRes);

      await this.loggerVoucherVerification(
        account,
        request,
        trace_id,
        `[${trace_id} - ${
          request.msisdn
        }] Checking outlet. Data: ${JSON.stringify(outletRes)}`,
        startTime,
      );

      if (outletRes) {
        const isKeywordVerifExist = await this.keywordNotificationModel.findOne(
          {
            keyword_name: request.keyword_verification,
          },
        );
        // console.log('isKeywordVerifExist : ', isKeywordVerifExist);
        // console.log('Keyword not found : ', !isKeywordVerifExist);
        if (!isKeywordVerifExist) {
          response.code = HttpStatusTransaction.ERR_KEYWORD_NOT_FOUND;
          response.message = 'Keyword not found.';
          response.transaction_classify = 'VOUCHER_VERIFICATION';
          response.payload = {
            trace_id: trace_id,
          };
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] Keyword not found!`,
            startTime,
            true,
          );

          return response;
        } else {
          console.log('');
        }

        const isMsisdnExist = await this.voucherModel.findOne({
          msisdn: request.msisdn,
          need_verification: true,
        });

        if (!isMsisdnExist) {
          response.code = HttpStatusTransaction.ERR_MSISDN_INVALID;
          response.message = 'MSISDN not found.';
          response.transaction_classify = 'VOUCHER_VERIFICATION';
          response.payload = {
            trace_id: trace_id,
          };
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] MSISDN not found !`,
            startTime,
            true,
          );

          return response;
        }
        // const merchantRes = await this.merchantOutletModel
        //   .findOne({ outlet: { $in: [outletRes._id.toString()] } })
        //   .exec();

        // const merchant_id = merchantRes.merchant.toString();
        let merchant_id = this.merchant;
        if (outletRes?.merchant_id) {
          merchant_id = outletRes?.merchant_id;
        } else {
          merchant_id = outletRes?.merchant_detail?._id.toString();
        }

        // const url = this.url + 'vouchers/verify';
        // let merchant = '';
        // if (merchant_id) {
        //   merchant = merchant_id;
        // } else {
        //   merchant = this.merchant;
        // }

        // const postData = {
        //   locale: request.locale,
        //   voucher_codes: [request.voucher_code],
        //   merchant_flag: true,
        //   __v: 0,
        //   owner_id: 'member-635668a6b27be98f136413c5',
        //   realm_id: this.realm,
        //   branch_id: this.branch,
        //   merchant_id: merchant,
        // };

        // check voucher
        const findPayload = {
          keyword_verification: request.keyword_verification,
          msisdn: request.msisdn,
          need_verification: true,
          status: 'Redeem',
          end_time: {
            $gte: moment().utc().toDate(),
          },
        };

        if (
          request.voucher_code !== 'null' &&
          request.voucher_code !== '' &&
          request.voucher_code !== null &&
          request.voucher_code !== undefined
        ) {
          findPayload['responseBody.voucher_code'] = request.voucher_code;

          const getVoucherCode = await this.voucherModel.findOne({
            'responseBody.voucher_code': request.voucher_code,
          });

          if (getVoucherCode) {
            if (getVoucherCode.status === 'Verified') {
              response.code =
                HttpStatusTransaction.ERR_VOUCHER_ALREADY_VERIFIED;
              response.message = 'Voucher Already Verified';

              response.payload = {
                keyword_verification: request.keyword_verification,
                msisdn: request.msisdn,
                trace_id: trace_id,
              };

              // === SEND NOTIF ===
              const notificationNotFound =
                await this.notificationContentService.getNotificationTemplate(
                  NotificationTemplateConfig?.VOUCHER_VER_NOT_FOUND,
                  {
                    keyword: {
                      notification: [],
                    },
                  },
                );

              this.notificationClient.emit(
                process.env.KAFKA_NOTIFICATION_TOPIC,
                {
                  origin: 'voucher.voucher_verification_fail',
                  // program: {},
                  keyword: {}, // TODO : dont delete <<<
                  customer: {}, // TODO : dont delete <<<
                  keyword_verification: request.keyword_verification,
                  endpoint: path,
                  tracing_id: trace_id,
                  tracing_master_id: trace_id,
                  account: account,
                  submit_time: new Date(),
                  token: authToken,
                  incoming: request,
                  notification: notificationNotFound,
                },
              );
              // === END SEND NOTIF ===

              return response;
            } else if (getVoucherCode.status === 'Expired') {
              response.code = HttpStatusTransaction.ERR_VOUCHER_ALREADY_EXPIRED;
              response.message = 'Voucher Expired';

              response.payload = {
                keyword_verification: request.keyword_verification,
                msisdn: request.msisdn,
                trace_id: trace_id,
              };

              // === SEND NOTIF ===
              const notificationNotFound =
                await this.notificationContentService.getNotificationTemplate(
                  NotificationTemplateConfig?.VOUCHER_VER_NOT_FOUND,
                  {
                    keyword: {
                      notification: [],
                    },
                  },
                );

              this.notificationClient.emit(
                process.env.KAFKA_NOTIFICATION_TOPIC,
                {
                  origin: 'voucher.voucher_verification_fail',
                  // program: {},
                  keyword: {}, // TODO : dont delete <<<
                  customer: {}, // TODO : dont delete <<<
                  keyword_verification: request.keyword_verification,
                  endpoint: path,
                  tracing_id: trace_id,
                  tracing_master_id: trace_id,
                  account: account,
                  submit_time: new Date(),
                  token: authToken,
                  incoming: request,
                  notification: notificationNotFound,
                },
              );
              // === END SEND NOTIF ===
              return response;
            }
          } else {
            response.code = HttpStatusTransaction.ERR_VOUCHER_MISSING;
            response.message = 'Voucher Not Registered';

            response.payload = {
              keyword_verification: request.keyword_verification,
              msisdn: request.msisdn,
              trace_id: trace_id,
            };

            // === SEND NOTIF ===
            const notificationNotFound =
              await this.notificationContentService.getNotificationTemplate(
                NotificationTemplateConfig?.VOUCHER_VER_NOT_FOUND,
                {
                  keyword: {
                    notification: [],
                  },
                },
              );

            this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, {
              origin: 'voucher.voucher_verification_fail',
              // program: {},
              keyword: {}, // TODO : dont delete <<<
              customer: {}, // TODO : dont delete <<<
              keyword_verification: request.keyword_verification,
              endpoint: path,
              tracing_id: trace_id,
              tracing_master_id: trace_id,
              account: account,
              submit_time: new Date(),
              token: authToken,
              incoming: request,
              notification: notificationNotFound,
            });
            // === END SEND NOTIF ===
            return response;
          }
        }

        console.log('findPayload voucher : ', findPayload);
        await this.loggerVoucherVerification(
          account,
          request,
          trace_id,
          `[${trace_id} - ${
            request.msisdn
          }] Find Voucher Payload: ${JSON.stringify(findPayload)}`,
          startTime,
        );

        const vouchers = await this.voucherModel
          .find(findPayload, { end_time: 1 })
          .sort({ end_time: 1 })
          .limit(1);

        console.log('vouchers  : ', vouchers);

        // console.log(vouchers, 'vouchers voucher');
        await this.loggerVoucherVerification(
          account,
          request,
          trace_id,
          `[${trace_id} - ${request.msisdn}] Voucher result (${
            vouchers.length
          }): ${JSON.stringify(vouchers)}`,
          startTime,
        );

        if (vouchers.length === 0) {
          if (
            request.voucher_code !== 'null' &&
            request.voucher_code !== '' &&
            request.voucher_code !== null &&
            request.voucher_code !== undefined
          ) {
            const getVoucherCode = await this.voucherModel.findOne({
              'responseBody.voucher_code': request.voucher_code,
            });

            // console.log('getVoucherCode : ', getVoucherCode);

            // if (getVoucherCode.status === 'Verifed') {
            //   response.code = HttpStatusTransaction.ERR_VOUCHER_MISSING;
            //   response.transaction_classify = 'VOUCHER_VERIFICATION';
            //   response.message = 'Voucher not registered';
            //   response.payload = {
            //     keyword_verification: request.keyword_verification,
            //     msisdn: request.msisdn,
            //     trace_id: trace_id,
            //   };
            // } else if (getVoucherCode.status === 'Expired') {
            // }

            if (vouchers.length === 0) {
              response.code = HttpStatusTransaction.ERR_VOUCHER_MISSING;
            } else {
              response.code =
                getVoucherCode.status === 'Verified'
                  ? HttpStatusTransaction.ERR_VOUCHER_ALREADY_VERIFIED
                  : getVoucherCode.status === 'Expired'
                  ? HttpStatusTransaction.ERR_VOUCHER_ALREADY_EXPIRED
                  : HttpStatusTransaction.ERR_VOUCHER_MISSING;
            }

            response.transaction_classify = 'VOUCHER_VERIFICATION';

            if (vouchers.length === 0) {
              response.message = 'Voucher Not Registered';
            } else {
              response.message =
                getVoucherCode.status === 'Verified'
                  ? 'Voucher Already Verified'
                  : getVoucherCode.status === 'Expired'
                  ? 'Voucher Expired'
                  : 'Voucher Not Registered';
            }

            response.payload = {
              keyword_verification: request.keyword_verification,
              msisdn: request.msisdn,
              trace_id: trace_id,
            };

            // === SEND NOTIF ===
            const notificationNotFound =
              await this.notificationContentService.getNotificationTemplate(
                NotificationTemplateConfig?.VOUCHER_VER_NOT_FOUND,
                {
                  keyword: {
                    notification: [],
                  },
                },
              );

            this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, {
              origin: 'voucher.voucher_verification_fail',
              // program: {},
              keyword: {}, // TODO : dont delete <<<
              customer: {}, // TODO : dont delete <<<
              keyword_verification: request.keyword_verification,
              endpoint: path,
              tracing_id: trace_id,
              tracing_master_id: trace_id,
              account: account,
              submit_time: new Date(),
              token: authToken,
              incoming: request,
              notification: notificationNotFound,
            });
            // === END SEND NOTIF ===

            endTime = new Date();
            console.log(
              `NFT_VerificationVouhcerService.voucher_verification = ${
                endTime.getTime() - startTime.getTime()
              } ms`,
            );

            await this.loggerVoucherVerification(
              account,
              request,
              trace_id,
              `[${request.msisdn}] ${response.message}! ${JSON.stringify(
                response,
              )}`,
              startTime,
              true,
            );

            return response;
          }

          response.code = HttpStatusTransaction.ERR_VOUCHER_MISSING;
          response.transaction_classify = 'VOUCHER_VERIFICATION';
          response.message = 'Voucher not registered';
          response.payload = {
            keyword_verification: request.keyword_verification,
            msisdn: request.msisdn,
            trace_id: trace_id,
          };

          // === SEND NOTIF ===
          const notificationNotFound =
            await this.notificationContentService.getNotificationTemplate(
              NotificationTemplateConfig?.VOUCHER_VER_NOT_FOUND,
              {
                keyword: {
                  notification: [],
                },
              },
            );

          this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, {
            origin: 'voucher.voucher_verification_fail',
            // program: {},
            keyword: {}, // TODO : dont delete <<<
            customer: {}, // TODO : dont delete <<<
            keyword_verification: request.keyword_verification,
            endpoint: path,
            tracing_id: trace_id,
            tracing_master_id: trace_id,
            account: account,
            submit_time: new Date(),
            token: authToken,
            incoming: request,
            notification: notificationNotFound,
          });
          // === END SEND NOTIF ===

          endTime = new Date();
          console.log(
            `NFT_VerificationVouhcerService.voucher_verification = ${
              endTime.getTime() - startTime.getTime()
            } ms`,
          );

          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${
              request.msisdn
            }] Voucher Verification not found! ${JSON.stringify(response)}`,
            startTime,
            true,
          );

          return response;
        }

        // check expired
        const firstVoucher = vouchers[0];
        const getVoucherbyId = await this.voucherModel.findOne({
          _id: firstVoucher._id,
        });
        const getKeyword = await this.keywordModel.findOne({
          'eligibility.name': getVoucherbyId.keyword_name,
        });
        const reformatMsisdn = formatMsisdnCore(getVoucherbyId.msisdn);
        const getCustomer = await this.customerService.getCustomerByMSISDN(
          reformatMsisdn,
          authToken,
        );
        const getMerchant = await this.merchantService.detail(
          getKeyword.eligibility.merchant,
        );
        const isExpired = await this.isExpired(firstVoucher._id);
        // console.log('isExpired', isExpired);
        await this.loggerVoucherVerification(
          account,
          request,
          trace_id,
          `[${trace_id} - ${request.msisdn}] Voucher isExpired? ${isExpired}`,
          startTime,
        );

        payloadEmitNotif = {
          keyword: getKeyword,
          keyword_verification: request.keyword_verification,
          outlet_name: outletRes?.outlet_name,
          payload: {
            coupon: getMerchant,
            voucher: {
              core: getVoucherbyId.responseBody,
            },
          },
          redeem: {
            send_notification: true,
          },
          customer: getCustomer,
          incoming: {
            locale: 'en-US',
            channel_id: request?.channel_id,
            msisdn: getCustomer.msisdn,
            keyword: getKeyword.eligibility.name,
            send_notification: true,
          },
          tracing_id: trace_id,
          tracing_master_id: trace_id,
          submit_time: new Date().toISOString(),
        };

        // await this.loggerVoucherVerification(
        //   account,
        //   request,
        //   trace_id,
        //   `[${
        //     request.msisdn
        //   }] Payload for base notification. Data: ${JSON.stringify(
        //     payloadEmitNotif,
        //   )}`,
        //   startTime,
        // );

        if (isExpired) {
          // console.log('expire agung : ', getVoucherbyId);
          await this.voucherModel.findByIdAndUpdate(firstVoucher._id, {
            $set: {
              status: 'Expired',
              outlet_code: outletRes?.outlet_code,
              outlet_name: outletRes?.outlet_name,
            },
          });

          await this.updateVoucherStatus(getVoucherbyId, authToken, 'Expire');

          const notification_group_expired =
            NotificationTemplateConfig?.VOUCHER_VER_EXPIRED;
          const dataNotifExpired =
            await this.notificationContentService.getNotificationTemplate(
              notification_group_expired,
              {
                keyword: {
                  notification: [],
                },
              },
            );

          payloadEmitNotif.notification = dataNotifExpired;

          this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, {
            origin: 'voucher.voucher_verification_fail',
            ...payloadEmitNotif,
          });

          // console.log('Berhasil Kirim Notif And Update Status Expired');

          response.code = HttpStatusTransaction.ERR_VOUCHER_EXPIRE;
          response.transaction_classify = 'VOUCHER_VERIFICATION';
          response.message = 'Sorry, the voucher has expired';
          response.payload = {
            keyword_verification: request.keyword_verification,
            msisdn: request.msisdn,
            trace_id: trace_id,
          };

          endTime = new Date();
          console.log(
            `NFT_VerificationVouhcerService.voucher_verification = ${
              endTime.getTime() - startTime.getTime()
            } ms`,
          );

          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] Voucher is expired!`,
            startTime,
            true,
          );

          return response;
          // throw new BadRequestException([{ isExpired: 'Voucher is Expired' }]);
        }

        if (merchant_id && request.keyword_verification && request.msisdn) {
          // console.log('1. Verifying using merchant id, keyword, msisdn');
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] 1. Verifying using merchant id, keyword, msisdn`,
            startTime,
          );

          const merchantCheck = await this.keywordModel.findOne({
            'eligibility.merchant': merchant_id.toString(),
          });
          // console.log(`Searching for keyword ${merchantCheck}`);
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] Searching for keyword: ${merchantCheck?.eligibility.name}`,
            startTime,
          );

          // const outletCheck = await this.merchantOutletModel.findOne({
          //   outlet: merchant_id,
          // });
          if (merchantCheck) {
            // console.log('1a. Verifying using merchant id');
            await this.loggerVoucherVerification(
              account,
              request,
              trace_id,
              `[${trace_id} - ${request.msisdn}] 1a. Verifying using merchant id`,
              startTime,
            );

            // const voucherUpdate = await this.voucherModel
            //   .findOneAndUpdate(
            //     {
            //       keyword_verification: request.keyword_verification,
            //       msisdn: request.msisdn,
            //       merchant_id: merchant_id,
            //       need_verification: true,
            //       status: 'Redeem',
            //     },
            //     {
            //       $set: { status: 'Verified', verified_date: new Date() },
            //     },
            //     {
            //       sort: { end_time: 1 },
            //     },
            //   )
            const voucherUpdate = await this.voucherModel
              .findByIdAndUpdate(firstVoucher._id, {
                $set: {
                  status: 'Verified',
                  verified_date: new Date(),
                  outlet_code: outletRes?.outlet_code,
                  outlet_name: outletRes?.outlet_name,
                },
              })
              .then(async (result) => {
                // console.log('result agung verif : ', result);
                await this.updateVoucherStatus(result, authToken, 'Use');
                // console.log('1.b Add Voucher Verification Database');
                await this.loggerVoucherVerification(
                  account,
                  request,
                  trace_id,
                  `[${trace_id} - ${request.msisdn}] 1b. Add Voucher Verification Database`,
                  startTime,
                );

                // add to database
                new this.verificationVoucherModel({
                  ...request,
                  voucher_code: result.responseBody['voucher_code'],
                  master_id: trace_id,
                  voucher_id: result._id,
                }).save();

                // bonus redemption
                if (request.keyword_bonus) {
                  // console.log('1.c Redemption');
                  await this.loggerVoucherVerification(
                    account,
                    request,
                    trace_id,
                    `[${trace_id} - ${request.msisdn}] 1c. Redemtion with ${request.keyword_bonus}`,
                    startTime,
                  );

                  const data_redeem: RedeemDTO = {
                    locale: '',
                    msisdn: '',
                    keyword: '',
                    total_redeem: 0,
                    total_bonus: null,
                    redeem_type: '',
                    adn: '',
                    send_notification: false,
                    transaction_id: '',
                    channel_id: undefined,
                    callback_url: '',
                    additional_param: {},
                    transaction_source: '',
                    package_name: '',
                  };

                  data_redeem.msisdn = request.msisdn;
                  data_redeem.keyword = request.keyword_bonus;

                  const redeem = await this.redeemService
                    .redeem_v2(data_redeem, account, authToken)
                    .then(async (res) => {
                      await this.redeemService.emit_process(res, {
                        path: path,
                        token: authToken,
                        data: data_redeem,
                        account,
                        applicationService: this.applicationService,
                        client: this.client,
                        origin: 'redeem',
                      });

                      response.code = HttpStatusTransaction.CODE_SUCCESS;
                      response.message = 'Success';
                      response.transaction_classify = 'VOUCHER_VERIFICATION';
                      response.payload = {
                        voucher_code: result.responseBody['voucher_code'],
                        msisdn: result.msisdn,
                        merchant_id: result['merchant_id'],
                        trace_id: trace_id,
                        transaction_date: result.updated_at,
                      };

                      await this.loggerVoucherVerification(
                        account,
                        request,
                        trace_id,
                        `[${
                          request.msisdn
                        }] 1c. Redemtion success! ${JSON.stringify(response)}`,
                        startTime,
                      );

                      return response;
                    });
                  return redeem;
                }

                const notification_group_success =
                  NotificationTemplateConfig?.VOUCHER_VER_SUCCESS;
                const dataNotifSuccess =
                  await this.notificationContentService.getNotificationTemplate(
                    notification_group_success,
                    {
                      keyword: getKeyword,
                    },
                  );

                payloadEmitNotif.notification = dataNotifSuccess;

                await this.notificationClient.emit(
                  process.env.KAFKA_NOTIFICATION_TOPIC,
                  {
                    origin: 'voucher.voucher_verification_success',
                    ...payloadEmitNotif,
                  },
                );

                response.code = HttpStatusTransaction.CODE_SUCCESS;
                response.message = 'Success';
                response.transaction_classify = 'VOUCHER_VERIFICATION';
                response.payload = {
                  voucher_code: result.responseBody['voucher_code'],
                  msisdn: result.msisdn,
                  merchant_id: result['merchant_id'],
                  trace_id: trace_id,
                  transaction_date: result.updated_at,
                };

                await this.loggerVoucherVerification(
                  account,
                  request,
                  trace_id,
                  `[${
                    request.msisdn
                  }] 1d. Verification success! ${JSON.stringify(response)}`,
                  startTime,
                );

                return response;
              })
              .catch(async (err) => {
                await this.loggerVoucherVerification(
                  account,
                  request,
                  trace_id,
                  `[${trace_id} - ${
                    request.msisdn
                  }] 1. An error occured! ${JSON.stringify(err)}`,
                  startTime,
                  true,
                );

                throw new BadRequestException([
                  { isNotFound: 'Keyword Not Found' },
                ]);
              });

            endTime = new Date();

            console.log(
              `NFT_VerificationVouhcerService.voucher_verification = ${
                endTime.getTime() - startTime.getTime()
              } ms`,
            );

            return voucherUpdate;
            /*
          } else if (outletCheck) {
            console.log('1b. Verifying using outlet id');
            const voucherUpdate = await this.voucherModel
              .findOneAndUpdate(
                {
                  keyword_verification: request.keyword_verification,
                  msisdn: request.msisdn,
                  merchant_id: outletCheck.merchant,
                  need_verification: true,
                  status: 'Redeem',
                },
                {
                  $set: { status: 'Verified', verified_date: new Date() },
                },
                {
                  sort: { end_time: 1 },
                },
              )
              .then(async (result) => {
                // add to database
                new this.verificationVoucherModel({
                  ...request,
                  voucher_code: result.responseBody['voucher_code'],
                  master_id: trace_id,
                  voucher_id: result._id,
                }).save();

                // bonus redemption
                if (request.keyword_bonus) {
                  console.log('1.c Redemption');
                  const data_redeem: RedeemDTO = {
                    locale: '',
                    msisdn: '',
                    keyword: '',
                    total_redeem: 0,
                    redeem_type: '',
                    adn: '',
                    send_notification: false,
                    transaction_id: '',
                    channel_id: undefined,
                    callback_url: '',
                    additional_param: {},
                  };
                  data_redeem.msisdn = request.msisdn;
                  data_redeem.keyword = request.keyword_bonus;

                  const redeem = await this.redeemService
                    .redeem_v2(data_redeem, account, authToken)
                    .then(async (res) => {
                      await this.redeemService.emit_process(res, {
                        path: path,
                        token: authToken,
                        data: data_redeem,
                        account,
                        applicationService: this.applicationService,
                        client: this.client,
                        origin: 'redeem',
                      });

                      response.code = HttpStatusTransaction.CODE_SUCCESS;
                      response.message = 'Success';
                      response.transaction_classify = 'VOUCHER_VERIFICATION';
                      response.payload = {
                        voucher_code: result.responseBody['voucher_code'],
                        msisdn: result.msisdn,
                        merchant_id: result['merchant_id'],
                        trace_id: trace_id,
                        transaction_date: result.updated_at,
                      };
                      return response;
                    });
                  return redeem;
                }

                response.code = HttpStatusTransaction.CODE_SUCCESS;
                response.message = 'Success';
                response.transaction_classify = 'VOUCHER_VERIFICATION';
                response.payload = {
                  voucher_code: result.responseBody['voucher_code'],
                  msisdn: result.msisdn,
                  merchant_id: result['merchant_id'],
                  trace_id: trace_id,
                  transaction_date: result.updated_at,
                };
                return response;
              })
              .catch((err) => {
                response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
                response.message = 'Failed';
                response.transaction_classify = 'VOUCHER_VERIFICATION';
                response.payload = {
                  err: err,
                  trace_id: trace_id,
                };
                return response;
              });

            return voucherUpdate;
          */
          } else {
            throw new BadRequestException([
              { isMerchantNotFound: 'Merchant Not Found' },
            ]);
          }
        } else if (request.keyword_verification && request.msisdn) {
          // console.log('2. Verifying using keyword and msisdn');
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] 2. Verifying using keyword and msisdn`,
            startTime,
          );

          const voucherUpdate = await this.voucherModel
            .findByIdAndUpdate(firstVoucher._id, {
              $set: {
                status: 'Verified',
                verified_date: new Date(),
                outlet_code: outletRes?.outlet_code,
                outlet_name: outletRes?.outlet_name,
              },
            })
            .then(async (result) => {
              // console.log('result agung verif 1 : ', result);
              await this.updateVoucherStatus(result, authToken, 'Use');
              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${request.msisdn}] 2b. Add voucher verification database`,
                startTime,
              );

              // add to database
              new this.verificationVoucherModel({
                ...request,
                voucher_code: result.responseBody['voucher_code'],
                master_id: trace_id,
                voucher_id: result._id,
              }).save();

              // bonus redemption
              if (request.keyword_bonus) {
                // console.log('1.c Redemption');
                await this.loggerVoucherVerification(
                  account,
                  request,
                  trace_id,
                  `[${trace_id} - ${request.msisdn}] 2c. Redemtion with ${request.keyword_bonus}`,
                  startTime,
                );

                const data_redeem: RedeemDTO = {
                  locale: '',
                  msisdn: '',
                  keyword: '',
                  total_redeem: 0,
                  total_bonus: null,
                  redeem_type: '',
                  adn: '',
                  send_notification: false,
                  transaction_id: '',
                  channel_id: undefined,
                  callback_url: '',
                  additional_param: {},
                  transaction_source: '',
                  package_name: '',
                };

                data_redeem.msisdn = request.msisdn;
                data_redeem.keyword = request.keyword_bonus;

                const redeem = await this.redeemService
                  .redeem_v2(data_redeem, account, authToken)
                  .then(async (res) => {
                    await this.redeemService.emit_process(res, {
                      path: path,
                      token: authToken,
                      data: data_redeem,
                      account,
                      applicationService: this.applicationService,
                      client: this.client,
                      origin: 'redeem',
                    });

                    response.code = HttpStatusTransaction.CODE_SUCCESS;
                    response.message = 'Success';
                    response.transaction_classify = 'VOUCHER_VERIFICATION';
                    response.payload = {
                      voucher_code: result.responseBody['voucher_code'],
                      msisdn: result.msisdn,
                      merchant_id: result['merchant_id'],
                      trace_id: trace_id,
                      transaction_date: result.updated_at,
                    };

                    await this.loggerVoucherVerification(
                      account,
                      request,
                      trace_id,
                      `[${
                        request.msisdn
                      }] 2c. Redemtion success! ${JSON.stringify(response)}`,
                      startTime,
                    );

                    return response;
                  });
                return redeem;
              }

              const notification_group_success =
                NotificationTemplateConfig?.VOUCHER_VER_SUCCESS;
              const dataNotifSuccess =
                await this.notificationContentService.getNotificationTemplate(
                  notification_group_success,
                  {
                    keyword: getKeyword,
                  },
                );

              payloadEmitNotif.notification = dataNotifSuccess;

              await this.notificationClient.emit(
                process.env.KAFKA_NOTIFICATION_TOPIC,
                {
                  origin: 'voucher.voucher_verification_success',
                  ...payloadEmitNotif,
                },
              );

              response.code = HttpStatusTransaction.CODE_SUCCESS;
              response.message = 'Success';
              response.transaction_classify = 'VOUCHER_VERIFICATION';
              response.payload = {
                voucher_code: result.responseBody['voucher_code'],
                msisdn: result.msisdn,
                merchant_id: result['merchant_id'],
                trace_id: trace_id,
                transaction_date: result.updated_at,
              };

              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${
                  request.msisdn
                }] 2d. Verification success! ${JSON.stringify(response)}`,
                startTime,
              );

              return response;
            })
            .catch(async (err) => {
              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${
                  request.msisdn
                }] 2. An error occured! ${JSON.stringify(err)}`,
                startTime,
                true,
              );

              throw new BadRequestException([
                { isNotFound: 'Keyword Not Found' },
              ]);
            });

          endTime = new Date();
          console.log(
            `NFT_VerificationVouhcerService.voucher_verification = ${
              endTime.getTime() - startTime.getTime()
            } ms`,
          );

          return voucherUpdate;
        } else if (
          request.keyword_verification &&
          request.voucher_code !== 'null' &&
          request.voucher_code !== '' &&
          request.voucher_code !== null &&
          request.voucher_code !== undefined
        ) {
          // console.log('3. Verifying using keyword and voucher code');
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] 3. Verifying using keyword and voucher code`,
            startTime,
          );

          // const voucherUpdate = await this.voucherModel
          //   .findOneAndUpdate(
          //     {
          //       keyword_verification: request.keyword_verification,
          //       'responseBody.voucher_code': request.voucher_code,
          //       need_verification: true,
          //       status: 'Redeem',
          //     },
          //     {
          //       $set: { status: 'Verified', verified_date: new Date() },
          //     },
          //     {
          //       sort: { end_time: 1 },
          //     },
          //   )
          const voucherUpdate = await this.voucherModel
            .findByIdAndUpdate(firstVoucher._id, {
              $set: {
                status: 'Verified',
                verified_date: new Date(),
                outlet_code: outletRes?.outlet_code,
                outlet_name: outletRes?.outlet_name,
              },
            })
            .then(async (result) => {
              // console.log('result agung verif 2 : ', result);
              await this.updateVoucherStatus(result, authToken, 'Use');
              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${request.msisdn}] 3b. Add voucher verification database`,
                startTime,
              );

              // add to database
              new this.verificationVoucherModel({
                ...request,
                voucher_code: result.responseBody['voucher_code'],
                master_id: trace_id,
                voucher_id: result._id,
              }).save();

              // bonus redemption
              if (request.keyword_bonus) {
                // console.log('1.c Redemption');
                await this.loggerVoucherVerification(
                  account,
                  request,
                  trace_id,
                  `[${trace_id} - ${request.msisdn}] 3c. Redemtion with ${request.keyword_bonus}`,
                  startTime,
                );

                const data_redeem: RedeemDTO = {
                  locale: '',
                  msisdn: '',
                  keyword: '',
                  total_redeem: 0,
                  total_bonus: null,
                  redeem_type: '',
                  adn: '',
                  send_notification: false,
                  transaction_id: '',
                  channel_id: undefined,
                  callback_url: '',
                  additional_param: {},
                  transaction_source: '',
                  package_name: '',
                };

                data_redeem.msisdn = result.msisdn;
                data_redeem.keyword = request.keyword_bonus;

                const redeem = await this.redeemService
                  .redeem_v2(data_redeem, account, authToken)
                  .then(async (res) => {
                    await this.redeemService.emit_process(res, {
                      path: path,
                      token: authToken,
                      data: data_redeem,
                      account,
                      applicationService: this.applicationService,
                      client: this.client,
                      origin: 'redeem',
                    });

                    response.code = HttpStatusTransaction.CODE_SUCCESS;
                    response.message = 'Success';
                    response.transaction_classify = 'VOUCHER_VERIFICATION';
                    response.payload = {
                      voucher_code: result.responseBody['voucher_code'],
                      msisdn: result.msisdn,
                      merchant_id: result['merchant_id'],
                      trace_id: trace_id,
                      transaction_date: result.updated_at,
                    };

                    await this.loggerVoucherVerification(
                      account,
                      request,
                      trace_id,
                      `[${
                        request.msisdn
                      }] 3c. Redemtion success! ${JSON.stringify(response)}`,
                      startTime,
                    );

                    return response;
                  });
                return redeem;
              }

              const notification_group_success =
                NotificationTemplateConfig?.VOUCHER_VER_SUCCESS;
              const dataNotifSuccess =
                await this.notificationContentService.getNotificationTemplate(
                  notification_group_success,
                  {
                    keyword: getKeyword,
                  },
                );

              payloadEmitNotif.notification = dataNotifSuccess;

              await this.notificationClient.emit(
                process.env.KAFKA_NOTIFICATION_TOPIC,
                {
                  origin: 'voucher.voucher_verification_success',
                  ...payloadEmitNotif,
                },
              );

              response.code = HttpStatusTransaction.CODE_SUCCESS;
              response.message = 'Success';
              response.transaction_classify = 'VOUCHER_VERIFICATION';
              response.payload = {
                voucher_code: result.responseBody['voucher_code'],
                msisdn: result.msisdn,
                merchant_id: result['merchant_id'],
                trace_id: trace_id,
                transaction_date: result.updated_at,
              };

              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${
                  request.msisdn
                }] 3d. Verification success! ${JSON.stringify(response)}`,
                startTime,
              );

              return response;
            })
            .catch(async (err) => {
              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${
                  request.msisdn
                }] 1. An error occured! ${JSON.stringify(err)}`,
                startTime,
                true,
              );

              throw new BadRequestException([
                { isNotFound: 'Keyword Not Found' },
              ]);
            });

          endTime = new Date();
          console.log(
            `NFT_VerificationVouhcerService.voucher_verification = ${
              endTime.getTime() - startTime.getTime()
            } ms`,
          );

          return voucherUpdate;
        }
      } else {
        response.code = HttpStatusTransaction.ERR_MERCHANT_CODE_INVALID;
        response.message = 'Outlet Code does not Registered.';
        response.transaction_classify = 'VOUCHER_VERIFICATION';
        response.payload = {
          trace_id: trace_id,
        };

        await this.loggerVoucherVerification(
          account,
          request,
          trace_id,
          `[${trace_id} - ${request.msisdn}] Outlet code not registered!`,
          startTime,
          true,
        );

        return response;
      }
    } else {
      response.code = HttpStatusTransaction.ERR_KEYWORD_NOT_FOUND;
      response.message = 'Keyword not found.';
      response.transaction_classify = 'VOUCHER_VERIFICATION';
      response.payload = {
        trace_id: trace_id,
      };

      endTime = new Date();
      console.log(
        `NFT_VerificationVouhcerService.voucher_verification = ${
          endTime.getTime() - startTime.getTime()
        } ms`,
      );

      await this.loggerVoucherVerification(
        account,
        request,
        trace_id,
        `[${trace_id} - ${request.msisdn}] Keyword does not registered!`,
        startTime,
        true,
      );

      return response;
    }
  }

  async batch_redeem(data: RedeemDTO, account: Account, authToken: string) {
    data.send_notification = true;
    const redeemRes = await this.redeemService
      .redeem_v2(data, account, authToken)
      .then(async (response) => {
        return response;
      });

    return await this.return_res(redeemRes);
  }

  async return_res(response) {
    if (response.code !== 'S00000') {
      throw new BadRequestException(response.message);
    } else {
      return response;
    }
  }

  async getVoucherId(payload: any, authToken: string) {
    const response = new GlobalTransactionResponse();
    const query = [
      `projection={"voucher_code" : 1}`,
      `realm_id=${payload.responseBody.realm_id}`,
      `branch_id=${payload.responseBody.branch_id}`,
      `merchant_id=${payload.responseBody.merchant_id}`,
    ];

    console.log(
      'url get voucher : ',
      `${this.url}/vouchers/${payload.id}?${query.join('&')}`,
    );

    return await lastValueFrom(
      this.httpService
        .get(`${this.url}/vouchers/${payload.id}?${query.join('&')}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        })
        .pipe(
          map(async (res) => {
            return res.data.payload;
          }),
          catchError(async (e) => {
            console.log('agung 1 error  :', e);
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

  async updateVoucherStatus(payload: any, authToken: string, status: any) {
    const response = new GlobalTransactionResponse();

    const data = await this.getVoucherId(payload, authToken);
    console.log('data voucher : ', data?.voucher);

    const payloadPatch = {
      merchant_id: data?.voucher?.merchant_id,
      status: status,
      __v: data?.voucher?.__v,
    };

    return await lastValueFrom(
      await this.httpService
        .patch<any>(`${this.url}/vouchers/${data?.voucher?.id}`, payloadPatch, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        })
        .pipe(
          map(async (result) => {
            const resultData = result.data;
            console.log('agung voucher data  response : ', resultData);
            return resultData;
          }),
          catchError(async (e) => {
            console.log('agung 1 error  :', e);
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

  async loggerVoucherVerification(
    account: any,
    payload: any,
    tracing_id: any,
    message: any,
    start: any,
    isError: any = false,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());

    console.log(message);

    await this.exceptionHandler.handle({
      level: isError ? 'warn' : 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: tracing_id,
      config: this.configService,
      taken_time: takenTime,
      statusCode: isError ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
      payload: {
        transaction_id: tracing_id,
        statusCode: isError ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
        method: 'POST',
        url: '/v1/voucher/verification',
        service: 'GATEWAY',
        step: message,
        param: payload,
        taken_time: takenTime,
        result: {
          statusCode: isError ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
          level: isError ? 'error' : 'verbose',
          message: message,
          trace: tracing_id,
          msisdn: payload.msisdn,
          user_id: new IAccount(account ?? null),
        },
      } satisfies LoggingData,
    });
  }

  async redeemed(param): Promise<unknown> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};

    query.push({
      $match: {
        $and: [
          {
            need_verification: true,
            status: 'Redeem',
            deleted_at: null,
            end_time: {
              $gte: moment().utc().toDate(),
            },
          },
        ],
      },
    });

    const filter_builder = { $and: [] };
    const filterSet = filters;
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {};
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {};
        }

        if (filterSet[a].matchMode === 'contains') {
          if (a === 'created_at') {
            const start =
              moment(filterSet[a].start_date)
                .subtract(1, 'days')
                .format('YYYY-MM-DDT') + '17:00:00.000Z';
            const end =
              moment(filterSet[a].end_date).format('YYYY-MM-DDT') +
              '17:00:00.000Z';
            autoColumn[a] = {
              $gte: new Date(start),
              $lt: new Date(end),
            };
          } else {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          }
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          if (a === '_id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        }

        filter_builder.$and.push(autoColumn, { deleted_at: null });
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    }

    const allNoPagination = await this.voucherModelSecondary.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    query.push({ $skip: first });

    query.push({ $limit: rows });

    console.log(query);

    const data = await this.voucherModelSecondary.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoPagination.length,
        data: data,
      },
    };
  }
}
