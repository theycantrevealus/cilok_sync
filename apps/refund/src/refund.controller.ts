import { Controller, Get, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka, MessagePattern } from '@nestjs/microservices';

import { getMsisdnOnly } from '@/application/utils/Msisdn/formatter';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';

import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import { IAccount } from '../../utils/logger/transport';
import { RefundService } from './refund.service';

@Controller()
export class RefundController {
  constructor(
    private readonly refundService: RefundService,

    @Inject('REPORTING_POINT_EVENT_PRODUCER')
    private readonly clientReportingBI: ClientKafka,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    private transactionConfig: TransactionOptionalService,
  ) {}

  @Get()
  getHello(): string {
    return this.refundService.getHello();
  }

  @MessagePattern('refund')
  refund(payload: any): any {
    const startTime = new Date();
    const moment = require('moment-timezone');
    const now = moment();
    console.log(
      'Start PointRefundKAFKA - ' + now.format("YYYY-MM-DD HH:mm:ss'SSS"),
    );

    try {
      // add new field create_local_time
      const transaction_date = new Date().toISOString();
      payload.payload.refund.create_local_time =
        this.transactionConfig.convertUTCtoGMT7LocalFormat(transaction_date);
    } catch (error) {
      console.error('[REFUND] Failed create_local_time ', error?.message);
    }

    return this.refundService
      .point_refund(payload)
      .then((e) => {
        if (e.code == 'S00000') {
          console.log('Success : ', e.code);
          this.refundService.notification_refund(
            'Success refund point',
            payload,
            false,
          );

          try {
            // emit to point event to BI
            const poinBalance =
              payload?.incoming?.responseBody?.payload?.wallet?.pocket?.reward
                ?.total ?? 0;
            let refundPoint = payload?.payload?.deduct?.amount ?? 0;
            const trx_date = moment(payload.submit_time).format('YYYY-MM-DD');
            const trx_datetime = moment(payload).format(
              'YYYY-MM-DD HH:mm:ss.SSS',
            );

            refundPoint = Math.abs(refundPoint);

            this.clientReportingBI.emit('reporting-point-event-to-bi', {
              origin: 'reporting.refund',
              tracing_id: payload?.tracing_id,
              tracing_master_id: payload?.tracing_master_id,
              payload: {
                trx_date: trx_date,
                msisdn: getMsisdnOnly(payload?.incoming?.msisdn),
                trx_datetime: trx_datetime,
                poin: refundPoint,
                pointype:
                  payload?.payload?.reporting_point_event_bi?.point_type ?? '',
                reedem_channel: payload?.payload?.deduct?.channel ?? '',
                merchant_name:
                  payload?.payload?.reporting_point_event_bi?.merchant_name ??
                  '',
                customer_tier:
                  payload?.customer?.loyalty_tier &&
                  payload?.customer?.loyalty_tier.length > 0
                    ? payload.customer?.loyalty_tier[0].name
                    : '',
                poin_balance: poinBalance + refundPoint,
                trx_id: payload?.tracing_master_id,
              },
            });
          } catch (e) {
            console.error(
              '[REFUND] Emit failed for reporting-point-event-to-bi: ',
              e,
            );
          }

          console.log('NFT PointHPointRefundKAFKA - ' + moment().diff(now));
          return false;
        } else {
          if (e.code == 'E02001') {
            // send notification
            console.log('gagal : ', e.code);
            const start = moment();
            console.log(
              'Start PointRefundKAFKA_EMITNOTIF - ' +
                start.format("YYYY-MM-DD HH:mm:ss'SSS"),
            );

            this.refundService.notification_refund(e.message, payload);
            console.log(
              'NFT PointRefundKAFKA_EMITNOTIF - ' + moment().diff(start),
            );

            console.log('NFT PointHPointRefundKAFKA - ' + moment().diff(now));
            return false;
          } else {
            if (e.code != 'E00000') {
              console.log('gagal : ', e.code);
              const start = moment();
              console.log(
                'Start PointRefundKAFKA_Retry - ' +
                  start.format("YYYY-MM-DD HH:mm:ss'SSS"),
              );

              // retry emit to consumer inject until limit config
              this.refundService.retry_refund(e.message, payload);

              console.log(
                'NFT PointRefundKAFKA_Retry - ' + moment().diff(start),
              );
              console.log('NFT PointHPointRefundKAFKA - ' + moment().diff(now));
              return false;
            }
            console.log('not found : ', e.code);
            console.log('NFT PointHPointRefundKAFKA - ' + moment().diff(now));

            this.refundService.notification_refund(e.message, payload);
            // emit to notification

            return false;
          }
        }
      })
      .catch((e) => {
        console.log('gagal ', e);
        const start = moment();
        console.log(
          'Start PointRefundKAFKA_EMITNOTIF - ' +
            start.format("YYYY-MM-DD HH:mm:ss'SSS"),
        );

        // retry emit to consumer inject until limit config
        this.refundService.notification_refund(e.message, payload);

        console.log('NFT PointRefundKAFKA_EMITNOTIF - ' + moment().diff(start));

        console.log('NFT PointHPointRefundKAFKA - ' + moment().diff(now));

        const endTime = new Date();
        this.exceptionHandler.handle({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          level: 'error',
          notif_operation: true,
          notif_customer: false,
          transaction_id: payload.tracing_id,
          config: this.configService,
          taken_time: startTime.getTime() - endTime.getTime(),
          payload: {
            transaction_id: payload.tracing_id,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            taken_time: startTime.getTime() - endTime.getTime(),
            method: 'kafka',
            url: 'refund',
            service: 'REFUND',
            step: `REFUND ${e.message}`,
            param: payload,
            result: {
              msisdn: payload.incoming.msisdn,
              message: e.message,
              trace: payload.tracing_id,
              user_id: new IAccount(payload.account),
              data: e,
            },
          } satisfies LoggingData,
        });

        return false;
      });
  }
}
