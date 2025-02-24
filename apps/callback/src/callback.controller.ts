import { Controller, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import { IAccount } from '../../utils/logger/transport';
import { CallbackService } from './callback.service';

@Controller()
export class CallbackController {
  constructor(
    private readonly callbackService: CallbackService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  @MessagePattern(process.env.KAFKA_CALLBACK_TOPIC)
  async process(@Payload() payload: any) {
    const start = new Date();
    try {
      return this.callbackService.submit(payload);
    } catch (error) {
      const end = new Date();
      await this.exceptionHandler.handle({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        level: 'error',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload.tracing_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          transaction_id: payload.tracing_id,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          method: 'kafka',
          url: 'callback',
          service: 'CALLBACK',
          step: `Callback ${error.message}`,
          param: payload,
          result: {
            msisdn: payload.incoming.msisdn,
            message: error.message,
            trace: payload.tracing_id,
            user_id: new IAccount(payload.account),
            data: error,
          },
        } satisfies LoggingData,
      });
    }
  }
}
