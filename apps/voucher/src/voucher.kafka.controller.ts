import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { StoreDataRowPayload } from '../../batch/src/models/batch-message.dto';
import { VoucherService } from './voucher.kafka.service';
import { VoucherLogService } from './voucher.log.service';

@Controller()
export class VoucherController {
  constructor(
    private readonly voucherService: VoucherService,
    private voucherLogService: VoucherLogService,
  ) {}

  @MessagePattern(process.env.KAFKA_VOUCHER_TOPIC)
  add_voucher(@Payload() payload: any): any {
    const start = new Date();
    // console.info('Consumer', payload);
    return this.voucherService
      .addVoucher(payload)
      .then((e) => {
        console.info('SUCCESS', e);
      })
      .catch((e) => {
        this.voucherLogService.loggerVoucherError(
          payload,
          start,
          `[${payload?.tracing_id}] Catch : ${e?.message}`,
          e?.stack,
        );

        this.voucherService.notification_voucher(e?.message, payload, true, {
          is_refund: true,
          reason: 'Voucher process fail',
        });

        console.error('ERROR/CATCH', e);
      });
  }
}
