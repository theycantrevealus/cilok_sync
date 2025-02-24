import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Account } from '@/account/models/account.model';
import {
  InjectCoupon,
  InjectCouponDocument,
} from '@/coupon/models/inject.coupon.model';
import { GlobalResponse } from '@/dtos/response.dto';

@Injectable()
export class CouponService {
  constructor(
    @InjectModel(InjectCoupon.name)
    private injectCouponModel: Model<InjectCouponDocument>,
  ) {
    //
  }

  async inject_coupon(request: InjectCoupon, account: Account) {
    const response = new GlobalResponse();
    response.transaction_classify = 'INJECT_COUPON';
    const newData = new this.injectCouponModel({
      ...request,
      created_by: account,
    });
    return await newData
      .save()
      .catch((e: Error) => {
        // throw new Error(e.message);
        console.log(e);
      })
      .then(() => {
        response.statusCode = HttpStatus.CREATED;
        response.message = 'Inject coupon success';
        response.payload = newData;
        return response;
      });
  }
}
