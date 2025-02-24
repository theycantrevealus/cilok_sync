import { Controller, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import { VoidKafkaConsumerService } from './void.service';

@Controller()
export class VoidKafkaConsumerController {
  constructor(
    private readonly voidService: VoidKafkaConsumerService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}
  @MessagePattern(process.env.KAFKA_VOID_TOPIC)
  async handleVoidKeyword(@Payload() payload: any) {
    const start = new Date();
    try {
      if (payload.origin) {
        if (payload.origin == 'redeem2.notificationkeyword') {
          await this.voidService.processNotificationKeyword(payload);
        } else if (
          payload.origin.includes('redeem2.bulk_redeem_coupon_confirmation')
        ) {
          await this.voidService.processBulkRedeemCouponConfirmation(payload);
        } else if (
          payload.origin.includes('redeem2.bulk_redeem_coupon_approval')
        ) {
          await this.voidService.processBulkRedeemCouponApproval(payload);
        } else if (payload.origin.includes('redeem2.bulk_redeem_coupon_info')) {
          await this.voidService.processBulkRedeemCouponInfo(payload);
        } else if (
          payload.origin.includes('redeem2.bulk_redeem_coupon_check')
        ) {
          await this.voidService.processBulkRedeemCouponCheck(payload);
        } else {
          //
        }
      } else {
        if (payload.total_redeem) {
          // Process to fixed multiple
        }
      }

      if (payload.payload && payload.payload.void) {
        // to provide notification so that no errors occur and ignore other transaction
        const ignore = payload.payload.void.hasOwnProperty('ignore')
          ? payload.payload?.void?.ignore ?? false
          : false;

        if (!ignore) {
          switch (payload.payload.void.keyword.toUpperCase()) {
            case 'POIN':
              await this.voidService.processPoinVoidKeyword(payload);
              break;
            default:
              if (
                payload.origin.includes(
                  'redeem2.bulk_redeem_coupon_confirmation',
                )
              ) {
                // Do nothing
              } else {
                await this.voidService.sendVoidSuccessNotification(payload);
              }
              break;
          }
        } else {
          console.log('<-- void ignore other action -->');
          console.log('status = ON');
          console.log('<-- void ignore other action -->');
          const end = new Date();
          await this.exceptionHandler.handle({
            level: 'verbose',
            notif_operation: true,
            notif_customer: false,
            statusCode: HttpStatus.OK,
            transaction_id: payload.tracing_id
              ? payload?.tracing_id
              : payload?.tracing_master_id,
            config: this.configService,
            taken_time: start.getTime() - end.getTime(),
            payload: {
              service: VoidKafkaConsumerController.name,
              statusCode: HttpStatus.OK,
              user_id: payload.account,
              step: 'Void Consumer Controller',
              transaction_id: payload.tracing_id
                ? payload?.tracing_id
                : payload?.tracing_master_id,
              method: 'kafka',
              param: payload,
              taken_time: start.getTime() - end.getTime(),
              result: {
                result: {
                  message: 'void ignore other action',
                  stack: JSON.stringify(payload?.payload?.void),
                },
              },
            } satisfies LoggingData,
          });
        }
      }
    } catch (error) {
      const end = new Date();
      await this.exceptionHandler.handle({
        level: 'error',
        notif_operation: true,
        notif_customer: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        transaction_id: payload.tracing_id
          ? payload?.tracing_id
          : payload?.tracing_master_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          service: VoidKafkaConsumerController.name,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          user_id: payload.account,
          step: 'Void Consumer Controller',
          transaction_id: payload.tracing_id
            ? payload?.tracing_id
            : payload?.tracing_master_id,
          method: 'kafka',
          param: payload,
          taken_time: start.getTime() - end.getTime(),
          result: {
            result: {
              message: error.message,
              stack: error.trace,
            },
          },
        } satisfies LoggingData,
      });
    }
  }
}
