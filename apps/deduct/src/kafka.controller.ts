import { Controller, Inject } from '@nestjs/common';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { LoggingResult } from '@utils/logger/transport';

import { ApplicationService } from '@/application/services/application.service';
import { getMsisdnOnly } from '@/application/utils/Msisdn/formatter';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { PointDeductService } from '@/transaction/services/point/point.deduct.service';

import { KafkaService } from './kafka.service';
const moment = require('moment-timezone');
@Controller()
export class KafkaController {
  constructor(
    private readonly kafkaService: KafkaService,

    @Inject('DEDUCT_SERVICE_PRODUCER')
    private readonly clientDeduct: ClientKafka,

    @Inject('REPORTING_POINT_EVENT_PRODUCER')
    private readonly clientReportingBI: ClientKafka,

    private appliactionService: ApplicationService,

    @Inject(PointDeductService)
    private pointDeductService: PointDeductService,

    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,

    private transactionConfig: TransactionOptionalService,
  ) {}

  @MessagePattern(process.env.KAFKA_DEDUCT_TOPIC)
  async validation(@Payload() payload: any) {
    try {
      // add new field create_local_time
      payload.payload.deduct.create_local_time =
        this.transactionConfig.convertUTCtoGMT7LocalFormat(
          payload.submit_time ?? '',
        );
    } catch (error) {
      console.error('[DEDUCT] Failed create_local_time ', error?.message);
    }

    if (payload.origin == 'deduct_gateway') {
      await this.buildMsgTopicFromGateway(payload);
    } else {
      if (payload?.payload?.tsel_id?.member_balance_tobe_deduct) {
        await this.deductTselId(payload);
      } else {
        await this.deductOriginal(payload);
      }
    }
  }

  async deductTselId(payload: any) {
    const origin = payload.origin.split('.');
    let data: any = [];
    const deductFailCheck = origin[origin.length - 1] == 'deduct_fail' || origin[0] == 'deduct';
    if (deductFailCheck) {
      data = payload?.payload?.tsel_id?.deduct_fail;
    } else {
      data = payload?.payload?.tsel_id?.member_balance_tobe_deduct;
    }
    const deduct_fail = [];
    const deduct_success = payload?.payload?.tsel_id?.deduct_success ?? [];
    // set logging result
    const logMessage: LoggingResult = {
      step: 'PROCCESS DEDUCT TO CORE',
      data: '',
      message: '-',
    };
    if (data) {
      await Promise.all(
        data.map(async (val, index) => {
          const deductOriginal = payload.payload?.tsel_id?.deduct_original;
          const deductPayload = payload.payload.deduct;
          deductPayload.amount = val?.point_deduct;
          deductPayload.__v = deductFailCheck ? val?.__v + 1 : val?.__v;
          deductPayload.member_id = val?.member_id;
          payload.tracing_id = `${deductOriginal?.transaction_no}_${index}`;
          await this.kafkaService
            .point_deduct(payload)
            .then((res) => {
              logMessage.data = res;
              if (res.code === 'S00000') {
                val.transaction_no = `${deductOriginal?.transaction_no}_${index}`;
                deduct_success.push(val);
              } else if (res.code === 'E02001') {
                logMessage.message = 'Deduct Fail & Retry Deduct with error code E02001';
                deduct_fail.push(val);
                return false;
              } else {
                // retry emit to consumer deduct until limit config
                console.log('error Forbidden from core');
                logMessage.message = 'Deduct Fail & Retry Deduct';
                logMessage.statusCode = res.message == 'Forbidden' ? 403 : 400;
                deduct_fail.push(val);
              }
            })
            .catch((e) => {
              console.log('catch error deduct FMC to core', e);
              // retry emit to consumer deduct until limit config
              deduct_fail.push(val);
            });
        }),
      )
        .then((res) => {
          console.log('reward process');
          payload.payload.tsel_id.deduct_success = deduct_success;
          const deductOriginal = payload.payload?.tsel_id?.deduct_original;
          payload.tracing_id = deductOriginal.transaction_no;
          if (deduct_fail.length > 0) {
            payload.payload.tsel_id.deduct_fail = deduct_fail;
            this.kafkaService.retry_deduct_fmc(logMessage, payload);
          } else if (!res) {
            // send notification
            logMessage.message = 'Deduct fail, got response E02001 from core';
            this.kafkaService.notification_deduct(logMessage, payload);
          } else {
            const poinBalance =
              payload?.incoming?.responseBody?.payload?.wallet?.pocket?.reward
                ?.total ?? 0;
            const deductPoin = payload?.payload?.deduct?.amount ?? 0;
            const trx_date = moment(payload.submit_time).format('YYYY-MM-DD');
            const trx_datetime = moment(payload).format(
              'YYYY-MM-DD HH:mm:ss.SSS',
            );
            // emit to point event to BI
            this.clientReportingBI.emit('reporting-point-event-to-bi', {
              origin: 'reporting.deduct',
              tracing_id: deductOriginal.transaction_no,
              tracing_master_id: payload.tracing_master_id,
              payload: {
                trx_date: trx_date,
                msisdn: getMsisdnOnly(payload.incoming.msisdn),
                trx_datetime: trx_datetime,
                poin: deductPoin,
                pointype:
                  payload.payload.reporting_point_event_bi.point_type ?? '',
                reedem_channel: payload.payload.deduct.channel ?? '',
                merchant_name:
                  payload.payload.reporting_point_event_bi.merchant_name ?? '',
                customer_tier:
                  payload.customer.loyalty_tier &&
                  payload.customer.loyalty_tier.length > 0
                    ? payload.customer.loyalty_tier[0].name
                    : '',
                poin_balance: poinBalance + deductPoin,
                trx_id: payload.tracing_master_id,
              },
            });
            // send to outbound or inbound
            this.kafkaService.integration_deduct_fmc(payload, deductOriginal);
          }
        })
        .catch((e) => {
          console.log('catch error generate bonus & reporting to bi', e);
        });
    }
  }

  async deductOriginal(payload: any) {
    try {
      const startTime = new Date();

      const keyword = payload.keyword;
      const eligibility = payload.keyword.eligibility;
      const origin = payload.origin.split('.');

      // poin_changed is created under conditions whether using points from poin_redeemed in keyword.eligibility or poin from flash sale
      let poin_changed = eligibility.poin_redeemed;

      // If flashsale is true
      if (payload?.is_flashsale) {
        poin_changed = eligibility?.flashsale?.poin;
      } 
      
      // set poin_changed to main payload
      payload.poin_changed = poin_changed;

      // Check point balance
      const check_point_balance =
        await this.kafkaService.checking_point_balance(payload);
      if (check_point_balance[0]) {
        const payload = check_point_balance[2];

        if (
          origin[origin.length - 1] == 'deduct_fail' ||
          origin[0] == 'deduct'
        ) {
          await this.deduct(payload);
          return false;
        } else {
          const bonus_external = keyword.bonus.filter(
            (e) =>
              e.bonus_type == 'telco_prepaid' ||
              e.bonus_type == 'telco_postpaid' ||
              e.bonus_type == 'ngrs' ||
              e.bonus_type == 'linkaja' ||
              e.bonus_type == 'linkaja_main' ||
              e.bonus_type == 'linkaja_bonus',
          );
          if (
            eligibility.poin_value === 'Fixed Multiple' &&
            bonus_external.length > 0
          ) {
            this.kafkaService.notification_deduct(
              'Fail because fixed multiple and bonus external is exists ',
              payload,
            );
          } else {
            if (eligibility.poin_value === 'Fixed' || eligibility.poin_value == 'Fixed Multiple') {
              payload.payload.deduct.amount = poin_changed;
              this.deduct(payload);
            } else if (eligibility.poin_value === 'Flexible') {
              if (payload.payload.deduct.amount == -1) {
                payload.payload.deduct.amount = poin_changed;
              }

              if (payload.is_coupon_bulk_approval) {
                payload.payload.deduct.amount =
                  payload.payload.deduct.amount * poin_changed;
              }

              this.deduct(payload);
            
            /** Take out : 2024-07-01 **/
            // } else if (eligibility.poin_value === 'Fixed Multiple') {
            //   // If more than 10 points are given a limit and set to 10
            //   if (payload?.incoming?.hasOwnProperty('total_redeem')) {
            //     const checkTotalPoint = payload?.incoming?.total_redeem;
            //     let limit_fixed_multiple = 10;

            //     try {
            //       const limit_fixed_multiple_config =
            //         await this.appliactionService.getConfig(
            //           'DEFAULT_CONS_LIMIT_FIXED_MULTIPLE_DEDUCT_POINT',
            //         );

            //       limit_fixed_multiple =
            //         limit_fixed_multiple_config ?? limit_fixed_multiple;
            //     } catch (error) {
            //       this.kafkaService.logger_deduct({
            //         payload: payload,
            //         step: 'Step :: Get config limit fixed multiple',
            //         message: `[FAILED] get config limit fixed multiple from systemconfig`,
            //         stack: {
            //           message: `[FAILED] cannot get limit fixed multiple from systemconfig`,
            //           data: payload?.incoming,
            //         },
            //         is_success: false,
            //       });
            //     }

            //     if (
            //       limit_fixed_multiple != 0 &&
            //       checkTotalPoint > limit_fixed_multiple
            //     ) {
            //       this.kafkaService.logger_deduct({
            //         payload: payload,
            //         step: 'Step :: Process limitation Fixed Multiple',
            //         message: `[FIXED-MULTIPLE] Total redeem more than ${limit_fixed_multiple}`,
            //         stack: {
            //           message: `Total redeem request : ${checkTotalPoint} --> Set to be ${limit_fixed_multiple}`,
            //           data: payload?.incoming,
            //         },
            //         is_success: false,
            //       });

            //       payload.incoming.total_redeem = limit_fixed_multiple;
            //     }
            //   }

            //   await this.kafkaService.fixed_multiple_deduct_process(payload);
            /** Take out : 2024-07-01 **/

            }else {
              this.kafkaService.notification_deduct(
                'Fail, point value is unknown ',
                payload,
              );
            }
          }
        }
      }

      const endTime = new Date();
      console.log(
        `NFT_KafkaController.deduct_validation = ${
          endTime.getTime() - startTime.getTime()
        } ms`,
      );
      return;
    } catch (error) {
      console.log('<--- issue :: prepare deduct -->');
      console.log(error.stack);
      const logMessage: LoggingResult = {
        step: 'PREPARE PAYLOAD DEDUCT',
        data: {
          message: error?.message,
          stack: error?.stack,
        },
        message: 'prepare deduct payload fail',
      };
      this.kafkaService.notification_deduct(logMessage, payload);
      console.log('<--- issue :: prepare deduct -->');
      return;
    }
  }

  async deduct(payload: any) {
    
    /** Take out : 2024-07-01 **/
    // if (payload.keyword.eligibility.poin_value === 'Fixed Multiple') {
    //   console.log('=== FIXED MULTIPLE ===');
    //   console.log(
    //     'Deduct counter masuk = ',
    //     payload.rule.fixed_multiple.counter,
    //   );
    //   console.log('=== FIXED MULTIPLE ===');
    // }
    /** Take out : 2024-07-01 **/

    const origin = payload.origin.split('.');
    const eligibility = payload.keyword.eligibility;
    console.log('=== DEDUCT PROCCESS ==');
    return await this.kafkaService
      .point_deduct(payload)
      .then((e) => {
        // set logging result
        const logMessage: LoggingResult = {
          step: 'PROCCESS DEDUCT TO CORE',
          data: e,
          message: '-',
        };
        console.log('e.code');
        console.log(e.code);

        if (e.code == 'S00000') {
          console.log('Success : ', e.code);
          if (origin[0] == 'deduct') {
            logMessage.message = e?.message;
            logMessage.data = e?.payload;
            logMessage.statusCode = 200;
            this.kafkaService.notification_deduct(logMessage, payload, false);
            return false;
          } else {
            const poinBalance =
              payload?.incoming?.responseBody?.payload?.wallet?.pocket?.reward
                ?.total ?? 0;
            const deductPoin = payload?.payload?.deduct?.amount ?? 0;
            const trx_date = moment(payload.submit_time).format('YYYY-MM-DD');
            const trx_datetime = moment(payload).format(
              'YYYY-MM-DD HH:mm:ss.SSS',
            );

            // emit to point event to BI
            this.clientReportingBI.emit('reporting-point-event-to-bi', {
              origin: 'reporting.deduct',
              tracing_id: payload.tracing_id,
              tracing_master_id: payload.tracing_master_id,
              payload: {
                trx_date: trx_date,
                msisdn: getMsisdnOnly(payload.incoming.msisdn),
                trx_datetime: trx_datetime,
                poin: deductPoin,
                pointype:
                  payload.payload.reporting_point_event_bi.point_type ?? '',
                reedem_channel: payload.payload.deduct.channel ?? '',
                merchant_name:
                  payload.payload.reporting_point_event_bi.merchant_name ?? '',
                customer_tier:
                  payload.customer.loyalty_tier &&
                  payload.customer.loyalty_tier.length > 0
                    ? payload.customer.loyalty_tier[0].name
                    : '',
                poin_balance: poinBalance + deductPoin,
                trx_id: payload.tracing_master_id,
              },
            });

            // send to outbound or inbound
            this.kafkaService.integration_deduct(payload, e);
          }
          return false;
        } else {
          if (e.code == 'E02001') {
            // send notification
            logMessage.message = 'Deduct fail';
            this.kafkaService.notification_deduct(logMessage, payload);
            return false;
          } else {
            // retry emit to consumer deduct until limit config
            logMessage.message = 'Deduct Fail & Retry Deduct';
            logMessage.statusCode = e.message == 'Forbidden' ? 403 : 400;
            this.kafkaService.retry_deduct(logMessage, payload);
            return false;
          }
        }
      })
      .catch((e) => {
        console.log('gagal ', e);
        // retry emit to consumer deduct until limit config
        this.kafkaService.retry_deduct(e.message, payload);
        return false;
      });
  }

  async buildMsgTopicFromGateway(payload: any) {
    try {
      let origin = 'deduct';
      const { incoming, account, token, endpoint, tracing_id } = payload;
      const data = incoming;
      // total_point is not found
      data.total_point = data.total_point ? data.total_point : 0;
      return await this.pointDeductService
        .prepareDeductPoint({
          request: data,
          account,
          token,
          endpoint,
          trace_id: tracing_id,
        })
        .then(async (response) => {
          if (response.code === 'S00000') {
            const logMessage: LoggingResult = {
              step: 'PROCESS DEDUCT',
              message: '-',
            };

            try {
              const process_deduct =
                await this.pointDeductService.proccess_point_deduct_to_core(
                  response.payload['payload'],
                );
              logMessage.data = process_deduct.payload;
              if (process_deduct.code == 'S00000') {
                origin = `${origin}.deduct_success`;
                // set log
                logMessage.message = 'Deduct Success';
                // send notification success
                this.pointDeductService.notification_deduct(
                  logMessage,
                  response?.payload['payload'],
                  false,
                );
              } else {
                origin = `${origin}.deduct_fail`;
                // send notification fail
                logMessage.message = 'Deduct Fail';
                this.pointDeductService.notification_deduct(
                  logMessage,
                  response?.payload['payload'],
                );
              }

              // set origin
              response.payload['payload'].origin = origin;

              // save to transaction master
              this.transactionMasterClient.emit(
                process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
                response.payload['payload'],
              );

              return process_deduct;
            } catch (error) {
              console.log('<--- FAIL :: DEDUCT :: TO CORE --->');
              console.log(error);
              console.log('<--- FAIL :: DEDUCT :: TO CORE --->');

              // unknown error
              response.code = HttpStatusTransaction.UNKNOWN_ERROR;
              response.message = '-';

              logMessage.message = 'FAIL :: DEDUCT :: TO CORE';
              logMessage.data = error;

              // send notification fail
              this.pointDeductService.notification_deduct(
                logMessage,
                response?.payload['payload'],
              );
            }
          }

          delete response.payload['customer'];
          return response;
        })
        .catch((e) => {
          console.log('<-- catch :: fail :: prepare payload deduct -->');
          console.log(e);
          console.log('<-- catch :: fail :: prepare payload deduct -->');
        });
    } catch (error) {
      return true;
    }
  }
}
