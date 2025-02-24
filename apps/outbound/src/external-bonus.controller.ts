import { Body, Controller, HttpStatus, Inject, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { Logger } from 'winston';

import { WINSTON_MODULE_PROVIDER } from '../../utils/logger/constants';
import { ExceptionHandler } from '../../utils/logger/handler';
import { IAccount, LoggingData } from '../../utils/logger/transport';
import { ExternalBonusService } from './external-bonus.service';

@Controller()
export class ExternalBonusController {
  constructor(
    private readonly kafkaService: ExternalBonusService,
    @Inject('OUTBOUND_SERVICE_PRODUCER')
    private readonly clientOutbound: ClientKafka,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}
  @MessagePattern('outbound')
  async injectCoupon(@Payload() payload: any) {
    //===================================================================
    const start = new Date();
    let end = new Date();

    const loggerObject = {
      origin: payload.origin,
      submit_time: payload.submit_time,
      token: payload.token,
      // redeem: payload.redeem,
      // program: payload.program,
      keyword: {
        _id: payload.keyword._id,
        // eligibility: payload.keyword.eligibility,
        bonus: payload.keyword.bonus,
        // hq_approver: payload.keyword.hq_approver,
        // is_draft: payload.keyword.is_draft,
        // is_stoped: payload.keyword.is_stoped,
        // keyword_approval: payload.keyword.keyword_approval,
        // keyword_edit: payload.keyword.keyword_edit,
        // need_review_after_edit: payload.keyword.need_review_after_edit,
        // updated_at: payload.keyword.updated_at,
        // created_at: payload.keyword.created_at,
      },
      customer: payload.customer,
      payload: payload.payload,
      incoming: payload.incoming,
      tracing_id: payload.tracing_id,
      tracing_master_id: payload.tracing_master_id,
      tracing_id_voucher: payload.tracing_id_voucher,
      // endpoint: payload.endpoint,
    };
    // delete loggerObject.program.created_by;
    // delete loggerObject.program.program_notification;

    try {
      return this.kafkaService.process_external_bonus(
        payload,
        payload.payload,
        loggerObject,
      );
    } catch (e) {
      end = new Date();
      const takenTime = Math.abs(start.getTime() - end.getTime());
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
          url: 'outbound',
          service: 'OUTBOUND',
          step: `Outbound Consumer Controller ERROR`,
          param: loggerObject,
          result: {
            msisdn: payload.incoming.msisdn,
            message: e.message,
            trace: payload.tracing_id,
            user_id: new IAccount(payload.account),
            data: e,
          },
        } satisfies LoggingData,
      });
    }
  }

  @Post()
  postMessage(@Body() payload) {
    this.clientOutbound.emit('outbound', payload);
  }
}
