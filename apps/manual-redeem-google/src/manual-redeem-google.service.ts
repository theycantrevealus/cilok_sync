import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import {
  BatchProcessLogEnum,
  BatchProcessLogRowDocument,
  BatchProcessRowLog,
} from '@/application/models/batch-row.log.model';
import { Coupon2Service } from '@/transaction/services/coupon/coupon2.service';

enum ManualRedeemGoogleLogic {
  MR_GOOGLE_01 = 'MR_GOOGLE_01',
  MR_GOOGLE_02 = 'MR_GOOGLE_02',
}

@Injectable()
export class ManualRedeemGoogleService {
  constructor(
    private couponService: Coupon2Service,

    @InjectModel(BatchProcessRowLog.name)
    private batchProcessRowLogModel: Model<BatchProcessLogRowDocument>,
  ) {}

  /**
   * For process manual redeem google
   * @param payload, example:
   * {
   * 	"data": [
   * 		"2",
   * 		"08343834993",
   * 		"accounting staff",
   * 		"Albert",
   * 		"jl. balai desa"
   * 	],
   * 	"parameters: {
   * 	  "service": "MR_GOOGLE_01",
   *    * 	"keyword": "TEST123",
   *    * 	"account": Account,
   *    * 	"token": "xyw-123123123"
   * 	}
   * }
   */
  async processRedeem(payload: any) {
    const data = payload.data;
    const params = payload.parameters;
    let status = BatchProcessLogEnum.FAIL;
    let traceId = undefined;
    let error = undefined;

    // 000000000 = success status
    const redeemStatus = data[7];

    // divider to convert shopping nominal into points
    const divider = 5000;
    const price = parseFloat(data[9]);
    const msisdn = data[13];
    const totalCoupon = Math.floor(price / divider);

    if (redeemStatus === '000000000') {
      const couponPayload = {
        total_point: totalCoupon ?? 0,
        msisdn: msisdn,
        keyword: payload.parameters.keyword,
        send_notification: true,
      };

      const result = await this.couponService.inject_coupon(
        couponPayload,
        payload.account,
        payload.token,
      );

      if (result.message === 'Success') {
        traceId = result.payload['trace_id'];
        status = BatchProcessLogEnum.SUCCESS;
      } else {
        error = result.message;
      }
      console.log(couponPayload);
    }

    const rowLog = new this.batchProcessRowLogModel({
      batch_id: new mongoose.Types.ObjectId(params.batch_id),
      filename: params.filename,
      line_data: {
        total_point: totalCoupon ?? 0,
        msisdn: msisdn,
        keyword: payload.parameters.keyword,
        redeem_status: redeemStatus,
      },
      trace_id: traceId,
      status: status,
      error: error,
    });
    await rowLog.save();

    return true;
  }
}
