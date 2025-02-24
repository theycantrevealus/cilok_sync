import { Controller, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern } from '@nestjs/microservices';

import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import { TransactionMasterService } from './transaction_master.service';

@Controller()
export class TransactionMasterController {
  constructor(
    private readonly transactionMasterService: TransactionMasterService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  @MessagePattern(process.env.KAFKA_TRANSACTION_MASTER_TOPIC)
  async actionTransactionMaster(payload: any) {
    const start = new Date();
    try {
      return this.transactionMasterService.actTransactionMaster(payload);
    } catch (error) {
      const end = new Date();
      await this.exceptionHandler.handle({
        level: 'error',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload.tracing_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          service: TransactionMasterController.name,
          user_id: payload.account,
          step: 'Transaction Master Consumer Controller',
          param: payload,
          result: {
            message: error.message,
            trace: error.trace,
          },
        } satisfies LoggingData,
      });
    }
  }
}
