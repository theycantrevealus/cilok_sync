import { Controller, Get, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import { ReportingPointEventService } from './reporting_point_event.service';

@Controller()
export class ReportingPointEventController {
  constructor(
    @Inject(ReportingPointEventService)
    private readonly reportingPointEventService: ReportingPointEventService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.reportingPointEventService.getHello();
  }

  @MessagePattern('reporting-point-event-to-bi')
  async poinEvent(@Payload() payload: any) {
    const start = new Date();
    try {
      return await this.reportingPointEventService.listenerSubcribtion(payload);
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
          url: payload.origin,
          service: 'REPOTING POINT EVENT',
          step: `REPOTING POINT EVENT ERROR`,
          param: payload,
          result: {
            msisdn: payload?.payload?.msisdn,
            message: error?.message,
            trace: payload?.tracing_id,
            data: error,
            result: {
              message: error?.message,
              stack: error?.stack,
            },
          },
        } satisfies LoggingData,
      });
    }
  }
}
