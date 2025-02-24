/* eslint-disable @typescript-eslint/no-empty-function */
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { ExceptionHandler } from '@utils/logger/handler';
import { LoggingData } from '@utils/logger/transport';
import { ObjectId } from 'bson';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import { AccountService } from '@/account/services/account.service';
import {
  BatchProcessLog,
  BatchProcessLogDocument,
} from '@/application/models/batch.log.model';
import {
  BatchProcessLogEnum,
  BatchProcessLogRowDocument,
  BatchProcessRowLog,
} from '@/application/models/batch-row.log.model';
import {
  SystemConfig,
  SystemConfigDocument,
} from '@/application/models/system.config.model';
import { allowedMSISDN } from '@/application/utils/Msisdn/formatter';
import { Channel, ChannelDocument } from '@/channel/models/channel.model';
import { RedeemDTO } from '@/transaction/dtos/redeem/redeem.dto';
import {
  InjectCoupon,
  InjectCouponDocument,
} from '@/transaction/models/inject.coupon.model';
import {
  InjectPoint,
  InjectPointDocument,
} from '@/transaction/models/point/inject.point.model';
import { Coupon2Service } from '@/transaction/services/coupon/coupon2.service';
import { PointService } from '@/transaction/services/point/point.service';
import { RedeemFmcService } from '@/transaction/services/redeem/redeem.fmc.service';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';

import { BATCH_TRANSACTION_SOURCE } from './enum/transaction-source.enum';
import { BatchMessageDto } from './models/batch-message.dto';

@Injectable()
export class BatchStoreDataService {
  private redeemService: RedeemService;
  private redeemFmcService: RedeemFmcService;
  private pointService: PointService;
  private couponService: Coupon2Service;
  private startDate: Date;

  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,
    private readonly configService: ConfigService,
    @Inject(AccountService) private readonly accountService: AccountService,
    @Inject('STORE_DATA_ROW_SERVICE_PRODUCER')
    private readonly clientStoreDataRow: ClientKafka,
    @Inject('DEDUCT_SERVICE_PRODUCER')
    private readonly clientCoupon: ClientKafka,
    @Inject('REDEEM_LOW_SERVICE_PRODUCER')
    private readonly clientRedeemLow: ClientKafka,
    @Inject('REDEEM_FMC_SERVICE_PRODUCER')
    private readonly clientRedeemFmc: ClientKafka,
    @InjectModel(BatchProcessLog.name)
    private batchProcessLog: Model<BatchProcessLogDocument>,
    @InjectModel(BatchProcessRowLog.name)
    private batchProcessRowLog: Model<BatchProcessLogRowDocument>,
    @InjectModel(InjectPoint.name)
    private injectPointModel: Model<InjectPointDocument>,
    @InjectModel(InjectCoupon.name)
    private injectCouponModel: Model<InjectCouponDocument>,
    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,
    @Inject('INJECT_POINT_SERVICE_PRODUCER')
    private readonly clientInjectKafka: ClientKafka,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    redeemService: RedeemService,
    redeemFmcService: RedeemFmcService,
    pointService: PointService,
    couponService: Coupon2Service
  ) {
    this.redeemService = redeemService;
    this.redeemFmcService = redeemFmcService;
    this.pointService = pointService;
    this.couponService = couponService;
    this.startDate = new Date();
  }

  getHello(): string {
    return 'Hello World!';
  }

  async store_data(payload: BatchMessageDto, data, id_process) {
    let row_batch_process;

    const { channel_id } = data;
    const channel_id_code = await this.setChannelId(
      channel_id ? channel_id.toString() : null,
    );
    data.channel_id = channel_id ? data.channel_id : channel_id_code;

    const excludeLog = ['COUPON_DATA_SYNC_BATCH'];

    try {
      switch (payload.origin) {
        case 'REDEEM_BATCH':
          row_batch_process =
            allowedMSISDN(data.msisdn) && !data.tsel_id
              ? await this.batch_redeem(
                  payload,
                  data,
                  BATCH_TRANSACTION_SOURCE.BATCH_REDEEM,
                )
              : await this.batch_redeem_fmc(payload, data);
          break;
        case 'INJECT_POINT_BATCH':
          row_batch_process = await this.inject_point(
            payload,
            data,
            BATCH_TRANSACTION_SOURCE.BATCH_INJECT_POINT,
          );
          break;
        case 'INJECT_COUPON_BATCH':
          row_batch_process = await this.inject_coupon(
            payload,
            data,
            BATCH_TRANSACTION_SOURCE.BATCH_INJECT_COUPON,
          );
          break;
        case 'TRANSFER_PULSA_BATCH':
          row_batch_process =
            allowedMSISDN(data.msisdn) && !data.tsel_id
              ? await this.batch_redeem(
                  payload,
                  data,
                  BATCH_TRANSACTION_SOURCE.TRANSFER_PULSA,
                )
              : await this.batch_redeem_fmc(payload, data);
          break;
        case 'EARNING_POINT':
          row_batch_process = await this.batch_earning_point(payload, data);
          break;
        case 'COUPON_DATA_SYNC_BATCH':
          row_batch_process = await this.batch_coupon_data_sync(payload, data);
          break;
        default:
          break;
      }

      if (!excludeLog.includes(payload.origin)) {
        const rowData = new this.batchProcessRowLog({
          batch_id: id_process,
          filename: payload.file,
          line_data: data,
          status: BatchProcessLogEnum.SUCCESS,
          trace_id: row_batch_process.payload?.trace_id,
          // response_service: row_batch_process,
        });
  
        rowData.save();
      }
    } catch (error) {
      if (!excludeLog.includes(payload.origin)) {
        const rowData = new this.batchProcessRowLog({
          batch_id: id_process,
          filename: payload.file,
          line_data: data,
          status: BatchProcessLogEnum.FAIL,
          error: error.message,
        });
  
        rowData.save();
      }
    }
  }

  async inject_point(
    payload: BatchMessageDto,
    data: InjectPoint,
    batchTransactionSource: BATCH_TRANSACTION_SOURCE,
  ) {
    const { keyword, msisdn, total_point, channel_id } = data;

    const pointPayload = {
      locale: 'en-US',
      total_point: total_point ? Number(total_point) : 0,
      msisdn: msisdn,
      keyword: keyword,
      send_notification: payload?.send_notification ?? true,
      channel_id: channel_id,
      transaction_source: batchTransactionSource,
    };

    const response = await this.pointService.point_inject(
      pointPayload,
      payload.account,
      payload.token,
      false,
    );

    const json = response?.payload?.json;
    if (json) {
      await firstValueFrom(
        this.transactionMasterClient.emit('transaction_master', json),
      ).then(async () => {
        await firstValueFrom(this.clientInjectKafka.emit('inject_point', json));
      });
    }

    return await this.return_res(response);
  }

  async inject_coupon(
    payload: BatchMessageDto,
    data: InjectCoupon,
    batchTransactionSource: BATCH_TRANSACTION_SOURCE,
  ) {
    const { keyword, msisdn, total_coupon, channel_id } = data;

    const couponPayload = {
      total_coupon: total_coupon ? Number(total_coupon) : 0,
      msisdn: msisdn,
      keyword: keyword,
      channel_id: channel_id,
      send_notification: payload?.send_notification ?? true,
      transaction_source: batchTransactionSource,
    };

    const response = await this.couponService.inject_coupon(
      couponPayload,
      payload.account,
      payload.token,
      payload.path,
      false,
    );

    const json = response?.payload;
    if (json) {
      await this.couponService.emit_process(response, {
        token: payload.token,
        path: payload.path,
        data: couponPayload,
        account: payload.account,
        applicationService: null,
        client: this.clientCoupon,
        origin: 'inject_coupon',
        is_request_from_batch: true,
      });
    }

    return await this.return_res(response);
  }

  async batch_redeem(
    payload: BatchMessageDto,
    data: RedeemDTO,
    batchTransactionSource: BATCH_TRANSACTION_SOURCE,
  ) {
    data.send_notification = payload?.send_notification ?? true;

    if (data.total_redeem) {
      data.total_redeem = Number(data.total_redeem);
    }
    // data.total_redeem = data.total_redeem ? Number(data.total_redeem) : 0;

    try {
      const redeemRes = await this.redeemService.redeem_v2_topic(
        data,
        payload.account,
        payload.token,
        payload.path,
        false,
      );
      const traceId = redeemRes?.payload?.trace_id;
      if (traceId) {
        const payloadRedeemEmit = {
          data: { ...data, transaction_source: batchTransactionSource },
          account: payload.account,
          token: payload.token,
          transaction_id: redeemRes.payload.trace_id,
          path: payload.path,
          keyword_priority: 'LOW',
        };
        await firstValueFrom(
          this.clientRedeemLow.emit(
            process.env.KAFKA_REDEEM_LOW_TOPIC,
            payloadRedeemEmit,
          ),
        );
      }

      return await this.return_res(redeemRes);
    } catch (e) {
      console.log(e);
    }
  }

  async batch_redeem_fmc(payload: BatchMessageDto, data) {
    data.send_notification = payload?.send_notification ?? true;

    if (data.total_redeem) {
      data.total_redeem = Number(data.total_redeem);
    }
    // data.total_redeem = data.total_redeem ? Number(data.total_redeem) : 0;
    try {
      const redeemRes = await this.redeemFmcService.redeemV2(
        data,
        payload.account,
        payload.token,
        payload.path,
        false,
      );
      const traceId = redeemRes?.payload?.trace_id;
      if (traceId) {
        const payloadRedeemEmit = {
          data: data,
          account: payload.account,
          token: payload.token,
          transaction_id: redeemRes.payload.trace_id,
          path: payload.path,
        };
        await firstValueFrom(
          this.clientRedeemFmc.emit('redeem_fmc', payloadRedeemEmit),
        );
      }

      return await this.return_res(redeemRes);
    } catch (e) {
      console.log(e);
    }
  }

  async batch_earning_point(payload: BatchMessageDto, data) {
    try {
      const response = await this.pointService.earning(data, payload.token, 0, true);
      return await this.return_res(response);
    } catch (error) {
      console.log(error);
    }
  }

  async return_res(response) {
    if (response.code !== 'S00000') {
      // throw new BadRequestException(response.message);
      console.log(response);
    } else {
      return response;
    }
  }

  async batchLogger(payload, message, level: string, start: Date, statusCode) {
    const end = new Date();
    await this.exceptionHandler.handle({
      level: level,
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.batch_id,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      statusCode: statusCode,
      payload: {
        service: 'batch',
        user_id: payload?.account,
        method: 'kafka',
        url: 'batch',
        step: `batch ${message}`,
        param: payload,
        result: payload,
      } satisfies LoggingData,
    });
  }

  async getDefaultChannel(): Promise<string> {
    const config = await this.systemConfigModel.findOne({
      param_key: 'DEFAULT_CHANNEL_TRANSACTION',
    });
    const channel_code = await this.channelModel.findOne({
      _id: new ObjectId(config.param_value.toString()),
    });
    return channel_code.code;
  }

  async setChannelId(value: string): Promise<string> {
    const excludeChannelId = ['', null, undefined];
    if (excludeChannelId.includes(value)) {
      return await this.getDefaultChannel();
    } else {
      return value;
    }
  }

  /**
   * Batch Coupon Data Sync
   */
  async batch_coupon_data_sync(payload: BatchMessageDto, data) {
    const { keyword, msisdn } = data;
    try {
      await this.couponService.computeCouponSummary(msisdn, keyword);
    } catch (error) {
      console.log(error);
    }

  }
}
