import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';
import { Logger } from 'winston';

@Injectable()
export class VoteLogService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async verbose(payload, otherData, step, start) {
    const end = new Date();
    await this.exceptionHandler.handle({
      level: 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.tracing_id ?? payload?.identifier,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      statusCode: HttpStatus.OK,
      payload: {
        transaction_id: payload?.tracing_id ?? payload?.identifier,
        statusCode: HttpStatus.OK,
        method: 'kafka',
        url: 'vote',
        service: 'VOTE',
        step: step,
        param: payload,
        result: {
          statusCode: HttpStatus.OK,
          level: 'verbose',
          message: step,
          trace: payload?.tracing_id ?? payload?.identifier,
          msisdn: payload?.incoming?.msisdn,
          user_id: new IAccount(payload?.account),
          ...otherData,
        },
      } satisfies LoggingData,
    });
  }

  async error(payload, start, step, trace = {}) {
    const end = new Date();
    await this.exceptionHandler.handle({
      level: 'error',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.tracing_id ?? payload?.identifier,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      statusCode: HttpStatus.BAD_REQUEST,
      payload: {
        transaction_id: payload?.tracing_id ?? payload?.identifier,
        statusCode: HttpStatus.BAD_REQUEST,
        method: 'kafka',
        url: 'vote',
        service: 'VOTE',
        step: step,
        param: payload,
        result: {
          statusCode: HttpStatus.BAD_REQUEST,
          level: 'error',
          message: step,
          trace: payload?.tracing_id ?? payload?.identifier,
          msisdn: payload?.incoming?.msisdn,
          user_id: new IAccount(payload?.account),
          stack_trace: trace,
        },
      } satisfies LoggingData,
    });
  }
}
