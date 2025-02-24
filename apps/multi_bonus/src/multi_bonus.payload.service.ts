import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';

import { OptionalRedeemPayload } from './multi_bonus.interface';
import { MultiBonusLogService } from './multi_bonus.log.service';

@Injectable()
export class MultiBonusPayloadService {
  private token: string;
  private account: any;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(ApplicationService)
    private readonly applicationService: ApplicationService,

    @Inject(AccountService)
    private readonly accountService: AccountService,

    @Inject(TransactionOptionalService)
    private readonly transactionOptionalService: TransactionOptionalService,

    @Inject(MultiBonusLogService)
    private readonly multiBonusLogService: MultiBonusLogService,
  ) {
    this.token = null;
    this.account = null;

    this.setTokenSystem();
  }

  async setTokenSystem() {
    const start = new Date();

    try {
      const systemToken = await this.applicationService.getSystemToken();
      if (!systemToken) {
        await this.multiBonusLogService.error(
          {},
          start,
          'Unable to get token from System Config!',
        );

        return null;
      }

      const token = `Bearer ${systemToken}`;
      const account = await this.accountService.authenticateBusiness({
        auth: token,
      });

      this.token = token;
      this.account = account;

      return true;
    } catch (err) {
      console.error('An error occured!', err);
      return false;
    }
  }

  async buildRedeemPayload(
    payload,
    optional?: OptionalRedeemPayload,
    iteration: number = null,
    multibonus = false,
  ) {
    const firstTransactionId = payload?.tracing_master_id;
    const incomingPayload = payload?.incoming;

    // modify payload incoming
    let additional_param = {
      parent_transaction_id: firstTransactionId.toString(),
      // iteration: iteration,
      is_from_multibonus: true,
    };

    // another payload for voting
    if (incomingPayload?.additional_param) {
      additional_param = {
        ...additional_param,
        ...incomingPayload.additional_param,
      };
    }

    let incoming = {
      ...incomingPayload,
      additional_param: additional_param,
    };

    // disable notification only for fixed multiple
    if (!multibonus) {
      incoming = {
        ...incoming,
        send_notification: false,
      };
    }

    // if (incoming?.total_redeem) delete incoming.total_redeem;
    if (optional?.deleted?.length > 0) {
      for (let i = 0; i < optional.deleted.length; i++) {
        if (incoming[optional.deleted[i]]) {
          delete incoming[optional.deleted[i]];
        }
      }
    }

    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'REDEEM';
    response.trace_custom_code = 'TRX';

    // generate trace_id
    const trace_id = this.transactionOptionalService.getTracingId(
      incoming,
      response,
    );

    const resPayload = {
      data: incoming,
      account: this.account,
      token: this.token,
      transaction_id: trace_id,
      path: optional?.path || 'multi_bonus-redeem_fixed_multiple',
      keyword_priority: incoming?.tsel_id ? 'DEFAULT' : 'LOW',
    };

    return resPayload;
  }

  async buildPayloadInjectCoupon(payload) {
    const firstTransactionId = payload?.tracing_master_id;
    const incomingPayload = payload?.incoming;

    // modify payload incoming
    const incoming = {
      ...incomingPayload,
      send_notification: false,
      additional_param: {
        parent_transaction_id: firstTransactionId.toString(),
        is_from_multibonus: true,
      },
    };

    if (incoming?.total_redeem) delete incoming.total_redeem;
    if (incoming?.total_coupon) delete incoming.total_coupon;
    if (incoming?.responseBody) delete incoming.responseBody;

    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'INJECT_COUPON';
    response.trace_custom_code = 'TRX';

    // generate trace_id
    const trace_id = this.transactionOptionalService.getTracingId(
      incoming,
      response,
    );

    const resPayload = {
      trace_id: trace_id,
      tracing_master_id: trace_id,
      transaction_classify: 'INJECT_COUPON',
      trace_custom_code: 'CPN',
      origin: 'inject_coupon',
      program: null,
      keyword: null,
      customer: null,
      endpoint: 'multi_bonus-inject_coupon',
      tracing_id: trace_id,
      incoming: incoming,
      account: this.account,
      token: this.token,
      submit_time: new Date().toISOString(),
      retry: {
        deduct: {
          counter: 0,
          errors: [],
        },
        refund: {
          counter: 0,
          errors: [],
        },
        inject_point: {
          counter: 0,
          errors: [],
        },
        donation: {
          counter: 0,
          errors: [],
        },
        coupon: {
          counter: 0,
          errors: [],
        },
      },
      payload: {
        coupon: null,
        mbp: null,
      },
      campaign: null,
    };

    return resPayload;
  }

  async checkToken() {
    if (!this.token || !this.account) {
      console.error(
        `Token or account is empty, cannot continue! ${JSON.stringify({
          token: this.token,
          account: this.account,
        })}`,
      );

      return false;
    }

    return true;
  }
}
