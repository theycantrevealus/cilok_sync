import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { ExceptionHandler, LoggingRequest } from '@utils/logger/handler';
import { LoggingData } from '@utils/logger/transport';
import { IAccount } from '@utils/logger/transport';
import { AxiosRequestConfig } from 'axios';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';

import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  allowedMSISDN,
  formatMsisdnCore,
  getMsisdnOnly,
  isObject,
  msisdnCombineFormatted,
} from '@/application/utils/Msisdn/formatter';
import { findProp } from '@/application/utils/NestedObject/findProp';
import { CustomerService } from '@/customer/services/customer.service';
import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { LovService } from '@/lov/services/lov.service';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { ViewPointQueryDTO } from '@/transaction/dtos/point/view_current_balance/view.current.balance.property.dto';
import { PointService } from '@/transaction/services/point/point.service';

import { ResponseInjectPoint } from './dtos/inject_point.dto';
import { InjectPoint, InjectPointDocument } from './model/inject.point.model';

const moment = require('moment-timezone');

@Injectable()
export class InjectService {
  private url: string;
  private realm: string;
  private branch: string;
  private merchant: string;
  private raw_core: string;
  private raw_port: number;
  constructor(
    @InjectModel(InjectPoint.name)
    private injectPointModel: Model<InjectPointDocument>,

    @Inject(ApplicationService)
    private applicationService: ApplicationService,

    @Inject(PointService)
    private readonly pointService: PointService,

    @Inject(TransactionOptionalService)
    private transactionConfig: TransactionOptionalService,

    @Inject('INJECT_POINT_SERVICE_PRODUCER')
    private readonly injectPointClient: ClientKafka,

    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,

    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,

    @Inject('REPORTING_POINT_EVENT_PRODUCER')
    private readonly clientReportingBI: ClientKafka,

    @Inject(LovService)
    private lovService: LovService,
    // configService: ConfigService,

    @Inject(CustomerService)
    private readonly customerService: CustomerService,

    @Inject(HttpService)
    private readonly httpService: HttpService,

    @Inject(NotificationContentService)
    private notifService: NotificationContentService,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(ConfigService) private readonly configService: ConfigService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {
    this.url = `${this.configService.get<string>('core-backend.api.url')}`;
    this.merchant = `${this.configService.get<string>(
      'core-backend.merchant.id',
    )}`;
    this.raw_core = `${this.configService.get<string>('core-backend.raw')}`;
    this.raw_port = this.configService.get<number>('core-backend.raw_port');
    this.customerService = customerService;
    this.branch = `${this.configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${this.configService.get<string>('core-backend.realm.id')}`;
  }

  //------------------------------------------- NEW SERVICE -------------------------------------------------
  async validation(payload: any) {
    const start = new Date();

    try {
      let point;

      /**
       * START BUILD PAYLOAD
       * if origin from inject_point_api
       */
      if (payload.origin == 'inject_point') {
        let returnBuildPayload = true;

        try {
          const request = payload.incoming;

          // config total point for inject point
          let amount = request.total_point;
          if (typeof request.total_point == 'undefined') {
            amount = -1;
          } else if (request.total_point === 0) {
            amount = 0;
          } else if (request.total_point < 0) {
            // throw new BadRequestException([
            //   { isInvalidDataContent: 'Total Point Must +' },
            // ]);

            return this.notification_inject_point(
              'Total point must +',
              payload,
              true,
            );
          }

          returnBuildPayload = await this.pointService
            .getSelectedData(request, payload.token)
            .then(async (value: any) => {
              // create remark
              const _eligibility = value?.keyword?.eligibility;

              let program_experience = '';
              const _program_experience =
                _eligibility?.program_experience.toString();
              if (_program_experience) {
                try {
                  const lov = await this.lovService.getLovData(
                    _program_experience,
                  );
                  program_experience = lov.set_value;
                } catch (error) {
                  console.log('==== PREPARE PAYLOAD ======');
                  console.log('get program_experience not found');
                  console.log(error);
                  console.log('==== PREPARE PAYLOAD ======');

                  return false;
                }
              }

              const remark = [
                _eligibility?.program_title_expose
                  ? _eligibility?.program_title_expose
                  : '',
                _eligibility.name,
                // eslint-disable-next-line prettier/prettier
                    _eligibility?.program_experience ? (program_experience ? program_experience : '') : '',
              ].join('|');

              const coreRequest = {
                locale: request.locale, //"id-ID"
                type: 'reward',
                channel: request.channel_id,
                transaction_no: payload.tracing_id,
                remark: remark,
                reward_item_id: value?.reward_item_id,
                reward_instance_id: value?.reward_instance_id,
                amount: amount,
                member_id: value.customer_core
                  ? value.customer_core[0]?.id
                  : null,
                realm_id: this.realm,
                branch_id: this.branch,
                merchant_id: this.merchant,
                __v: 0,
              };

              // tambahkan payload yang kosong
              payload.program = value.program;
              payload.keyword = value.keyword;
              payload.customer = value.customer;

              payload.payload.inject_point = coreRequest;

              // emit ke trx master
              this.transactionMasterClient.emit(
                process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
                payload,
              );

              // === START BONUS VALIDATION, 2024-07-25 ===
              let is_invalid_keyword = false;

              try {
                const keywordProfile = payload?.keyword;

                // fixed multiple validation
                const keywordType = keywordProfile?.eligibility?.poin_value;
                if (keywordType == 'Fixed Multiple') {
                  is_invalid_keyword = true;
                }

                // multibonus validation
                const is_main_keyword =
                  keywordProfile?.is_main_keyword != false;
                const is_multi_bonus =
                  is_main_keyword && keywordProfile?.child_keyword?.length > 0;

                if (is_multi_bonus) {
                  is_invalid_keyword = true;
                } else if (!is_main_keyword) {
                  is_invalid_keyword = true;
                }

                // bonus IS NOT point
                const bonusType = keywordProfile?.bonus?.[0]?.bonus_type;
                if (bonusType != 'loyalty_poin') {
                  is_invalid_keyword = true;
                }
              } catch (err) {
                console.error(err);
                await this.loggerInjectPoint(
                  payload,
                  'An error occured bonus validation!',
                  start,
                  err,
                  false,
                );

                return await this.keyword_error(
                  payload,
                  NotificationTemplateConfig.REDEEM_FAILED_GENERAL,
                );
              }

              await this.loggerInjectPoint(
                payload,
                `Is INVALID Keyword (Not Applicable)? ${is_invalid_keyword}`,
                start,
                `Is INVALID Keyword (Not Applicable)? ${is_invalid_keyword}`,
                false,
              );

              // KEYWORD IS INVALID
              if (is_invalid_keyword) {
                return await this.keyword_error(
                  payload,
                  NotificationTemplateConfig.REDEEM_FAILED_INVALID_KEYWORD,
                );
              }
              // === END BONUS VALIDATION, 2024-07-25 ===

              return true;
            })
            .catch(async (err) => {
              this.notification_inject_point(err?.message, payload, true);

              console.error(err);

              await this.loggerInjectPoint(
                payload,
                `Build Payload (getSelectedData): ${err?.message}`,
                start,
                `Build Payload (getSelectedData): ${err?.message}`,
                false,
              );

              return false;
            });
        } catch (err) {
          this.notification_inject_point(err?.message, payload, true);

          console.error(err);

          await this.loggerInjectPoint(
            payload,
            `Build Payload: ${err?.message}`,
            start,
            `Build Payload: ${err?.message}`,
            false,
          );

          return false;
        }

        if (!returnBuildPayload) {
          return false;
        }
      }

      /**
       * END BUILD PAYLOAD
       */

      // ==
      // MAIN FUNCTION BELOW
      // ==

      const keyword = payload.keyword;
      const incoming = payload.incoming;
      const token = payload.token;
      const eligibility = payload.keyword.eligibility;
      const origin = payload.origin.split('.');

      try {
        // add new field create_local_time
        payload.payload.inject_point.create_local_time =
          this.transactionConfig.convertUTCtoGMT7LocalFormat(
            payload.submit_time ?? '',
          );
      } catch (error) {
        console.error(
          '[INJECT_POINT] Failed create_local_time ',
          error?.message,
        );
      }

      // check bonus loyalty_poin
      const bonus = keyword.bonus.filter((e) => e.bonus_type == 'loyalty_poin');
      if (
        origin[0] == 'inject_point' &&
        eligibility.poin_value != '' &&
        bonus.length > 0
      ) {
        // inject point not use point_redeemed
        point = bonus[0].earning_poin;

        const bonus_external = keyword.bonus.filter(
          (e) =>
            e.bonus_type == 'telco_prepaid' ||
            e.bonus_type == 'telco_postpaid' ||
            e.bonus_type == 'ngrs' ||
            e.bonus_type == 'link_aja' ||
            e.bonus_type == 'link_aja_main' ||
            e.bonus_type == 'link_aja_bonus',
        );
        if (eligibility.poin_value === 'Fixed Multiple' && bonus_external > 0) {
          await this.loggerInjectPoint(
            payload,
            `Inject Point Service : Fail because fixed multiple and bonus external is exists `,
            start,
            'Fail because fixed multiple and bonus external is exists',
            false,
          );
          this.notification_inject_point(
            'Fail because fixed multiple and bonus external is exists ',
            payload,
          );
        } else {
          if (eligibility.poin_value === 'Fixed') {
            payload.payload.inject_point.amount = point;
            await this.loggerInjectPoint(
              payload,
              `Inject Point Set Fixed :  ${payload.payload.inject_point.amount}`,
              start,
              `Inject Point Set Fixed : ${payload.payload.inject_point.amount}`,
              false,
              true,
            );
            this.prepare_inject_point(payload);
          } else if (eligibility.poin_value === 'Flexible') {
            console.log(payload.payload.inject_point.amount, point);
            if (payload.payload.inject_point.amount == -1) {
              payload.payload.inject_point.amount = point;
            }

            // // start flexible logic
            // const flexibility = bonus?.[0]?.flexibility;
            // console.log('Point flexibility:', flexibility);

            // if (flexibility == 'Flexible') {
            //   const pointFlexible = payload.incoming?.total_bonus;
            //   if (pointFlexible) {
            //     payload.payload.inject_point.amount = pointFlexible;
            //   } else {
            //     payload.payload.inject_point.amount = point;
            //   }
            // }
            // // end logic

            await this.loggerInjectPoint(
              payload,
              `Inject Point Set Flexible ${payload.payload.inject_point.amount}`,
              start,
              `Inject Point Set Flexible ${payload.payload.inject_point.amount}`,
              false,
              true,
            );
            this.prepare_inject_point(payload);
          } else if (eligibility.poin_value === 'Fixed Multiple') {
            const corePayload = payload.payload.inject_point;

            const reformatMsisdn = msisdnCombineFormatted(incoming.msisdn); // check_member_core
            try {
              const data: any = await this.customerService.check_member_core(
                reformatMsisdn,
                token,
                corePayload.reward_item_id,
              );

              corePayload.member_id = corePayload.member_id
                ? corePayload.member_id
                : data?.member_core_id;
              corePayload.__v =
                data?.__v || data?.__v >= 0 ? data.__v : corePayload.__v;
            } catch (data_fail) {
              console.log(
                `<-- catch :: fail check member core :: ${payload.tracing_master_id} :: start -->`,
              );

              corePayload.member_id = corePayload.member_id
                ? corePayload.member_id
                : data_fail?.member_core_id;

              console.log(data_fail);

              console.log(
                `<-- catch :: fail check member core :: ${payload.tracing_master_id} :: end -->`,
              );
            }

            // set to payload inject_point
            payload.payload.inject_point = corePayload;

            await this.fixed_multiple_inject_point_process(payload);
          } else {
            await this.loggerInjectPoint(
              payload,
              `Inject Point Service : Fail, point value is unknown `,
              start,
              'Fail, point value is unknown',
              false,
            );
            this.notification_inject_point(
              'Fail, point value is unknown ',
              payload,
            );
          }
        }
      } else {
        /**
         * Start bonus flexible logic
         */
        const flexibility = bonus?.[0]?.flexibility;
        point = bonus?.[0]?.earning_poin;

        await this.loggerInjectPoint(
          payload,
          `Inject Point (Redeem) -> Bonus flexibility (${flexibility})`,
          start,
          `Inject Point (Redeem) -> Bonus flexibility (${flexibility})`,
          false,
          true,
        );

        if (flexibility == 'Flexible') {
          const pointFlexible = payload.incoming?.total_bonus;

          if (pointFlexible) {
            payload.payload.inject_point.amount = pointFlexible;
          } else {
            payload.payload.inject_point.amount = point;
          }

          await this.loggerInjectPoint(
            payload,
            `Inject Point (Redeem) -> Bonus flexibility (${flexibility}) | Point set: ${
              payload.payload.inject_point.amount
            } | From payload: ${pointFlexible ? 'true' : 'false'}`,
            start,
            `Inject Point (Redeem) -> Bonus flexibility (${flexibility}) | Point set: ${
              payload.payload.inject_point.amount
            } | From payload: ${pointFlexible ? 'true' : 'false'}`,
            false,
            true,
          );
        }
        /**
         * End flexible logic
         */

        await this.prepare_inject_point(payload);
      }
    } catch (e) {
      console.log('ERROR/CACTH', e);

      console.log(
        '---------------------------------------------------------------------------',
      );
      console.log('Payload is Object ? ', isObject(payload));
      console.log(
        '---------------------------------------------------------------------------',
      );

      if (isObject(payload)) {
        await this.loggerInjectPoint(
          payload,
          `Inject Point Service : validation ${e.message} `,
          start,
          e,
          true,
        );

        this.notification_inject_point(e.message, payload);
      }
    }
  }

  async prepare_inject_point(payload: any) {
    const start = new Date();
    try {
      if (payload.payload.inject_point.amount < 0) {
        const point = payload.keyword.bonus.filter(
          (e) => e.bonus_type == 'loyalty_poin',
        );
        if (point.length > 0) {
          if (point[0]['earning_poin'] <= 0) {
            console.log('== INJECT POINT CHECK ==');
            console.log('point from bonus loyalty_poin is zero or less then 0');
            await this.loggerInjectPoint(
              payload,
              `Inject Point Service : Total point not enough , point from bonus loyalty_poin is zero or less then 0`,
              start,
              'Total point not enough , point from bonus loyalty_poin is zero or less then 0',
              false,
            );
            this.notification_inject_point('Total point not enough', payload);
            console.log('== INJECT POINT CHECK ==');
            return false;
          }
          payload.payload.inject_point.amount = point[0]['earning_poin'];
        } else {
          console.log('== INJECT POINT CHECK ==');
          console.log(
            'Cannot found bonus type loyalty_poin on direct inject_poin',
          );
          await this.loggerInjectPoint(
            payload,
            `Inject Point Service : Total point not enough ,Cannot found bonus type loyalty_poin on direct inject_poin `,
            start,
            'Total point not enough , Cannot found bonus type loyalty_poin on direct inject_poin',
            false,
          );
          this.notification_inject_point('Total point not enough', payload);
          console.log('== INJECT POINT CHECK ==');
          return false;
        }
      }

      return await this.point_inject(payload)
        .then(async (e) => {
          console.log(e);
          if (e.code == 'S00000') {
            console.log('SUCCESS', e);
            await this.loggerInjectPoint(
              payload,
              `Inject Point Service : ${e.message}`,
              start,
              e,
              false,
            );
            this.notification_inject_point(e.message, payload, false);

            try {
              // emit to point event to BI
              const poinBalance =
                payload?.incoming?.responseBody?.payload?.wallet?.pocket?.reward
                  ?.total ?? 0;
              const injectPoint = payload?.payload?.inject_point?.amount ?? 0;
              const trx_date = moment(payload.submit_time).format('YYYY-MM-DD');
              const trx_datetime = moment(payload).format(
                'YYYY-MM-DD HH:mm:ss.SSS',
              );

              await this.loggerInjectPoint(
                payload,
                `Inject Point Emit success for reporting-point-event-to-bi`,
                start,
                `Inject Point Emit success for reporting-point-event-to-bi`,
                false,
                true,
              );
              console.log('payload?.payload? agung ', payload?.payload);

              this.clientReportingBI.emit('reporting-point-event-to-bi', {
                origin: 'reporting.inject',
                tracing_id: payload.tracing_id,
                tracing_master_id: payload.tracing_master_id,
                payload: {
                  trx_date: trx_date,
                  msisdn: getMsisdnOnly(payload.incoming.msisdn),
                  trx_datetime: trx_datetime,
                  poin: injectPoint,
                  pointype:
                    payload.payload?.reporting_point_event_bi?.point_type ?? '',
                  reedem_channel: payload.payload?.inject_point?.channel ?? '',
                  merchant_name:
                    payload.payload?.reporting_point_event_bi?.merchant_name ??
                    '',
                  customer_tier:
                    payload.customer?.loyalty_tier &&
                    payload.customer?.loyalty_tier.length > 0
                      ? payload.customer?.loyalty_tier[0].name
                      : '',
                  poin_balance: poinBalance + injectPoint,
                  trx_id: payload.tracing_master_id,
                },
              });
            } catch (e) {
              await this.loggerInjectPoint(
                payload,
                `Inject Point Emit failed for reporting-point-event-to-bi : ${e.message}`,
                start,
                e,
                false,
              );
              console.error(
                '[INJECT_POINT] Emit failed for reporting-point-event-to-bi: ',
                e,
              );
            }

            return false;
          } else {
            if (e.code == 'E02001') {
              // send notification
              await this.loggerInjectPoint(
                payload,
                `Inject Point Service : ${e.message}`,
                start,
                e,
                false,
              );
              this.notification_inject_point(e.message, payload);
              return false;
            } else {
              // retry emit to consumer inject_point until limit
              await this.loggerInjectPoint(
                payload,
                `Inject Point Service Retry : ${e.message}`,
                start,
                e,
                false,
              );
              this.retry_inject_point(e.message, payload);
              return false;
            }
          }
        })
        .catch(async (e) => {
          console.log('error line b', e.line);
          console.log('ERROR/CACTH', e);
          await this.loggerInjectPoint(
            payload,
            `Inject Point Service ERROR ${e.message}`,
            start,
            e,
            true,
          );
          this.notification_inject_point(e.message, payload);
          return false;
        });
    } catch (e) {
      console.log('error line c', e.line);
      console.log('ERROR/CACTH', e);
      await this.loggerInjectPoint(
        payload,
        `Inject Point ERROR ${e.message}`,
        start,
        e,
        true,
      );
    }
  }

  async keyword_error(payload, notificationGroup) {
    const request = {
      ...payload,
      notification: {},
    };

    request.notification = await this.notifService.getNotificationTemplate(
      notificationGroup,
      request,
    );

    request.origin = request.origin + `.inject_point_fail`;
    await this.notificationClient.emit(
      process.env.KAFKA_NOTIFICATION_TOPIC,
      request,
    );

    return false;
  }

  //------------------------------------------- SERVICE -------------------------------------------------
  async point_inject(payload: any): Promise<GlobalTransactionResponse> {
    try {
      const start = new Date();
      const request = payload.incoming;
      const account = payload.account;
      const keyword = payload.keyword;
      const corePayload = payload.payload.inject_point;
      const token = payload.token;

      console.log('==== PROSES INJECT_POINT ====');
      console.log(corePayload);
      console.log('==== PROSES INJECT_POINT ====');

      // tracing_id change TRX to INJ
      const master_id = payload.tracing_master_id;
      let tracing_id = payload.tracing_id.split('_');
      tracing_id[0] = 'INJ';
      tracing_id = tracing_id.join('_');

      // Add field parent_master_id
      let parent_transaction_id = payload.tracing_master_id;
      if (payload?.incoming?.additional_param) {
        const parse_additional_param = payload.incoming.additional_param;

        if (parse_additional_param?.parent_transaction_id) {
          parent_transaction_id = parse_additional_param.parent_transaction_id;
        }
      }

      const reformatMsisdn = msisdnCombineFormatted(request.msisdn); // check_member_core
      try {
        const data: any = await this.customerService.check_member_core(
          reformatMsisdn,
          token,
          corePayload.reward_item_id,
        );

        corePayload.member_id = corePayload.member_id
          ? corePayload.member_id
          : data?.member_core_id;
        corePayload.__v = data?.__v > 0 ? data.__v : corePayload.__v;
      } catch (data_fail) {
        console.log('<-- fatal :: fail check member core -->');

        corePayload.member_id = corePayload.member_id
          ? corePayload.member_id
          : data_fail?.member_core_id;

        // Set Logging Failed
        this.logger_inject_point({
          payload: payload,
          step: `Step :: Check member to core`,
          message: 'Fail check member to core',
          stack: data_fail,
          is_success: false,
        });
      }

      if (keyword.eligibility.poin_value == 'Fixed Multiple') {
        corePayload.transaction_no = tracing_id;
      } else {
        corePayload.transaction_no = corePayload.transaction_no
          ? corePayload.transaction_no
          : tracing_id;
      }

      const origin = payload.origin.split('.');
      const req = request;
      req['tracing_id'] = tracing_id;
      req['master_id'] = master_id;
      req['total_point'] = corePayload.amount;
      req['remark'] = corePayload.remark;
      req['create_local_time'] = corePayload.create_local_time;
      req['parent_master_id'] = parent_transaction_id;

      if (origin[0] == 'redeem') {
        req['msisdn'] = request.msisdn;
        req['keyword'] = request.keyword;
        req['created_by'] = (account as any)._id;
      }

      console.log(`<== Tracing Log :: @${corePayload.transaction_no} ==>`);
      console.log('<--- Information :: Inject Point Service --->');
      console.log('url_core : ', `${this.url}/earn/inject`);
      console.log('token : ', token);
      console.log('<--- Information :: Inject Point Service --->');

      if (corePayload.amount == 0) {
        console.log('=== REQ INSERT TO COLLECTION WITH AMOUNT 0 ===');
        console.log(req);
        console.log('=== REQ INSERT TO COLLECTION WITH AMOUNT 0 ===');
        const newData = new this.injectPointModel(req);

        const response = new GlobalTransactionResponse();
        return await newData
          .save()
          .catch(async (e: BadRequestException) => {
            // Set Logging Failed
            this.logger_inject_point({
              payload: payload,
              step: `Step :: Process Inject Point with amount = 0`,
              message: 'Insert to collection inject_point is failed',
              stack: e?.stack,
              is_success: false,
            });

            this.notification_inject_point(e.message, payload);
            throw new BadRequestException(e.message); //Error untuk mongoose
          })
          .then(() => {
            response.code = HttpStatusTransaction.CODE_SUCCESS;
            response.message = 'Success';
            response.transaction_classify = 'INJECT_POINT';
            response.payload = {
              trace_id: true,
            };

            // Set Logging Failed
            this.logger_inject_point({
              payload: payload,
              step: `Step :: Process Inject Point with amount = 0`,
              message: 'Insert to collection inject_point is success',
            });

            return response;
          });
      } else {
        console.log('<--- Payload to Core :: Inject Point Service --->');
        console.log(corePayload);
        console.log('<--- Payload to Core :: Inject Point Service --->');

        return await lastValueFrom(
          this.httpService
            .post(`${this.url}/earn/inject`, corePayload, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: token,
              },
            })
            .pipe(
              map(async (res) => {
                Logger.log(res.status);
                const data = res.data;
                req['responseBody'] = data;
                console.log('=== REQ INSERT TO COLLECTION ===');
                console.log(req);
                console.log('=== REQ INSERT TO COLLECTION ===');
                const newData = new this.injectPointModel(req);

                const response = new GlobalTransactionResponse();
                return await newData
                  .save()
                  .catch(async (e: BadRequestException) => {
                    // Set Logging Failed
                    this.logger_inject_point({
                      payload: payload,
                      step: `Step :: Process Inject Point`,
                      message:
                        'Process inject point to core is success & insert to collection inject_point is failed',
                      stack: e?.stack,
                      is_success: false,
                    });

                    this.notification_inject_point(e.message, payload);
                    throw new BadRequestException(e.message); //Error untuk mongoose
                  })
                  .then(async () => {
                    response.code = HttpStatusTransaction.CODE_SUCCESS;
                    response.message = 'Success';
                    response.transaction_classify = 'INJECT_POINT';
                    response.payload = {
                      trace_id: true,
                    };

                    // Set Logging Success
                    this.logger_inject_point({
                      payload: payload,
                      step: `Step :: Process Inject Point`,
                      message:
                        'Process inject point to core & insert to collection inject_point is success',
                      stack: data,
                    });

                    return response;
                  });
              }),
              catchError(async (e: any) => {
                const response = new GlobalTransactionResponse();
                const rsp = e?.response;

                console.log(
                  '<--- Response from Core :: fail :: Inject Point Service --->',
                );
                console.log('Status Code : ', rsp.status);
                console.log('Status Text : ', rsp.statusText);
                console.log('Data : ', rsp.data);
                console.log(
                  '<--- Response from Core :: fail :: Inject Point Service --->',
                );

                response.code =
                  rsp.status == 404
                    ? HttpStatusTransaction.ERR_NOT_FOUND
                    : rsp.status == 500
                    ? HttpStatusTransaction.CODE_INTERNAL_ERROR
                    : rsp.data.code;
                response.message =
                  rsp.status == 404 || rsp.status == 500
                    ? rsp.statusText
                    : rsp.data.message;
                response.transaction_classify = 'INJECT_POINT';
                response.payload = {
                  trace_id: false,
                };

                // Set Logging Failed
                this.logger_inject_point({
                  payload: payload,
                  step: `Step :: Process inject point`,
                  message:
                    'Process inject point to core & insert to collection inject_point is failed',
                  stack: rsp,
                  is_success: false,
                });

                return response;
              }),
            ),
        );
      }
    } catch (e) {
      console.log('ERROR/CACTH', e);
    }
  }

  async customer_point_balance(
    msisdn: string,
    query: ViewPointQueryDTO,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;
    // const moment = require('moment-timezone');

    // get lovs by point type for filter query bucket_type
    const lovDataBucketType = await this.lovService.getLovPrime({
      first: 0,
      rows: 5,
      sortField: 'created_at',
      sortOrder: 1,
      filters: {
        set_value: {
          value: query.bucket_type ? query.bucket_type : 'TelkomselPOIN',
          matchMode: 'contains',
        },
      },
    });

    const rwditmId =
      lovDataBucketType.payload.data[0]?.additional.split('|')[1];

    // query limit default 5
    query.limit =
      query.limit || query.limit === 0
        ? query.limit == 0
          ? 9999
          : query.limit
        : 5;

    const reformatMsisdn = msisdnCombineFormatted(msisdn); // check_member_core
    if (reformatMsisdn) {
      return await _this.customerService
        .getCoreMemberByMsisdn(reformatMsisdn, token)
        .then(async (customerDetail) => {
          const core_id = customerDetail[0]['id'];
          console.log('< -- customer -- >');
          console.log(customerDetail);
          console.log('< -- customer -- >');

          console.log('< -- customer tier -- >');
          console.log(customerDetail[0]['tier']['current']['name']);
          console.log('< -- customer tier -- >');
          if (customerDetail) {
            return await new Promise(async (resolve, reject) => {
              const config: AxiosRequestConfig = {
                params: {
                  merchant_id: _this.merchant,
                },
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: token,
                },
              };

              return await lastValueFrom(
                this.httpService
                  .get(`${this.url}/members/${core_id}/wallet`, config)
                  .pipe(
                    map((response) => {
                      const resp = response.data;
                      const resPayload = resp['payload'].wallet;

                      const listOfPoint = [];
                      const rwditm = resPayload.pocket.reward[rwditmId]
                        ? resPayload.pocket.reward[rwditmId]
                        : {};
                      const amount = findProp(rwditm, 'amount', []);
                      const expireDate = findProp(rwditm, 'expire_time', []);

                      const skip = query.skip
                        ? parseInt(String(query.skip))
                        : 0;
                      let length = amount.length;
                      if (query.limit && query.limit < amount.length) {
                        length = parseInt(String(query.limit)) + skip;
                      }

                      for (let i = skip; i < length; i++) {
                        const dateString = expireDate[i];
                        const date = moment.utc(dateString);
                        const wibTime = moment.tz(date, 'Asia/Jakarta');
                        listOfPoint.push({
                          total_point: amount[i],
                          expired_date: expireDate[i]
                            ? wibTime.format('YYYY-MM-DD')
                            : expireDate[i],
                        });
                      }

                      const pageSize = Math.ceil(amount.length / query.limit);
                      const pageNum = Math.floor(query.skip / query.limit + 1);
                      const payload = {
                        total_record: amount.length,
                        page_size: pageSize ? pageSize : 1,
                        page_number: pageNum ? pageNum : 1,
                        list_of_point: listOfPoint,
                        msisdn: msisdn.replace(/^0/, '62'),
                        // tier: customerDetail[0]['tier']
                        //   ? customerDetail[0]['tier']['current']['name']
                        //   : 'New',
                        tier:
                          customerDetail[0]['tier'] ??
                          (await this.applicationService.getConfig(
                            'DEFAULT_CUSTOMER_TIER',
                          )),
                        bucket_type: query.bucket_type
                          ? query.bucket_type
                          : 'TelkomselPOIN',
                        bucket_id: 50000,
                        member_core_id: core_id,
                        __v: resPayload.__v,
                      };

                      if (resp['code'] === 'S00000') {
                        responseGlobal.code = resp['code'];
                        responseGlobal.message =
                          HttpMsgTransaction.DESC_CODE_SUCCESS;
                        // responseGlobal.transaction_classify =
                        //   'GET_POINT_BALANCE';
                        responseGlobal.payload = payload;
                      } else {
                        responseGlobal.code = resp['code'];
                        responseGlobal.message = resp['message'];
                        // responseGlobal.transaction_classify =
                        //   'GET_POINT_BALANCE';
                        responseGlobal.payload = payload;
                      }
                      resolve(responseGlobal);
                    }),
                    catchError(async (e) => {
                      // throw new BadRequestException(e.message);
                      console.log('<-- fail : get customer -->');
                      console.log(e);
                      console.log('<-- fail : get customer -->');

                      responseGlobal.code =
                        HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                      responseGlobal.message = e.message;
                      // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
                      responseGlobal.payload = {
                        trace_id: false,
                      };

                      resolve(responseGlobal);
                    }),
                  ),
              );
            });
          } else {
            responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            responseGlobal.message = 'member not found';
            // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
            responseGlobal.payload = {
              trace_id: false,
            };
            return responseGlobal;
          }
        });
    } else {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'msisdn wrong format';
      // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }
  }

  async notification_inject_point(message: any, payload: any, fail = true) {
    if (fail) {
      // payload set origin success
      const origin = payload.origin + '.' + 'inject_point_fail';
      payload.origin = origin;
      payload.error_message = message;
      payload.notification = await this.notifService.getNotificationTemplate(
        NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER,
        payload,
      );
    } else {
      // === EXPIRED DATE ===
      let expiredDate = null;
      try {
        const rewardId = payload.payload?.inject_point?.reward_item_id;
        const walletObject =
          payload.incoming?.responseBody?.payload?.wallet?.pocket?.reward?.[
            rewardId
          ] ?? {};

        expiredDate = findProp(walletObject, 'expire_time', []);
        if (expiredDate.length) {
          expiredDate = expiredDate[0];
          expiredDate = moment(expiredDate).format('DD-MM-YYYY');
        }
      } catch (err) {
        console.error('Unable to get expired date!');
      }

      payload.payload.inject_point['expired_date'] = expiredDate;

      // === END EXPIRED DATE ===

      // payload set origin success
      const origin = payload.origin + '.' + 'inject_point_success';
      payload.origin = origin;
      payload.notification = await this.notifService.getNotificationTemplate(
        NotificationTemplateConfig.REDEEM_SUCCESS_CUSTOMER,
        payload,
      );
    }

    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
  }

  async retry_inject_point(message: any, payload: any) {
    if (payload?.retry?.inject_point) {
      const origin_fail = payload.origin + '.' + 'inject_point_fail';
      payload.origin = origin_fail;

      // get config default from config
      let point_stopper = await this.applicationService.getConfig(
        'DEFAULT_CONS_RETRY_INJECT_POINT',
      );
      point_stopper = point_stopper ? point_stopper : 3;

      // if counter inject_point is more than stopper counter from config
      if (payload.retry.inject_point.counter >= point_stopper) {
        // send notification cause counter is more than limit
        this.notification_inject_point(
          'Stopped retrying, the counter is exceeds the limit',
          payload,
        );
      } else {
        // send to consumer inject_point if condition config counter inject_point is not fulfilled
        payload.retry.inject_point.counter += 1; //default counter = 0, counter = counter + 1;
        payload.retry.inject_point.errors = [
          ...payload.retry.inject_point.errors,
          message,
        ]; // Joining error messege
        this.injectPointClient.emit(
          process.env.KAFKA_INJECT_POINT_TOPIC,
          payload,
        );
      }
    }
  }

  async loggerInjectPoint(
    payload: any,
    message: any,
    start: any,
    e: any,
    isError: any,
    isSuccess: any = false,
  ) {
    try {
      const end = new Date();
      const takenTime = Math.abs(start.getTime() - end.getTime());
      await this.exceptionHandler.handle({
        statusCode: isError
          ? HttpStatus.INTERNAL_SERVER_ERROR
          : isSuccess
          ? HttpStatus.OK
          : HttpStatus.BAD_REQUEST,
        level: isError ? 'error' : isSuccess ? 'verbose' : 'warn',
        notif_operation: false,
        notif_customer: false,
        transaction_id: payload.tracing_id,
        config: this.configService,
        taken_time: takenTime,
        payload: {
          transaction_id: payload.tracing_id,
          statusCode: isError
            ? HttpStatus.INTERNAL_SERVER_ERROR
            : isSuccess
            ? HttpStatus.OK
            : HttpStatus.BAD_REQUEST,
          taken_time: takenTime,
          method: 'kafka',
          url: 'inject_point',
          service: 'INJECT_POINT',
          step: message,
          param: payload,
          result: {
            msisdn: payload.incoming.msisdn,
            message: e,
            trace: payload.tracing_id,
            user_id: new IAccount(payload.account),
            data: e,
          },
        } satisfies LoggingData,
      });
    } catch (error) {
      console.log('Error : ', error?.message);
      throw e;
    }
  }

  // NEW
  async fixed_multiple_inject_point_process(
    payload: any,
    response_core: any = null,
    point_loop = 1,
  ) {
    // set variable
    const request = payload.incoming;
    const eligibility = payload.keyword.eligibility;
    const account = payload.account;
    const corePayload = payload.payload.inject_point;
    const token = payload.token;
    const transaction_id = payload?.tracing_master_id;
    let transaction_id_custom = payload?.tracing_master_id;

    //replace TRX to INJ
    const tracing_id_custom = transaction_id_custom.split('_');
    tracing_id_custom[0] = 'INJ';
    transaction_id_custom = tracing_id_custom.join('_');

    // set expected point for max loop recursive, default = 1
    let expected_point = 1;
    // if param total_point not exist
    if (request.hasOwnProperty('total_point')) {
      if (request.total_point > 0) {
        expected_point = request.total_point;
      }
    }

    // condition max loop
    if (point_loop <= expected_point) {
      // set transaction_no with added number loop
      corePayload.transaction_no = transaction_id_custom;
      corePayload.transaction_no = `${corePayload?.transaction_no}_${point_loop}`;
      corePayload.__v =
        point_loop > 1 ? response_core?.data?.wallet?.__v : corePayload.__v;
      corePayload.amount = eligibility.poin_redeemed;

      // set to payload
      payload.payload.inject_point = corePayload;
      payload.tracing_id = corePayload.transaction_no;

      // set counter
      payload.rule.fixed_multiple.counter = point_loop;

      // set transactions
      payload.rule.fixed_multiple.transactions = [
        ...payload.rule.fixed_multiple.transactions,
        corePayload.transaction_no,
      ];

      // try exception if condition error
      try {
        console.log(
          `<--- fixed_multiple_inject_point_process :: in progress :: ${transaction_id} :: on loop #${point_loop} :: start --->`,
        );
        // trigger to api core inject_point
        const inject_point = await this.push_to_core_inject_point(
          corePayload,
          token,
          payload,
        );

        // set message
        payload.rule.fixed_multiple.message = [
          ...payload.rule.fixed_multiple.message,
          inject_point.message,
        ];

        // set status
        payload.rule.fixed_multiple.status = [
          ...payload.rule.fixed_multiple.status,
          inject_point.status,
        ];

        //please
        payload.tracing_id = `${transaction_id_custom}_${payload.rule.fixed_multiple.status.length}`;
        payload.payload.inject_point.transaction_no = payload.tracing_id;

        if (inject_point.status) {
          // set counter success
          payload.rule.fixed_multiple.counter_success = point_loop;

          // prepare payload for collection transaction_inject_point
          const request_custom = { ...payload.incoming };
          request_custom['tracing_id'] = payload?.tracing_id;
          request_custom['master_id'] = transaction_id;
          request_custom['remark'] = corePayload.remark;
          request_custom['msisdn'] = request.msisdn;
          request_custom['total_point'] = corePayload.amount;
          request_custom['keyword'] = request.keyword;
          request_custom['created_by'] = (account as any)._id;
          request_custom['responseBody'] = inject_point.data;

          //save to collection transaction_inject_point
          await this.save_to_local_collection(request_custom, payload);
        } else {
          // set counter fail
          payload.rule.fixed_multiple.counter_fail = point_loop;

          // loggin when inject_point core is fail
          //set here ...

          // set version
          inject_point.status = false;
          inject_point.message = 'failed';
          inject_point.data = {
            ...inject_point.data,
            wallet: {
              __v: corePayload.__v,
            },
          };
        }

        console.log(payload.rule.fixed_multiple);
        console.log(
          `<--- fixed_multiple_inject_point_process :: in progress :: ${transaction_id} :: on loop #${point_loop} :: end --->`,
        );

        // trigger recursive function
        await this.fixed_multiple_inject_point_process(
          payload,
          inject_point,
          point_loop + 1,
        );
        return inject_point;
      } catch (error) {
        // catch information data from api core inject_point
        console.log(
          `<--- fixed_multiple_inject_point_process :: fail :: ${transaction_id} :: on loop #${point_loop} --->`,
        );
        console.log(error);
        console.log(
          `<--- fixed_multiple_inject_point_process :: fail :: ${transaction_id} :: on loop #${point_loop} --->`,
        );

        // set message
        payload.rule.fixed_multiple.message = [
          ...payload.rule.fixed_multiple.message,
          'Failed',
        ];

        // set status
        payload.rule.fixed_multiple.status = [
          ...payload.rule.fixed_multiple.status,
          false,
        ];

        // logging when params not eligible
        // set here.....

        const response: ResponseInjectPoint = {
          status: false,
          statusCode: 'E00000',
          message: 'Failed',
          data: {
            wallet: {
              __v: corePayload.__v,
            },
          },
        };

        // trigger recursive function
        await this.fixed_multiple_inject_point_process(
          payload,
          response,
          point_loop + 1,
        );
        return error;
      }
    } else {
      // process recursive completed & show information about that
      console.log(
        `<--- fixed_multiple_inject_point_process :: completed :: ${transaction_id} :: on loop #${point_loop} :: start --->`,
      );
      console.log('expected looping :', expected_point);
      console.log('history : ', payload.rule.fixed_multiple);
      console.log(
        `<--- fixed_multiple_inject_point_process :: completed :: ${transaction_id} :: on loop #${point_loop} :: end --->`,
      );
      return;
    }
  }

  async push_to_core_inject_point(
    corePayload: any,
    token: string,
    payload_kafka: any,
  ): Promise<ResponseInjectPoint> {
    const response: ResponseInjectPoint = {
      status: false,
      message: 'Failed',
      statusCode: 'E00000',
      data: null,
    };

    const url = `${this.url}/earn/inject`;
    const options = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    };

    console.log(
      `<-- Tracing Log :: @${corePayload?.transaction_no} :: start -->`,
    );
    console.log('<--- Information :: InjectPoint Point Service --->');
    console.log('payload :', corePayload);
    console.log('url_core :', url);
    console.log('token : ', token);
    console.log('<--- Information :: InjectPoint Point Service --->');
    console.log(
      `<-- Tracing Log :: @${corePayload?.transaction_no} :: end -->`,
    );

    return await lastValueFrom(
      this.httpService.post(url, corePayload, options).pipe(
        map(async (res) => {
          const data = res.data;
          response.statusCode = data?.code ?? response.statusCode;
          response.status = data?.code == 'S00000' ? true : false;
          response.message = data?.message;
          response.data = data?.payload;

          console.log(
            '<--- Response from Core :: success :: push_to_core_inject_point --->',
          );
          console.log(response);
          console.log(
            '<--- Response from Core :: success :: push_to_core_inject_point --->',
          );

          // Set Logging Success
          this.logger_inject_point({
            payload: payload_kafka,
            step: `Step :: Process inject point to core`,
            message: response.message,
            stack: data,
          });

          return response;
        }),
        catchError(async (e) => {
          const rsp = e?.response;

          console.log(
            '<--- Response from Core :: fail :: push_to_core_inject_point --->',
          );
          console.log('Status Code : ', rsp?.status);
          console.log('Status Text : ', rsp?.statusText);
          console.log('Data : ', rsp?.data);
          console.log(
            '<--- Response from Core :: fail :: push_to_core_inject_point --->',
          );

          response.message = rsp?.statusText;
          response.data = rsp?.data;

          // Set Logging Failed
          this.logger_inject_point({
            payload: payload_kafka,
            step: `Step :: Process inject point to core`,
            message: e?.message,
            stack: response.data,
            is_success: false,
          });

          return response;
        }),
      ),
    );
  }

  async save_to_local_collection(
    payload: InjectPointDocument,
    payload_kafka: any,
  ) {
    const response: ResponseInjectPoint = {
      status: false,
      message: 'Failed',
      statusCode: 'E00000',
      data: null,
    };

    const newData = new this.injectPointModel(payload);
    return await newData
      .save()
      .catch((e: BadRequestException) => {
        response.message = e.message;

        // Set Logging Failed
        this.logger_inject_point({
          payload: payload_kafka,
          step: `Step :: Insert to collection`,
          message: e?.message,
          stack: e?.stack,
          is_success: false,
        });

        return response;
      })
      .then((data) => {
        response.statusCode = HttpStatusTransaction.CODE_SUCCESS;
        response.status = true;
        response.message = 'Success';
        response.data = data;

        // Set Logging Success
        this.logger_inject_point({
          payload: payload_kafka,
          step: `Step :: Insert to collection`,
          message: response?.message,
        });

        return response;
      });
  }

  async logger_inject_point(request: LoggingRequest) {
    // Set Request Validator Logging
    const result_default = {
      message: '-',
      stack: {},
    };

    result_default['message'] = request?.message;
    result_default['stack'] = request?.stack;

    request.payload = request?.payload ?? {};
    request.date_now = request?.date_now ?? Date.now();
    request.is_success = request?.is_success ?? true;
    request.step = request?.step ?? '';
    request.message = request?.message ?? '-';
    request.statusCode =
      request?.statusCode ?? request?.is_success
        ? HttpStatus.OK
        : HttpStatus.BAD_REQUEST;
    request.result = request?.result ? request?.result : result_default;
    request.status_trx = request.status_trx ?? '-';
    // Set Request Validator Logging

    const transaction_id = request.payload?.tracing_master_id;
    const account = request.payload?.account;
    const statusCode = request.statusCode;
    const url = request.payload?.endpoint;
    const msisdn = request.payload?.incoming?.msisdn;
    const param = {
      status_trx: request.status_trx,
      origin: request.payload.origin,
      incoming: request.payload?.incoming,
      token: request.payload?.token,
      endpoint: request.payload?.endpoint,
      keyword: {
        eligibility: {
          name: request.payload?.keyword?.eligibility?.name,
          poin_value: request.payload?.keyword?.eligibility?.poin_value,
          poin_redeemed: request.payload?.keyword?.eligibility?.poin_redeemed,
        },
      },
      program: {
        name: request.payload?.program?.name,
      },
      account: account,
      notification: request.payload?.notification,
    };

    const logData: any = {
      method: 'kafka',
      statusCode: statusCode,
      transaction_id: transaction_id,
      notif_customer: false,
      notif_operation: false,
      taken_time: Date.now() - request.date_now,
      step: request.step,
      param: param,
      service: 'INJECT_POINT',
      result: {
        msisdn: msisdn,
        url: url,
        result: request.result,
      },
    };

    if (request.is_success) {
      this.logger.verbose(logData);
    } else {
      this.logger.error(logData);
    }
  }
}
