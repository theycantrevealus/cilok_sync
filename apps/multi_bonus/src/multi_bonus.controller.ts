import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { KeywordService } from '@/keyword/services/keyword.service';
import { Redeem } from '@/transaction/models/redeem/redeem.model';

import { Params } from './multi_bonus.interface';
import { MultiBonusLogService } from './multi_bonus.log.service';
import { MultiBonusPayloadService } from './multi_bonus.payload.service';
import { MultiBonusService } from './multi_bonus.service';

@Controller()
export class MultiBonusController {
  constructor(
    @InjectModel(Redeem.name)
    private readonly transactionRedeem: Model<Redeem>,

    @Inject(MultiBonusService)
    private readonly multiBonusService: MultiBonusService,

    @Inject(MultiBonusPayloadService)
    private readonly multiBonusPayloadService: MultiBonusPayloadService,

    @Inject(MultiBonusLogService)
    private readonly multiBonusLogService: MultiBonusLogService,

    @Inject(KeywordService)
    private readonly keywordService: KeywordService,
  ) {}

  @EventPattern(process.env.KAFKA_MULTI_BONUS_TOPIC)
  async process(@Payload() payload): Promise<boolean> {
    const start = new Date();

    const isTokenExist = await this.multiBonusPayloadService.checkToken();
    if (!isTokenExist) {
      console.error(`Token or account is not exist!`);

      await this.multiBonusLogService.error(
        payload,
        start,
        `Token or account is not exist!`,
      );

      return false;
    }

    /**
     * Is from callback?
     * Build the rest payload for next transaction!
     */
    if (payload?.is_from_callback) {
      try {
        const lastTrxData = payload?.transaction;
        const keyword = await this.keywordService.findKeywordByNameWithRedis(
          lastTrxData?.keyword,
        );

        // TODO
        // const incoming = await this.transactionRedeem.findOne({
        //   master_id: payload?.transaction_id,
        // });

        // console.log(incoming);
        // END TODO

        const newPayload = {
          origin: lastTrxData?.origin,
          tracing_id: payload?.transaction_id,
          tracing_master_id: payload?.transaction_id,
          parent_transaction_id: payload?.transaction_id, // TODO
          keyword: keyword,
          bonus_type: keyword?.bonus?.[0]?.bonus_type ?? lastTrxData?.bonus,
          incoming: {
            locale: 'id-ID',
            msisdn: lastTrxData?.msisdn,
            keyword: lastTrxData?.keyword,
            channel_id: lastTrxData?.channel_id,
          },
        };

        payload = newPayload;

        await this.multiBonusLogService.verbose(
          payload,
          {},
          `[${payload?.tracing_master_id}] is come from callback, new payload is builded!`,
          start,
        );
      } catch (err: any) {
        await this.multiBonusLogService.error(
          payload,
          start,
          'Unable to build payload for this transaction! Skip!',
        );

        return false;
      }
    }

    // console.log(payload);
    // return true;

    /**
     * Main function
     */
    const firstTransactionId = payload?.tracing_master_id;
    // const keywordName = payload?.keyword?.eligibility?.name;
    const keywordType = payload?.keyword?.eligibility?.poin_value;
    // const bonusType = payload?.bonus_type;
    // const incoming = payload?.incoming;
    // const firstOrigin = payload?.origin?.split('.')?.[0];

    const bonusFlexibility = payload?.keyword?.bonus?.[0]?.flexibility;

    // === GLOBAL CHECKER ===
    const is_parent_transaction =
      payload?.tracing_master_id == payload?.parent_transaction_id;
    const is_async_external_bonus =
      payload?.keyword?.bonus?.filter(
        (e) =>
          e.bonus_type == 'telco_prepaid' || e.bonus_type == 'telco_postpaid',
      )?.length > 0;
    const is_sync_external_bonus =
      payload?.keyword?.bonus?.filter(
        (e) =>
          e.bonus_type == 'ngrs' ||
          e.bonus_type == 'linkaja' ||
          e.bonus_type == 'linkaja_main' ||
          e.bonus_type == 'linkaja_bonus' ||
          e.bonus_type == 'linkaja_voucher',
      )?.length > 0;
    const is_main_keyword = payload?.keyword?.is_main_keyword != false;
    const is_multi_bonus =
      is_main_keyword && payload?.keyword?.child_keyword?.length > 0;
    const is_from_multibonus =
      payload?.incoming?.additional_param?.is_from_multibonus;

    await this.multiBonusLogService.verbose(
      payload,
      {},
      `[${firstTransactionId}] is parent/first transaction? ${is_parent_transaction}`,
      start,
    );
    await this.multiBonusLogService.verbose(
      payload,
      {},
      `[${firstTransactionId}] is ASYNC external bonus? ${is_async_external_bonus}`,
      start,
    );
    await this.multiBonusLogService.verbose(
      payload,
      {},
      `[${firstTransactionId}] is SYNC external bonus? ${is_sync_external_bonus}`,
      start,
    );
    await this.multiBonusLogService.verbose(
      payload,
      {},
      `[${firstTransactionId}] is main keyword? ${is_main_keyword}`,
      start,
    );
    await this.multiBonusLogService.verbose(
      payload,
      {},
      `[${firstTransactionId}] is multi bonus? ${is_multi_bonus}`,
      start,
    );
    await this.multiBonusLogService.verbose(
      payload,
      {},
      `[${firstTransactionId}] is COME FROM multi bonus? ${is_from_multibonus}`,
      start,
    );

    const params: Params = {
      is_parent_transaction,
      is_multi_bonus,
      is_main_keyword,
      is_from_multibonus,
    };

    /**
     * Please change all config on:
     * 1. apps\transaction_master\src\transaction_master.service.ts (Transaction Master)
     * 2. apps\multi_bonus\src\multi_bonus.controller.ts (Multibonus)
     * --
     * 2024/11/26 - First version
     */
    if (is_multi_bonus) {
      this.multiBonusService.processMultiBonus(payload, params);
    } else {
      if (
        (['Flexible', 'Fixed Multiple'].includes(keywordType) ||
          ['Fixed', 'Flexible'].includes(bonusFlexibility)) &&
        !is_async_external_bonus &&
        !is_sync_external_bonus
      ) {
        this.multiBonusService.processMultiRedeem(payload, params);
      }
    }
  }
}
