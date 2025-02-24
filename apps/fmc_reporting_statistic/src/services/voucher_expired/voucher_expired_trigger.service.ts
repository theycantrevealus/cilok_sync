import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import { Model } from 'mongoose';

import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { Voucher, VoucherDocument } from '@/transaction/models/voucher/voucher.model';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';

@Injectable()
export class VoucherExpiredTriggerService {
  constructor(
    @InjectModel(Voucher.name)
    private voucherModel: Model<VoucherDocument>,
  ) {}

  async voucherActionUpdate(): Promise<ReportingServiceResult> {
    try {
      const date = new Date().toISOString();
      const expiredVouchers = await this.voucherModel
        .find({
          'responseBody.end_time': { $ne: null },
          $expr: {
            $lte: ['$responseBody.end_time', date],
          },
          status: { $ne: 'Expire' }, // Hanya update jika status belum "Expire"
        })
        .exec();
      const count = expiredVouchers.length;
      await this.voucherModel
        .updateMany(
          {
            'responseBody.end_time': {
              $lte: date,
              $exists: true, // Hanya update jika responseBody.end_time tidak null
            },
            status: { $ne: 'Expire' }, // Hanya update jika status belum "Expire"
          },
          { $set: { status: 'Expire' } },
        )
        .exec();
      console.log('Expire Vouchers Count:', count);
      console.log('waktu pengecekan : ', new Date().toISOString());

      return new ReportingServiceResult({
        is_error: false,
        message:
          'Success voucher expired update' +
          `\nExpire voucher count: ${count}` +
          `\nCheck time: ${new Date().toISOString()}`,
      });
    } catch (error) {
      console.error('Error in voucherActionUpdate:', error);
      return new ReportingServiceResult({
        is_error: true,
        message: error.message,
        stack: error.stack,
      });
    }
  }
}
