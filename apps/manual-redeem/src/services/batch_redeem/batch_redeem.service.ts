import { Inject, Injectable } from '@nestjs/common';

import { AccountService } from '@/account/services/account.service';
import { BatchRedeemService as RedeemService } from '@/transaction/services/redeem/batch_redeem.service';

import { ManualRedeemLogService } from '../log.service';

@Injectable()
export class BatchRedeemService {
  constructor(
    @Inject(ManualRedeemLogService)
    private readonly manualRedeemLogService: ManualRedeemLogService,

    @Inject(AccountService)
    private readonly accountService: AccountService,

    @Inject(RedeemService)
    private readonly redeemService: RedeemService,
  ) {}

  async processRedeem(payload: any) {
    const start = new Date();

    const data = payload.data;
    const params = payload.parameters;

    this.manualRedeemLogService.verbose(
      payload,
      {
        data: data,
        params: params,
      },
      `[BATCH_REDEEM - ${payload?.transaction}] Start ...`,
      start,
    );

    try {
      const body = {
        dir: params.dir,
        send_notification: params.send_notification,
        is_from_dashboard: params?.is_from_dashboard ?? true, // for mbp coupon
      };

      console.log('BODY', body)

      const account = await this.accountService.authenticateBusiness({
        auth: params.token,
      });

      const req = {
        url: `kafka-${payload?.transaction?.toLowerCase()}`,
        headers: {
          authorization: params.token,
        },
      };

      let result = {};
      if (payload?.transaction?.toLowerCase() == 'batch_redeem') {
        result = await this.redeemService.batchRedeem(
          body,
          account,
          req,
          false,
        );
      } else if (payload?.transaction?.toLowerCase() == 'batch_inject_point') {
        result = await this.redeemService.batchRedeemInjectPoint(
          body,
          account,
          req,
          false,
        );
      } else if (payload?.transaction?.toLowerCase() == 'batch_inject_coupon') {
        result = await this.redeemService.batchRedeemInjectCoupon(
          body,
          account,
          req,
          false,
        );
      }

      this.manualRedeemLogService.verbose(
        payload,
        {
          data: data,
          params: params,
          res: result,
        },
        `[BATCH_REDEEM - ${payload?.transaction}] Success!`,
        start,
      );

      return true;
    } catch (err) {
      await this.manualRedeemLogService.error(
        payload,
        start,
        `[BATCH_REDEEM - ${payload?.transaction}] An error occured! Error: ${err?.message}`,
        err?.stack ?? {},
      );

      return false;
    }
  }
}
