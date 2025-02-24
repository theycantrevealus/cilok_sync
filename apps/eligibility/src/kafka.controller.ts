import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { Controller, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientKafka,
  Ctx,
  KafkaContext,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { TransactionStepStatus } from '@transaction_master/helper/transaction.step.status';
import { ExceptionHandler } from '@utils/logger/handler';
import { LoggingData } from '@utils/logger/transport';
import { IAccount } from '@utils/logger/transport';

import { NotificationContentService } from '@/application/services/notification-content.service';

import { KafkaService } from './kafka.service';

@Controller()
export class KafkaController {
  private notificationContentService: NotificationContentService;
  constructor(
    notificationContentService: NotificationContentService,
    private readonly kafkaService: KafkaService,
    // private readonly transactionRecoveryService: TransactionRecoveryService,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject('DEDUCT_SERVICE_PRODUCER')
    private readonly deductClient: ClientKafka,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.notificationContentService = notificationContentService;
  }

  @MessagePattern(process.env.KAFKA_ELIGIBILITY_TOPIC)
  async eligibilityCheck(
    @Payload() payload: any,
    @Ctx() context: KafkaContext,
  ) {
    //await this.transactionRecoveryService.setMessageAck(
    //  payload,
    //  'eligibility',
    //  context.getPartition(),
    //  context.getMessage().offset,
    //  "eligibility_message_ack",
    //);

    //===================================================================
    const start = new Date();
    let end = new Date();
    const loggerObject = {
      origin: payload.origin,
      submit_time: payload.submit_time,
      token: payload.token,
      redeem: payload.redeem,
      program: payload.program,
      keyword: {
        _id: payload.keyword._id,
        eligibility: payload.keyword.eligibility,
        bonus: payload.keyword.bonus,
        hq_approver: payload.keyword.hq_approver,
        is_draft: payload.keyword.is_draft,
        is_stoped: payload.keyword.is_stoped,
        keyword_approval: payload.keyword.keyword_approval,
        keyword_edit: payload.keyword.keyword_edit,
        need_review_after_edit: payload.keyword.need_review_after_edit,
        updated_at: payload.keyword.updated_at,
        created_at: payload.keyword.created_at,
      },
      customer: payload.customer,
      payload: payload.payload,
      incoming: payload.incoming,
      tracing_id: payload.tracing_id,
      tracing_master_id: payload.tracing_master_id,
      tracing_id_voucher: payload.tracing_id_voucher,
      endpoint: payload.endpoint,
    };
    delete loggerObject.program.created_by;
    delete loggerObject.program.program_notification;
    try {
      await this.kafkaService
        .eligibilityCheck(payload, start, loggerObject)
        .then(async (response) => {
          console.log('response origin  : => ', response?.origin);
          if (!response?.origin) {
            console.log('payload origin : ', payload.origin);
            payload.origin = `${payload.origin}_fail`;
            payload.notification =
              await this.notificationContentService.getNotificationTemplate(
                NotificationTemplateConfig.REDEEM_FAILED_EXPIRED_TOKEN,
                payload,
              );
            payload.error_message = ['origin undefined'];
            console.log('payload.notification  : ', payload.notification);
            return await this.notificationClient.emit(
              process.env.KAFKA_NOTIFICATION_TOPIC,
              payload,
            );
          }
          //enhance
          const origin_split = response?.origin.split('.');
          const last_origin = origin_split[origin_split.length - 1];
          // const transactionStatus = TransactionStepStatus.SUCCESS;

          if (
            last_origin === 'eligibility_fail' ||
            last_origin === 'norule_fail'
          ) {
            if (response?.notification) {
              console.log('notif agung', response?.notification);
            }
            return await this.notificationClient.emit(
              process.env.KAFKA_NOTIFICATION_TOPIC,
              response,
            );

            // transactionStatus = TransactionStepStatus.FAILED;
            // await this.transactionRecoveryService.setStep(payload, 'notification');
          } else if (last_origin === 'eligibility_success') {
            if (response?.notification) {
              console.log('notif agung', response?.notification);
            }
            return await this.deductClient.emit(
              process.env.KAFKA_DEDUCT_TOPIC,
              response,
            );
          } else if (last_origin === 'norule') {
            if (response?.notification) {
              console.log('notif agung', response?.notification);
            }
            return await this.deductClient.emit(
              process.env.KAFKA_DEDUCT_TOPIC,
              response,
            );
          } else if (payload.origin === 'inject_coupon') {
            response.origin = 'inject_coupon.eligibility_success';
            return await this.deductClient.emit(
              process.env.KAFKA_DEDUCT_TOPIC,
              response,
            );
          }

          if (last_origin !== 'eligibility_fail') {
            // await this.transactionRecoveryService.setStep(payload, 'deduct');
          }

          //await this.transactionRecoveryService.setStepStatus(
          //  response,
          //  'eligibility',
          //  transactionStatus,
          //  last_origin,
          //);
        })
        .catch(async (e: Error) => {
          // await this.transactionRecoveryService.setStepStatus(
          //  payload,
          //  'eligibility',
          //  TransactionStepStatus.ERROR,
          //  'eligibility_service_check_error'
          //);

          console.log(e, 'agung error');
          end = new Date();
          const takenTime = Math.abs(start.getTime() - end.getTime());
          // handle partial status trx master notification
          payload.notification =
            await this.notificationContentService.getNotificationTemplate(
              NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER,
              payload,
            );
          payload.error_message = [e?.message, e?.stack];
          await this.notificationClient.emit(
            process.env.KAFKA_NOTIFICATION_TOPIC,
            payload,
          );

          await this.exceptionHandler.handle({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            level: 'error',
            notif_operation: true,
            notif_customer: false,
            transaction_id: payload.tracing_id,
            config: this.configService,
            taken_time: takenTime,
            payload: {
              transaction_id: payload.tracing_id,
              statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              taken_time: takenTime,
              method: 'kafka',
              url: 'eligibility',
              service: 'ELIGIBILITY',
              step: `Eligibility Controller : CATCH ERROR`,
              param: loggerObject,
              result: {
                msisdn: payload.incoming.msisdn,
                message: null,
                trace: payload.tracing_id,
                user_id: new IAccount(payload.account),
                data: e,
                result: {
                  message: e?.message,
                  stack: e?.stack,
                },
              },
            } satisfies LoggingData,
          });
        });
    } catch (e) {
      //await this.transactionRecoveryService.setStepStatus(
      //  payload,
      //  'eligibility',
      //  TransactionStepStatus.ERROR,
      //  'eligibility_service_error'
      //);

      console.log(e, 'agung error');
      end = new Date();
      const takenTime = Math.abs(start.getTime() - end.getTime());
      // handle partial status trx master notification
      payload.notification =
        await this.notificationContentService.getNotificationTemplate(
          NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER,
          payload,
        );
      payload.error_message = [e?.message, e?.stack];

      await this.notificationClient.emit(
        process.env.KAFKA_NOTIFICATION_TOPIC,
        payload,
      );

      await this.exceptionHandler.handle({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        level: 'error',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload.tracing_id,
        config: this.configService,
        taken_time: takenTime,
        payload: {
          transaction_id: payload.tracing_id,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          taken_time: takenTime,
          method: 'kafka',
          url: 'eligibility',
          service: KafkaController.name,
          step: `Eligibility Controller : CATCH ERROR`,
          param: loggerObject,
          result: {
            msisdn: payload.incoming.msisdn,
            message: null,
            trace: payload.tracing_id,
            user_id: new IAccount(payload.account),
            data: e,
            result: {
              message: e?.message,
              stack: e?.stack,
            },
          },
        } satisfies LoggingData,
      });
    }
  }
}
