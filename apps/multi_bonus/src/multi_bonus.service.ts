import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Queue } from 'bull';
import { firstValueFrom } from 'rxjs';

import { ApplicationService } from '@/application/services/application.service';
import { KeywordService } from '@/keyword/services/keyword.service';

import { OptionalRedeemPayload, Params } from './multi_bonus.interface';
import { MultiBonusLogService } from './multi_bonus.log.service';
import { MultiBonusPayloadService } from './multi_bonus.payload.service';

@Injectable()
export class MultiBonusService {
  protected multibonusRedeem: Queue;

  constructor(
    @Inject('NOTIFICATION_PRODUCER')
    private readonly clientNotification: ClientKafka,

    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly clientRefund: ClientKafka,

    @Inject('REDEEM_LOW_SERVICE_PRODUCER')
    private readonly clientRedeemLow: ClientKafka,

    @Inject('COUPON_LOW_SERVICE_PRODUCER')
    private readonly clientCouponLow: ClientKafka,

    @Inject(MultiBonusLogService)
    private readonly multiBonusLogService: MultiBonusLogService,

    @Inject(MultiBonusPayloadService)
    private readonly multiBonusPayloadService: MultiBonusPayloadService,

    @Inject(KeywordService)
    private readonly keywordService: KeywordService,

    @InjectQueue(process.env.REDIS_MULTI_BONUS)
    multibonusRedeem: Queue,

    @Inject(ApplicationService)
    private readonly applicationService: ApplicationService,
  ) {
    this.multibonusRedeem = multibonusRedeem;
  }

  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  takenTime = (firstTransactionId, start) => {
    const end = new Date();
    console.log(
      `[${firstTransactionId}] Taken time is: ${
        end.getTime() - start.getTime()
      }ms`,
    );
  };

  /**
   * Threshold configuration
   * 1. If greater than threshold, using queue
   * 2. If less than threshold, using regular loop in multibonus consumer
   */
  private async isUsingQueue(trxId, iteration) {
    const maxIterationThreshold =
      (await this.applicationService.getConfig(
        'MULTIBONUS_MAX_ITERATION_THRESHOLD',
      )) ?? 0;

    let usingQueue = false;
    if (maxIterationThreshold > 0) {
      if (iteration > maxIterationThreshold) {
        usingQueue = true;
      }
    }

    console.log(
      `[${trxId}] is using queue? ${usingQueue} (max threshold are: ${maxIterationThreshold})`,
    );

    return usingQueue;
  }

  private async iterationLimit(trxId, curIteration) {
    let iterationCount = curIteration;

    console.log(
      `[${trxId}] Iteration for this transaction are ${iterationCount}`,
    );

    const maxIterationLimit =
      (await this.applicationService.getConfig(
        'MULTIBONUS_MAX_ITERATION_LIMIT',
      )) ?? 5000;

    if (iterationCount > maxIterationLimit) {
      console.log(
        `[${trxId}] Iteration is above limit, force set to limit on ${maxIterationLimit}`,
      );

      iterationCount = maxIterationLimit - 1;
    }

    // -1 for main transaction
    return iterationCount;
  }

  async processMultiRedeem(payload: any, params: Params = null) {
    const start = new Date();

    try {
      let totalIteration = 0;

      /**
       * Update for redeem from UI at 2024-09-09
       * ROLLBACK again
       */
      if (!params.is_parent_transaction || params?.is_from_multibonus == true) {
        // if (params.is_from_multibonus) {
        const parentTransactionId = payload?.parent_transaction_id;
        const currentTrxId = payload?.tracing_master_id;

        console.log(
          `Trx ${currentTrxId} is comming from multi bonus with parent ${parentTransactionId}, skipped !`,
        );

        await this.multiBonusLogService.error(
          payload,
          start,
          `Trx ${currentTrxId} is comming from multi bonus with parent ${parentTransactionId}, skipped !`,
        );

        return false;
      }

      const firstTransactionId = payload?.tracing_master_id;
      const keywordName = payload?.keyword?.eligibility?.name;
      const keywordType = payload?.keyword?.eligibility?.poin_value;
      const bonusType = payload?.bonus_type;
      // const incoming = payload?.incoming;
      const firstOrigin = payload?.origin?.split('.')?.[0];

      const bonusFlexibility = payload?.keyword?.bonus?.[0]?.flexibility;
      const bonusQuantity = payload?.keyword?.bonus?.[0]?.bonus_quantity ?? 1; // default 1 coupon

      // === FIXED MULTIPLE & FLEXIBLE CHECKER ===

      const isC1 = firstOrigin == 'redeem' && keywordType == 'Fixed Multiple';

      const isC2 =
        firstOrigin == 'redeem' &&
        bonusType == 'lucky_draw' &&
        // eslint-disable-next-line prettier/prettier
        (bonusFlexibility == 'Flexible' || keywordType == 'Fixed Multiple');

      const isC3 =
        firstOrigin == 'inject_coupon' &&
        (keywordType == 'Flexible' || keywordType == 'Fixed Multiple');

      const isC4 =
        firstOrigin == 'redeem' &&
        bonusType == 'lucky_draw' &&
        bonusFlexibility == 'Fixed';

      // === END FIXED MULTIPLE & FLEXIBLE CHECKER ===

      // only for selected condition
      if (isC1 || isC2 || isC3 || isC4) {
        console.log(
          `[${firstTransactionId}] Starting multi_redeem with keyword ${keywordName} [${keywordType}] with bonus ${bonusType} [${bonusFlexibility}]`,
        );

        await this.multiBonusLogService.verbose(
          payload,
          {},
          `[${firstTransactionId}] Starting multi_redeem with keyword ${keywordName} [${keywordType}] with bonus ${bonusType} [${bonusFlexibility}]`,
          start,
        );
      }

      /**
       * Start condition
       */

      if (isC1) {
        // Condition 1

        // totalIteration = payload?.incoming?.total_redeem - 1;
        totalIteration = await this.iterationLimit(
          firstTransactionId,
          payload?.incoming?.total_redeem - 1,
        );

        await this.totalIterationLog(
          start,
          payload,
          firstTransactionId,
          totalIteration,
        );

        if (totalIteration < 1) {
          return;
        }

        if (await this.isUsingQueue(firstTransactionId, totalIteration)) {
          const redeemPayload =
            await this.multiBonusPayloadService.buildRedeemPayload(payload, {
              deleted: ['total_redeem'],
              path: 'multi_bonus-redeem_fixed_multiple',
            });

          this.multibonusRedeem
            .add(
              'multibonus-redeem',
              {
                payload: redeemPayload,
                firstTransactionId: firstTransactionId,
                code: 'C1',
                total_iteration: totalIteration,
              },
              { removeOnComplete: true },
            )
            .then((job) => {
              console.log(
                `[${firstTransactionId}] Added to redeem queue with id: #${job.id}`,
              );

              return { job: job.id };
            })
            .catch((err) => {
              console.error(
                `[${firstTransactionId}] An error occured when add to new queue! Error: ${JSON.stringify(
                  err,
                )}`,
              );
            });
        } else {
          for (let i = 1; i <= totalIteration; i++) {
            const redeemPayload =
              await this.multiBonusPayloadService.buildRedeemPayload(
                payload,
                {
                  deleted: ['total_redeem'],
                  path: 'multi_bonus-redeem_fixed_multiple',
                },
                i,
              );

            const kafka_redeem_topic = redeemPayload?.data?.tsel_id
              ? process.env.KAFKA_REDEEM_FMC_TOPIC
              : process.env.KAFKA_REDEEM_LOW_TOPIC;

            this.clientRedeemLow.emit(kafka_redeem_topic, redeemPayload);

            console.log(`[${firstTransactionId}] C1 - Emit-${i}`);

            await this.multiBonusLogService.verbose(
              payload,
              {},
              `[${firstTransactionId}] C1 - Emit-${i} to ${kafka_redeem_topic} with payload ${JSON.stringify(
                redeemPayload?.data,
              )}`,
              start,
            );

            // sleep
            await this.delay(100);
          }
        }
      } else if (isC2) {
        // Condition 2

        // totalIteration = bonusQuantity - 1;
        totalIteration = await this.iterationLimit(
          firstTransactionId,
          bonusQuantity - 1,
        );

        if (bonusFlexibility == 'Flexible') {
          if (payload?.incoming?.total_bonus) {
            totalIteration = payload.incoming.total_bonus - 1;
          }
        }

        await this.totalIterationLog(
          start,
          payload,
          firstTransactionId,
          totalIteration,
        );

        if (totalIteration < 1) {
          return;
        }

        if (await this.isUsingQueue(firstTransactionId, totalIteration)) {
          const injectCouponPayload =
            await this.multiBonusPayloadService.buildPayloadInjectCoupon(
              payload,
            );

          this.multibonusRedeem
            .add(
              'multibonus-coupon',
              {
                payload: injectCouponPayload,
                firstTransactionId: firstTransactionId,
                code: 'C2',
                total_iteration: totalIteration,
              },
              { removeOnComplete: true },
            )
            .then((job) => {
              console.log(
                `[${firstTransactionId}] Added to coupon queue with id: #${job.id}`,
              );

              return { job: job.id };
            })
            .catch((err) => {
              console.error(
                `[${firstTransactionId}] An error occured when add to new queue! Error: ${JSON.stringify(
                  err,
                )}`,
              );
            });
        } else {
          for (let i = 1; i <= totalIteration; i++) {
            const injectCouponPayload =
              await this.multiBonusPayloadService.buildPayloadInjectCoupon(
                payload,
              );

            firstValueFrom(
              this.clientCouponLow.emit(
                process.env.KAFKA_COUPON_LOW_TOPIC,
                injectCouponPayload,
              ),
            );

            console.log(`[${firstTransactionId}] C2 - Emit-${i}`);

            await this.multiBonusLogService.verbose(
              payload,
              {},
              `[${firstTransactionId}] C2 - Emit-${i} to ${
                process.env.KAFKA_COUPON_LOW_TOPIC
              } with payload ${JSON.stringify(injectCouponPayload?.incoming)}`,
              start,
            );

            // sleep
            await this.delay(100);
          }
        }
      } else if (isC3) {
        // Condition 3

        // totalIteration = payload?.incoming?.total_coupon - 1;
        totalIteration = await this.iterationLimit(
          firstTransactionId,
          payload?.incoming?.total_coupon - 1,
        );

        await this.totalIterationLog(
          start,
          payload,
          firstTransactionId,
          totalIteration,
        );

        if (totalIteration < 1) {
          return;
        }

        if (await this.isUsingQueue(firstTransactionId, totalIteration)) {
          const injectCouponPayload =
            await this.multiBonusPayloadService.buildPayloadInjectCoupon(
              payload,
            );

          this.multibonusRedeem
            .add(
              'multibonus-coupon',
              {
                payload: injectCouponPayload,
                firstTransactionId: firstTransactionId,
                code: 'C3',
                total_iteration: totalIteration,
              },
              { removeOnComplete: true },
            )
            .then((job) => {
              console.log(
                `[${firstTransactionId}] Added to coupon queue with id: #${job.id}`,
              );

              return { job: job.id };
            })
            .catch((err) => {
              console.error(
                `[${firstTransactionId}] An error occured when add to new queue! Error: ${JSON.stringify(
                  err,
                )}`,
              );
            });
        } else {
          for (let i = 1; i <= totalIteration; i++) {
            const injectCouponPayload =
              await this.multiBonusPayloadService.buildPayloadInjectCoupon(
                payload,
              );

            this.clientCouponLow.emit(
              process.env.KAFKA_COUPON_LOW_TOPIC,
              injectCouponPayload,
            ),
              console.log(`[${firstTransactionId}] C3 - Emit-${i}`);

            await this.multiBonusLogService.verbose(
              payload,
              {},
              `[${firstTransactionId}] C3 - Emit-${i} to ${
                process.env.KAFKA_COUPON_LOW_TOPIC
              } with payload ${JSON.stringify(injectCouponPayload?.incoming)}`,
              start,
            );

            // sleep
            await this.delay(100);
          }
        }
      } else if (isC4) {
        // Condition 4

        // totalIteration = bonusQuantity - 1;
        totalIteration = await this.iterationLimit(
          firstTransactionId,
          bonusQuantity - 1,
        );

        await this.totalIterationLog(
          start,
          payload,
          firstTransactionId,
          totalIteration,
        );

        if (totalIteration < 1) {
          return;
        }

        if (await this.isUsingQueue(firstTransactionId, totalIteration)) {
          const injectCouponPayload =
            await this.multiBonusPayloadService.buildPayloadInjectCoupon(
              payload,
            );

          this.multibonusRedeem
            .add(
              'multibonus-coupon',
              {
                payload: injectCouponPayload,
                firstTransactionId: firstTransactionId,
                code: 'C4',
                total_iteration: totalIteration,
              },
              { removeOnComplete: true },
            )
            .then((job) => {
              console.log(
                `[${firstTransactionId}] Added to coupon queue with id: #${job.id}`,
              );

              return { job: job.id };
            })
            .catch((err) => {
              console.error(
                `[${firstTransactionId}] An error occured when add to new queue! Error: ${JSON.stringify(
                  err,
                )}`,
              );
            });
        } else {
          for (let i = 1; i <= totalIteration; i++) {
            const injectCouponPayload =
              await this.multiBonusPayloadService.buildPayloadInjectCoupon(
                payload,
              );

            this.clientCouponLow.emit(
              process.env.KAFKA_COUPON_LOW_TOPIC,
              injectCouponPayload,
            );

            console.log(`[${firstTransactionId}] C4 - Emit-${i}`);

            await this.multiBonusLogService.verbose(
              payload,
              {},
              `[${firstTransactionId}] C4 - Emit-${i} to ${
                process.env.KAFKA_COUPON_LOW_TOPIC
              } with payload ${JSON.stringify(injectCouponPayload?.incoming)}`,
              start,
            );

            // sleep
            await this.delay(100);
          }
        }
      } else {
        await this.multiBonusLogService.verbose(
          payload,
          {},
          `[${firstTransactionId}] Not valid trx for Multi Bonus. Skipped !!`,
          start,
        );

        return false;
      }

      /**
       * End condition
       */

      this.takenTime(firstTransactionId, start);

      return true;
    } catch (err) {
      await this.multiBonusLogService.error(
        payload,
        start,
        `An error occured! Error: ${err?.message}`,
        err,
      );

      console.error(err);
      return false;
    }
  }

  private async totalIterationLog(
    start,
    payload,
    firstTransactionId,
    totalIteration,
  ) {
    console.log(
      `[${firstTransactionId}] Transaction iteration are n - 1: ${totalIteration}`,
    );

    await this.multiBonusLogService.verbose(
      payload,
      {},
      `[${firstTransactionId}] Transaction iteration are n - 1: ${totalIteration}`,
      start,
    );
  }

  async processMultiBonus(payload, params: Params = null) {
    const start = new Date();
    const { tracing_master_id: firstTransactionId, keyword, origin } = payload;
    const {
      bonus_type: bonusType,
      flexibility,
      bonus_quantity,
    } = keyword.bonus[0] || {};
    const { name: keywordName, poin_value: keywordType } =
      keyword?.eligibility || {};
    const firstOrigin = origin?.split('.')?.[0];

    try {
      if (
        firstOrigin === 'redeem' &&
        params.is_parent_transaction &&
        !['Fixed Multiple'].includes(keywordType)
      ) {
        const childKeywordName = keyword?.child_keyword?.map((key) => key.name);
        console.log(
          `[${firstTransactionId}] Starting multi_bonus with keyword ${keywordName} [${keywordType}] with bonus ${bonusType} [${flexibility}], child are: ${childKeywordName}`,
        );

        await this.multiBonusLogService.verbose(
          payload,
          {},
          `[${firstTransactionId}] Starting multi_bonus with keyword ${keywordName}, bonus ${bonusType} [${flexibility}] and type ${keywordType}`,
          start,
        );

        if (flexibility === 'Flexible' && bonusType === 'lucky_draw') {
          await this.iterateRedeemCoupun(payload, params);
        } else {
          await this.iterateEmitRedeemMultiBonus(payload);
        }
      } else {
        await this.multiBonusLogService.verbose(
          payload,
          {},
          `[${firstTransactionId}] The keyword ${keywordName} is not processed - multi bonus cannot support [${firstOrigin},${keywordType}] & must be a parent`,
          start,
        );
        return false;
      }

      await this.multiBonusLogService.verbose(
        payload,
        {},
        `[${firstTransactionId}] Finish multi_bonus with keyword ${keywordName}, bonus ${bonusType} and type ${keywordType}`,
        start,
      );

      return true;
    } catch (error) {
      await this.multiBonusLogService.error(
        payload,
        {},
        `[${firstTransactionId}] Multi Bonus error found on keyword ${keywordName}, bonus ${bonusType} and type ${keywordType} --> ${JSON.stringify(
          error,
        )}`,
        start,
      );

      return false;
    }
  }

  async iterateEmitRedeemMultiBonus(payload) {
    const start = new Date();
    const {
      tracing_master_id: firstTransactionId,
      keyword,
      bonus_type: bonusType,
    } = payload;
    const { name: keywordName, poin_value: keywordType } =
      keyword?.eligibility || {};
    const is_main_keyword = keyword?.is_main_keyword != false;
    const is_multi_bonus =
      is_main_keyword && keyword?.child_keyword?.length > 0;

    if (!is_multi_bonus) {
      return;
    }

    const keywordChildren = keyword?.child_keyword;

    if (keywordChildren.length == 0) {
      await this.multiBonusLogService.verbose(
        payload,
        {},
        `[${firstTransactionId}] Keyword child not found in keyword ${keywordName}, bonus ${bonusType} and type ${keywordType}`,
        start,
      );
      return false;
    }

    const optionalRedeemPayload: OptionalRedeemPayload = {
      deleted: ['total_bonus', 'total_redeem', 'total_point'],
      path: 'multi_bonus-redeem',
    };

    for (let i = 0; i < keywordChildren.length; i++) {
      payload = {
        ...payload,
        incoming: { ...payload.incoming, keyword: keywordChildren[i].name },
      };
      const redeemPayload =
        await this.multiBonusPayloadService.buildRedeemPayload(
          payload,
          optionalRedeemPayload,
          null,
          true,
        );

      const kafka_redeem_topic = redeemPayload?.data?.tsel_id
        ? process.env.KAFKA_REDEEM_FMC_TOPIC
        : process.env.KAFKA_REDEEM_LOW_TOPIC;

      this.clientRedeemLow.emit(kafka_redeem_topic, redeemPayload);

      console.log(
        `[${firstTransactionId}] Multi Bonus Child Emit-${i}: ${keywordChildren[i].name}`,
      );

      await this.multiBonusLogService.verbose(
        payload,
        {},
        `[${firstTransactionId}] Multi Bonus - keyword child ${
          keywordChildren[i].name
        } - Emit-${
          i + 1
        } to ${kafka_redeem_topic} with payload ${JSON.stringify(
          redeemPayload?.data,
        )}`,
        start,
      );

      await this.delay(10);
    }

    return true;
  }

  async iterateRedeemCoupun(payload: any, params: Params = null) {
    const start = new Date();
    const { tracing_master_id: firstTransactionId, incoming } = payload;

    if (!firstTransactionId) {
      await this.multiBonusLogService.verbose(
        payload,
        {},
        `[${firstTransactionId}] Transaction ID cannot be null`,
        start,
      );
      return;
    }

    const bonusQuantity = payload?.keyword?.bonus?.[0]?.bonus_quantity ?? 1; // default 1 coupon
    let totalIteration = bonusQuantity - 1;
    if (payload?.incoming?.total_bonus) {
      totalIteration = payload.incoming.total_bonus - 1;
    }

    await this.totalIterationLog(
      start,
      payload,
      firstTransactionId,
      totalIteration,
    );

    if (totalIteration < 1) return;

    for (let i = 1; i <= totalIteration; i++) {
      const injectCouponPayload =
        await this.multiBonusPayloadService.buildPayloadInjectCoupon(payload);

      this.clientCouponLow.emit(
        process.env.KAFKA_COUPON_LOW_TOPIC,
        injectCouponPayload,
      );

      console.log(`[${firstTransactionId}] C2 - Emit-${i}`);

      await this.multiBonusLogService.verbose(
        payload,
        {},
        `[${firstTransactionId}] C2 - Emit-${i} to ${
          process.env.KAFKA_COUPON_LOW_TOPIC
        } with payload ${JSON.stringify(injectCouponPayload?.incoming)}`,
        start,
      );

      if (params?.is_multi_bonus) {
        if (i === 1) {
          await this.iterateEmitRedeemMultiBonus(payload);
        }
      }

      await this.delay(100);
    }
  }
}
