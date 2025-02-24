import { Controller, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload } from '@nestjs/microservices';

import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import { IAccount } from '../../utils/logger/transport';
import { KafkaDonationService } from './donation.service';

@Controller()
export class DonationController {
  constructor(
    private readonly kafkaDonationService: KafkaDonationService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  // Consumer: donation
  // Expected Payload:
  // {
  //   origin: 'redeem.eligibility_success.deduct_success',
  //   retry: {
  //     donation: {
  //       counter: 0,
  //       errors: [],
  //     },
  //   },
  //   payload: {
  //     donation: {
  //       master_id: 'TRX_111',
  //       trace_id: 'DON_111',
  //       keyword: '63750b8b76aa4e8820edc8e3',
  //       msisdn: '081118181811',
  //       total_redeem: 10000,
  //       time: '2022-01-01T00:00:00'
  //     },
  //   }
  // }
  @EventPattern('donation')
  async donation(@Payload() payload: any): Promise<void> {
    const start = new Date();
    try {
      await this.kafkaDonationService.process_donation(payload);
    } catch (error) {
      const end = new Date();

      // Set Logging Failed
       this.kafkaDonationService.logger_donation({
        payload: payload,
        step: 'Step :: Produce Donation',
        message: 'Failed',
        date_now : end,
        stack : error?.stack,
        is_success: false,
      });

      // this.exceptionHandler.handle({
      //   statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      //   level: 'error',
      //   notif_operation: true,
      //   notif_customer: false,
      //   transaction_id: payload.tracing_id,
      //   config: this.configService,
      //   taken_time: start.getTime() - end.getTime(),
      //   payload: {
      //     transaction_id: payload.tracing_id,
      //     statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      //     taken_time: start.getTime() - end.getTime(),
      //     method: 'kafka',
      //     url: 'donation',
      //     service: 'DONATION',
      //     step: `DONATION ${error.message}`,
      //     param: payload,
      //     result: {
      //       msisdn: payload.incoming.msisdn,
      //       message: error.message,
      //       trace: payload.tracing_id,
      //       user_id: new IAccount(payload.account),
      //       data: error,
      //     },
      //   } satisfies LoggingData,
      // });
    }
  }
}
