import { Inject, Injectable } from '@nestjs/common';
import { UtilsService } from '@utils/services/utils.service';

import { BatchRedeemService } from './services/batch_redeem/batch_redeem.service';
import { ManualRedeemLogService } from './services/log.service';
import { TransferPulsaService } from './services/transfer_pulsa/transfer_pulsa.service';

@Injectable()
export class ManualRedeemService {
  constructor(
    @Inject(UtilsService)
    private readonly utilsService: UtilsService,

    @Inject(ManualRedeemLogService)
    private readonly manualRedeemLogService: ManualRedeemLogService,

    @Inject(TransferPulsaService)
    private readonly transferPulsaService: TransferPulsaService,

    @Inject(BatchRedeemService)
    private readonly batchRedeemService: BatchRedeemService,
  ) {}

  /**
   *
   * @param payload
   * @returns
   */
  async processRedeem(payload: any) {
    const start = new Date();

    // === TOKEN MANAGEMENT ===
    try {
      const signIn = await this.utilsService.getToken();
      if (!signIn) {
        console.log('Unable to get token from core');

        await this.manualRedeemLogService.error(
          payload,
          start,
          `[MANUAL_REDEEM] An error occured! Error: Unable to get token from core`,
          {},
        );

        return false;
      }

      // payload.parameters.token = `Bearer ${signIn.payload.access_token}`;
      payload.parameters = {
        ...payload.parameters,
        token: `Bearer ${signIn.payload.access_token}`,
      };
    } catch (err) {
      console.error(err);

      await this.manualRedeemLogService.error(
        payload,
        start,
        `[MANUAL_REDEEM] An error occured! Error: ${err?.message}`,
        err?.stack ?? {},
      );

      return false;
    }

    // === END TOKEN MANAGEMENT ===

    this.manualRedeemLogService.verbose(
      payload,
      {},
      `[MANUAL_REDEEM] Starting for ${payload?.transaction} transaction`,
      start,
    );

    switch (payload?.transaction?.toLowerCase()) {
      case 'transfer_pulsa':
        await this.transferPulsaService.processRedeem(payload);
        break;

      case 'batch_redeem':
        await this.batchRedeemService.processRedeem(payload);
        break;

      case 'batch_inject_point':
        await this.batchRedeemService.processRedeem(payload);
        break;

      case 'batch_inject_coupon':
        await this.batchRedeemService.processRedeem(payload);
        break;

      default:
        break;
    }

    this.manualRedeemLogService.verbose(
      payload,
      {},
      `[MANUAL_REDEEM] Transaction ${payload?.transaction} finish`,
      start,
    );

    return true;
  }
}
