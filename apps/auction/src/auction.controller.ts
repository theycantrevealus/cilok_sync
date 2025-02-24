import { Controller, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExceptionHandler } from '@utils/logger/handler';
import { LoggingData } from '@utils/logger/transport';
import { IAccount } from '@utils/logger/transport';

import { AuctionService } from './auction.service';

@Controller()
export class AuctionController {
  constructor(
    private readonly auctionService: AuctionService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  @MessagePattern(process.env.KAFKA_AUCTION_TOPIC)
  async process(@Payload() payload: any) {
    const start = new Date();
    try {
      // for dev local only
      // await this.insertDataForTesting(payload);
      // check deduct status success / fail
      const origin = payload?.origin.split('.').pop();
      const status = origin.split('_')[1];
      console.log('---------check deduct status--------', status);
      if (status === 'success') {
        try {
          return this.auctionService.processAuction(payload);
        } catch (error) {
          // jika terjadi exception ketika proses auction
          // maka transaksi harus di refund
          console.log(`auction ${payload?.tracing_master_id} exception`, error);
          await this.auctionService.notificationAuction(
            payload,
            false,
            error?.message,
          );
          // rethrow error
          throw error;
        }
      } else {
        return this.auctionService.rollbackAuction(payload);
      }
    } catch (error) {
      const end = new Date();
      await this.exceptionHandler.handle({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        level: 'error',
        notif_operation: true,
        notif_customer: false,
        transaction_id: payload?.tracing_id,
        config: this.configService,
        taken_time: start.getTime() - end.getTime(),
        payload: {
          transaction_id: payload?.tracing_id,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          method: 'kafka',
          url: '/v1/redeem',
          service: 'AUCTION',
          step: payload?.bonus_type,
          param: payload,
          result: {
            msisdn: payload?.incoming?.msisdn,
            message: error,
            trace: payload?.tracing_id,
            user_id: new IAccount(payload.account),
          },
        } satisfies LoggingData,
      });
    }
  }

  /**
   * function for testing in local
   * skip eligibility, langsung emit ke auction
   * @param payload
   */
  async insertDataForTesting(payload) {
    const eventTime = await this.auctionService.getEventTime(payload);
    await this.auctionService.setRedisTopBidder(
      payload?.tracing_master_id,
      payload?.keyword?.eligibility?.name,
      payload?.keyword?.eligibility?.keyword_schedule,
      payload?.incoming?.msisdn,
      eventTime,
      payload?.incoming?.total_redeem,
    );
    // save to db
    await this.auctionService.saveBidder(
      payload?.tracing_master_id,
      payload?.keyword?.eligibility?.name,
      payload?.keyword?.eligibility?.keyword_schedule,
      payload?.incoming?.msisdn,
      eventTime,
      payload?.incoming?.total_redeem,
    );
  }
}
