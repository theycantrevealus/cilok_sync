import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueProgress,
  Process,
  Processor,
} from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import mongoose, { Connection, Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';

import { MultiBonusLogService } from '..//multi_bonus.log.service';
import { MultiBonusPayloadService } from '..//multi_bonus.payload.service';

@Processor(process.env.REDIS_MULTI_BONUS)
export class RedeemProcessor {
  private connection: Connection;
  private readonly lovModel: Model<LovDocument>;

  constructor(
    @InjectConnection()
    connection: Connection,

    // @InjectModel(Lov.name)
    // lovModel: Model<LovDocument>,

    @Inject(MultiBonusPayloadService)
    private readonly multiBonusPayloadService: MultiBonusPayloadService,

    @Inject(MultiBonusLogService)
    private readonly multiBonusLogService: MultiBonusLogService,

    @Inject('REDEEM_LOW_SERVICE_PRODUCER')
    private readonly clientRedeemLow: ClientKafka,

    @Inject('COUPON_LOW_SERVICE_PRODUCER')
    private readonly clientCouponLow: ClientKafka,

    @Inject(TransactionOptionalService)
    private readonly transactionOptionalService: TransactionOptionalService,
  ) {
    this.connection = connection;
    // this.lovModel = lovModel;
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(`Processing job #${job.id} of type ${job.name}!`);
  }

  @OnQueueProgress()
  onProgress(job: Job) {
    console.log(`Job #${job.id} of type ${job.name} is in progress!`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    console.log(`Job #${job.id} of type ${job.name} is completed!`);
  }

  @OnQueueFailed()
  onFailed(job: Job) {
    //
  }

  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  takenTime = (firstTransactionId, start) => {
    const end = new Date();
    console.log(
      `[${firstTransactionId}] Taken queue time is: ${
        end.getTime() - start.getTime()
      }ms`,
    );
  };

  @Process('multibonus-redeem')
  async multibonusRedeem(job: Job) {
    const start = new Date();

    const jobId = job?.toJSON().id;
    const conditionCode = job.data.code;

    const payload = {
      ...job.data.payload,
    };
    const firstTransactionId = job.data.firstTransactionId;
    const totalIteration = job.data.total_iteration;

    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'REDEEM';
    response.trace_custom_code = 'TRX';

    for (let i = 1; i <= totalIteration; i++) {
      // === GENERATE NEW TRX_ID ===
      const newTrxId = this.transactionOptionalService.getTracingId(
        payload.data,
        response,
      );

      payload.transaction_id = newTrxId;
      // === GENERATE NEW TRX_ID ===

      const kafka_redeem_topic = payload?.data?.tsel_id
        ? process.env.KAFKA_REDEEM_FMC_TOPIC
        : process.env.KAFKA_REDEEM_LOW_TOPIC;

      firstValueFrom(this.clientRedeemLow.emit(kafka_redeem_topic, payload));

      console.log(
        `[${firstTransactionId}] #${jobId} ${conditionCode} - Emit-${i}`,
      );

      await this.multiBonusLogService.verbose(
        payload,
        {},
        `[${firstTransactionId}] #${jobId} ${conditionCode} - Emit-${i} to ${kafka_redeem_topic} with payload ${JSON.stringify(
          payload?.data,
        )}`,
        start,
      );

      // sleep
      await this.delay(100);
    }

    this.takenTime(firstTransactionId, start);
  }

  @Process('multibonus-coupon')
  async multibonusCoupon(job: Job) {
    const start = new Date();

    const jobId = job?.toJSON().id;
    const conditionCode = job.data.code;

    const payload = {
      ...job.data.payload,
    };
    const firstTransactionId = job.data.firstTransactionId;
    const totalIteration = job.data.total_iteration;

    console.log(
      `[${firstTransactionId}] #${jobId} Total iteration are: ${totalIteration}`,
    );

    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'REDEEM';
    response.trace_custom_code = 'TRX';

    for (let i = 1; i <= totalIteration; i++) {
      // === GENERATE NEW TRX_ID ===
      const newTrxId = this.transactionOptionalService.getTracingId(
        payload.incoming,
        response,
      );

      payload.transaction_id = newTrxId;
      // === GENERATE NEW TRX_ID ===

      firstValueFrom(
        this.clientCouponLow.emit(process.env.KAFKA_COUPON_LOW_TOPIC, payload),
      );

      console.log(
        `[${firstTransactionId}] #${jobId} ${conditionCode} - Emit-${i}`,
      );

      await this.multiBonusLogService.verbose(
        payload,
        {},
        `[${firstTransactionId}] #${jobId} ${conditionCode} - Emit-${i} to ${
          process.env.KAFKA_COUPON_LOW_TOPIC
        } with payload ${JSON.stringify(payload?.incoming)}`,
        start,
      );

      // sleep
      await this.delay(100);
    }

    this.takenTime(firstTransactionId, start);
  }
}
