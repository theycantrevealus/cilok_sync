import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { MerchantService } from '@deduct/services/merchant.service';
import {
  CACHE_MANAGER,
  CacheStore,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { ReportingServiceResult } from '@reporting_generation/model/reporting_service_result';
import { RedisDataKey } from '@slredis/const/redis.key';
import {
  TransactionMaster,
  TransactionMasterDocument,
} from '@transaction_master/models/transaction_master.model';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount } from '@utils/logger/transport';
import { LoggingData } from '@utils/logger/transport';
import { UtilsService } from '@utils/services/utils.service';
import mongoose, { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';

import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  KeywordNotification,
  KeywordNotificationDocument,
} from '@/keyword/models/keyword.notification.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';
import { PointService } from '@/transaction/services/point/point.service';

import {
  AuctionBidder,
  AuctionBidderDocument,
} from './models/auction_bidder.model';

const moment = require('moment-timezone');

@Injectable()
export class AuctionService {
  constructor(
    @InjectModel(AuctionBidder.name)
    private bidderModel: Model<AuctionBidderDocument>,
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
    @InjectModel(TransactionMaster.name)
    private transactionMasterModel: Model<TransactionMasterDocument>,
    @InjectModel(KeywordNotification.name)
    private keywordNotificationModel: Model<KeywordNotificationDocument>,
    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(NotificationContentService)
    private notifService: NotificationContentService,
    @Inject(MerchantService)
    private merchantService: MerchantService,
    @Inject(AccountService)
    private readonly accountService: AccountService,
    @Inject(UtilsService)
    private utilsService: UtilsService,
    @Inject(PointService)
    private pointService: PointService,
    @Inject(ApplicationService)
    private applicationService: ApplicationService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(CACHE_MANAGER)
    private cacheManager: CacheStore,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly refundClient: ClientKafka,
  ) {}

  async processAuction(payload) {
    const startTime = new Date();
    const eventTime = await this.getEventTime(payload);
    console.log(`auction ${payload?.tracing_master_id} start process`);
    console.log(
      `${payload?.keyword?.eligibility?.name} eventTime ->`,
      eventTime,
    );
    if (eventTime) {
      // get top bidder
      const topBidder: any = await this.getRedisTopBidder(
        payload?.keyword?.eligibility?.name,
        eventTime,
      );
      if (topBidder) {
        // check is top bidder
        if (topBidder.transaction_id === payload?.tracing_master_id) {
          /**
           * jika top bidder
           * refund transaksi top bidder sebelumnya
           */
          const listBidder = await this.getTopBidder(
            payload?.keyword?.eligibility?.name,
            eventTime,
            2,
          );
          console.log('listBidder', listBidder);
          for (let index = 0; index < listBidder.length; index++) {
            const bidder = listBidder[index];
            if (
              bidder.transaction_id !== payload?.tracing_master_id &&
              bidder.refund === null
            ) {
              console.log(
                `auction ${payload?.tracing_master_id} refund transaksi outbid`,
              );
              console.log(
                `auction ${payload?.tracing_master_id} transaksi yang direfund`,
                bidder,
              );
              this.loggerAuction(
                startTime,
                payload,
                true,
                `refund outbid ${JSON.stringify(bidder)}`,
              );
              // refund transaksi
              const refund = await this.refundTransaction(
                bidder.transaction_id,
              );
              console.log(
                `auction ${payload?.tracing_master_id} refund data`,
                refund,
              );
              await this.bidderModel.updateOne(
                {
                  transaction_id: bidder.transaction_id,
                },
                {
                  refund: refund,
                },
              );
              // kirim notifikasi outbid
              await this.notificationOutbid(
                bidder.transaction_id,
                payload,
                bidder,
              );
              break;
              // exit loop
            }
          }
          console.log(
            `auction ${payload?.tracing_master_id} pemenang sementara`,
          );
          // lanjut ke notification
          this.loggerAuction(
            startTime,
            payload,
            true,
            'CURRENT TRX TOP BIDDER',
          );
          await this.notificationAuction(payload, true);
        } else {
          /**
           * jika bukan top bidder
           * maka refund transaksi ini
           */
          console.log(
            `auction ${payload?.tracing_master_id} outbid, kalah dengan transaksi di eligi`,
          );
          this.loggerAuction(startTime, payload, false, 'OUTBID');
          await this.notificationAuction(payload, false);
        }
      } else {
        // top bidder empty, belum ada yang nge bid
        // save to redis
        await this.setRedisTopBidder(
          payload?.tracing_master_id,
          payload?.keyword?.eligibility?.name,
          payload?.keyword?.eligibility?.keyword_schedule,
          payload?.incoming?.msisdn,
          eventTime,
          payload?.incoming?.total_redeem,
        );
        // save to db
        await this.saveBidder(
          payload?.tracing_master_id,
          payload?.keyword?.eligibility?.name,
          payload?.keyword?.eligibility?.keyword_schedule,
          payload?.incoming?.msisdn,
          eventTime,
          payload?.incoming?.total_redeem,
        );
        // lanjut ke notification
        await this.notificationAuction(payload, true);
      }
    } else {
      // lanjut ke notification
      console.log(`auction ${payload?.tracing_master_id} event time not found`);
      this.loggerAuction(startTime, payload, false, 'EVENT TIME NOT FOUND');
      await this.notificationAuction(payload, false, 'EVENT TIME NOT FOUND');
    }
  }

  async getEventTime(payload) {
    let result = null;

    // check keyword type
    const keywordType = payload?.keyword?.eligibility?.keyword_schedule;
    if (keywordType === 'Daily') {
      result = payload?.keyword?.eligibility?.start_period;
    } else {
      // keywordType = 'SHIFT
      for (
        let index = 0;
        index < payload?.keyword?.eligibility?.keyword_shift.length;
        index++
      ) {
        const shift = payload?.keyword?.eligibility?.keyword_shift[index];
        if (shift.status) {
          result = shift.from;
          break;
        }
      }
    }

    return result;
  }

  async notificationAuction(payload, success, message = 'OUTBID') {
    if (success) {
      // auction success
      const origin = payload.origin + '.' + 'auction_success';
      payload.origin = origin;

      const notifGroup = NotificationTemplateConfig.REDEEM_SUCCESS_CUSTOMER;
      payload.notification = await this.notifService.getNotificationTemplate(
        notifGroup,
        payload,
      );
      return this.notificationClient.emit(
        process.env.KAFKA_NOTIFICATION_TOPIC,
        payload,
      );
    } else {
      // auction fail
      const origin = payload.origin + '.' + 'auction_fail';
      payload.origin = origin;
      payload.error_message = message;

      const notifGroup = NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER;
      payload.notification = await this.notifService.getNotificationTemplate(
        notifGroup,
        payload,
      );
      return await this.handleRefundPoint(payload, message);
    }
  }

  async notificationFailedTransaction(payload, message = 'deduct fail') {
    const origin = payload.origin + '.' + 'auction_fail';
    payload.origin = origin;
    payload.error_message = message;

    // const notifGroup = NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER;
    // payload.notification = await this.notifService.getNotificationTemplate(
    //   notifGroup,
    //   payload,
    // );
    return this.notificationClient.emit(
      process.env.KAFKA_NOTIFICATION_TOPIC,
      payload,
    );
  }

  private async handleRefundPoint(payload: any, refund_reason: string) {
    let getMerchant = null;
    const refund = await this.merchantService
      .getMerchantSelf(payload.token)
      .then((res) => {
        const pin = res?.payload?.merchant_config?.authorize_code?.refund;
        getMerchant = true;
        return {
          locale: payload?.payload?.deduct?.locale,
          transaction_no: payload?.payload?.deduct?.transaction_no,
          type: payload?.payload?.deduct?.type,
          // Reason TBC
          reason: refund_reason ? refund_reason : '',
          remark: `Refund ${payload?.keyword?.eligibility?.program_title_expose}`,
          authorize_pin: pin,
          member_id: payload?.payload?.deduct?.member_id,
          realm_id: payload?.payload?.deduct?.realm_id,
          branch_id: payload?.payload?.deduct?.branch_id,
          merchant_id: payload?.payload?.deduct?.merchant_id,
          __v: 0,
        };
      })
      .catch((e) => {
        console.log('error get merchant', e);
        getMerchant = false;
      });

    if (getMerchant) {
      payload.payload.refund = refund;
      payload.incoming.ref_transaction_id =
        payload?.payload?.deduct?.transaction_no;

      // send to consumer refund
      this.refundClient.emit(process.env.KAFKA_REFUND_TOPIC, payload);
    }
  }

  async rollbackAuction(payload) {
    // ketika deduct failed maka masuk kesini
    const startTime = new Date();
    const eventTime = await this.getEventTime(payload);
    console.log(
      `${payload?.keyword?.eligibility?.name} eventTime ->`,
      eventTime,
    );
    if (eventTime) {
      const topBidder: any = await this.getRedisTopBidder(
        payload?.keyword?.eligibility?.name,
        eventTime,
      );
      if (topBidder) {
        // check is top bidder
        if (topBidder.transaction_id === payload?.tracing_master_id) {
          /**
           * jika top bidder
           * update top bidder redis menjadi transaksi sebelumnya
           */
          const listBidder = await this.getTopBidder(
            payload?.keyword?.eligibility?.name,
            eventTime,
            2,
          );
          // check jika sudah lebih dari user ini yang nge bid
          if (listBidder.length > 1) {
            for (let index = 0; index < listBidder.length; index++) {
              const bidder = listBidder[index];
              if (bidder.transaction_id !== payload?.tracing_master_id) {
                console.log(
                  `auction ${payload?.tracing_master_id} ganti top bidder dangan transaksi sebelumnya`,
                  bidder,
                );
                // save to redis
                await this.setRedisTopBidder(
                  bidder.tracing_master_id,
                  bidder.keyword,
                  bidder.keyword_type,
                  bidder.msisdn,
                  eventTime,
                  bidder.bid_point,
                );
                break;
                // exit loop
              }
            }
          } else {
            console.log(
              `auction ${payload?.tracing_master_id} delete top bidder`,
            );
            /**
             * jika hanya user ini yang bid
             * maka hapus redis dan collection
             */
            await this.deleteRedisTopBidder(
              payload?.keyword?.eligibility?.name,
              eventTime,
            );
            this.loggerAuction(startTime, payload, false, 'DELETE BIDDER');
          }
        }
      }
    }

    console.log(`auction ${payload?.tracing_master_id} deduct fail`);
    // lanjut ke notification
    await this.deleteBidder(payload?.tracing_master_id);
    this.loggerAuction(startTime, payload, false, 'DEDUCT FAIL');
    await this.notificationFailedTransaction(payload, 'EVENT TIME NOT FOUND');
  }

  async getRedisTopBidder(keyword, event_time) {
    const key = `${RedisDataKey.AUCTION}-${keyword}_${event_time.replace(
      / /g,
      '_',
    )}`;
    const topBidder = await this.cacheManager.get(key);
    console.log('top bidder', topBidder);
    return topBidder;
  }

  async setRedisTopBidder(
    transaction_id,
    keyword,
    keyword_type,
    msisdn,
    event_time,
    bid_point,
    bid_time = null,
  ) {
    const key = `${RedisDataKey.AUCTION}-${keyword}_${event_time.replace(
      / /g,
      '_',
    )}`;
    const value = {
      transaction_id,
      keyword,
      keyword_type,
      msisdn,
      event_time,
      bid_point,
      bid_at: bid_time ? bid_time : moment.utc().toDate(),
    };
    await this.cacheManager.set(key, value);
  }

  async deleteRedisTopBidder(keyword, event_time) {
    const key = `${RedisDataKey.AUCTION}-${keyword}_${event_time.replace(
      / /g,
      '_',
    )}`;
    await this.cacheManager.del(key);
  }

  async getTopBidder(keyword, event_time, limit: number = null) {
    /**
     * get list top bidder berdasarkan keyword dan event time
     * sorting berdasarkan bid point descending
     */
    const pipeline: any = [
      {
        $match: {
          keyword: {
            $eq: keyword,
          },
          event_time: {
            $eq: moment(event_time).toDate(),
          },
        },
      },
      {
        $sort: {
          bid_point: -1,
        },
      },
    ];

    if (limit !== null) {
      pipeline.splice(2, 0, { $limit: limit });
    }

    return await this.bidderModel.aggregate(pipeline, (err, result) => {
      console.log('error get list top bidder', err);
      return result;
    });
  }

  async getTotalBidder(keyword, event_time) {
    const pipeline: any = [
      {
        $match: {
          keyword: {
            $eq: keyword,
          },
          event_time: {
            $eq: moment(event_time).toDate(),
          },
        },
      },
      {
        $count: 'total_bidder',
      },
    ];

    const [total] = await this.bidderModel.aggregate(
      pipeline,
      (err, result) => {
        console.log('error get total bidder', err);
        return result;
      },
    );

    return total?.total_bidder ?? 0;
  }

  async saveBidder(
    transaction_id,
    keyword,
    keyword_type,
    msisdn,
    event_time,
    bid_point,
  ) {
    const data = {
      transaction_id,
      keyword,
      keyword_type,
      msisdn,
      event_time,
      bid_point,
      bid_at: moment.utc().toDate(),
    };
    const bidder = new this.bidderModel(data);
    await bidder.save();
  }

  async deleteBidder(transaction_id) {
    await this.bidderModel
      .findOneAndDelete({ transaction_id })
      .catch((e) => {
        throw new Error(e.message);
      })
      .then(() => {
        console.log('Data Bidder delete success');
      });
  }

  async refundTransaction(transaction_id) {
    // get transaction data
    const trxData = await this.transactionMasterModel.findOne({
      transaction_id,
    });

    if (trxData) {
      const signIn = await this.utilsService.getToken();
      const token = `${signIn.payload.access_token}`;
      const account = await this.accountService.authenticateBusiness({
        auth: 'Bearer ' + token,
      });

      const request: any = {
        msisdn: trxData.msisdn,
        keyword: trxData.keyword,
        ref_transaction_id: trxData.transaction_id,
      };

      const result = await this.pointService.refundPointEmit(
        'auction',
        request,
        account,
        token,
      );

      return result;
    }
  }

  async loggerAuction(start, payload, isSuccess, info = null) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    console.log('request taken time : ', takenTime);
    this.exceptionHandler.handle({
      level: 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload?.tracing_id,
      config: this.configService,
      taken_time: takenTime,
      statusCode: isSuccess ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
      payload: {
        transaction_id: payload?.tracing_id,
        statusCode: isSuccess ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
        method: 'kafka',
        url: '/v1/redeem',
        service: 'AUCTION',
        step: payload?.bonus_type,
        taken_time: takenTime,
        param: {
          ...payload,
        },
        result: {
          msisdn: payload?.incoming?.msisdn,
          message: info,
          trace: payload?.tracing_id,
          user_id: new IAccount(payload.account),
        },
      } satisfies LoggingData,
    });
  }

  async notificationOutbid(transaction_id, payload, topBidder) {
    // start notif outbid
    const notifGroupOutbid =
      NotificationTemplateConfig.NOTIFICATION_GROUP_AUCTION_OUTBID;
    const notificationTemplateOutbid =
      await this.notifService.getNotificationTemplate(
        notifGroupOutbid,
        payload,
      );

    // get notif content from keyword notification
    const lov1 = await this.lovModel.findOne({ group_name: notifGroupOutbid });
    const keywordNotificationOutbid = payload?.keyword?.notification.find(
      (item) => item.notif_type === lov1?.set_value,
    );
    if (keywordNotificationOutbid) {
      for (const item of notificationTemplateOutbid) {
        item.template_content = keywordNotificationOutbid?.notification_content;
      }
    }
    // end notif outbid

    // start notif refund
    const notifGroupRefund =
      NotificationTemplateConfig.NOTIFICATION_GROUP_AUCTION_REFUND;
    const notificationTemplateRefund =
      await this.notifService.getNotificationTemplate(
        notifGroupRefund,
        payload,
      );

    // get notif content from keyword notification
    const lov2 = await this.lovModel.findOne({ group_name: notifGroupRefund });
    const keywordNotificationRefund = payload?.keyword?.notification.find(
      (item) => item.notif_type === lov2?.set_value,
    );
    if (keywordNotificationRefund) {
      for (const item of notificationTemplateRefund) {
        item.template_content = keywordNotificationRefund?.notification_content;
      }
    }
    // end notif refund

    const redeem = await this.redeemModel.findOne({
      master_id: transaction_id,
    });

    const eventTime = await this.getEventTime(payload);
    const totalBidder = await this.getTotalBidder(
      payload?.keyword?.eligibility?.name,
      eventTime,
    );
    const top2Bidder = await this.getTopBidder(
      payload?.keyword?.eligibility?.name,
      eventTime,
      2,
    );

    const payloadNotification = {
      origin: `redeem.eligilibity_success_deduct_success_auction_success`,
      tracing_id: transaction_id,
      incoming: redeem,

      customer: {
        msisdn: topBidder?.msisdn,
      },
      keyword: payload?.keyword,
      programName: payload?.program_name,
      notification: [
        ...notificationTemplateOutbid,
        ...notificationTemplateRefund,
      ],
      auction: {
        auction_prize:
          payload.keyword.bonus[0]?.auction_prize_name ?? 'undefined',
        poinBidding: topBidder?.bid_point,
        top_bidder: top2Bidder,
        total_bidder: totalBidder,
      },
    };

    console.log('payloadNotification', payloadNotification);

    this.notificationClient.emit(
      process.env.KAFKA_NOTIFICATION_TOPIC,
      payloadNotification,
    );
  }

  public async cronWinningNotification() {
    const startTime = new Date();
    const cronResult = new ReportingServiceResult({ is_error: false });
    const templateGroupAucWinning =
      NotificationTemplateConfig.NOTIFICATION_GROUP_AUCTION_WINNING;

    const payloadNotification = {
      origin: `cron.notificationauctionwinning`,
      keyword: null,
      customer: { msisdn: null },
      incoming: { send_notification: true },
      tracing_id: false,
      tracing_master_id: false,
      auction: { auction_prize: null },
      notification: null,
    };

    try {
      const currentUtcDate = moment().utc().toDate();
      console.log('currentUtcDate', currentUtcDate);

      const [
        expiredDailykeywords,
        expiredShiftKeywords,
        auctionWinningCodeIdentifier,
      ] = await Promise.all([
        this.getDailyTypeExpiredAuction(currentUtcDate),
        this.getShiftTypeExpiredAuction(currentUtcDate),
        this.accountService.getSystemConfig('AUCTION_WINNING_CODE_IDENTIFIER'),
      ]);

      const expiredAuctionKeywords = [
        ...expiredDailykeywords,
        ...expiredShiftKeywords,
      ];
      console.log('expiredAuctionKeywords', expiredAuctionKeywords);

      for (const expiredAuctionKeyword of expiredAuctionKeywords) {
        const { parent_keyword: parentKeyword } = expiredAuctionKeyword;

        payloadNotification.keyword = parentKeyword;
        payloadNotification.auction.auction_prize =
          parentKeyword.bonus[0]?.auction_prize_name ?? 'none';

        const [topBidder, notificationTemplate] = await Promise.all([
          this.getTopBidderByCron(
            payloadNotification.keyword.eligibility.name,
            expiredAuctionKeyword.event_time.toString(),
          ) as any,
          this.notifService.getNotificationTemplate(
            templateGroupAucWinning,
            payloadNotification,
          ),
        ]);
        console.log('TOP BIDDER', topBidder);

        payloadNotification.customer.msisdn = topBidder?.msisdn;
        payloadNotification.notification =
          this.reformatAuctionNotificationContent(
            { keyword: parentKeyword, notificationTemplate },
            auctionWinningCodeIdentifier,
          );

        await Promise.all([
          this.setWinner(topBidder.transaction_id),
          this.setAlreadySendNotifBecomeTrue(
            payloadNotification.keyword.eligibility.name,
            expiredAuctionKeyword.event_time,
          ),
        ]);

        console.log('PAYLOAD NOTIF', payloadNotification?.notification);

        await firstValueFrom(
          this.notificationClient.emit(
            process.env.KAFKA_NOTIFICATION_TOPIC,
            payloadNotification,
          ),
        );
      }

      cronResult.message = `Cron winning notification success`;
      console.log('cronResult', cronResult);
      this.loggerAuction(startTime, cronResult, true, cronResult.message);
    } catch (error) {
      console.log('ERROR cronWinningNotification');
      console.log(error);
      console.log(error.message);
      cronResult.is_error = true;
      cronResult.message = error.message;
      cronResult.stack = error.stack;
      this.loggerAuction(startTime, cronResult, false, cronResult.message);
    }
  }

  private async getDailyTypeExpiredAuction(currentUtcDate: any) {
    const winner = await this.bidderModel
      .aggregate([
        {
          $match: {
            is_already_send_notif: false,
            refund: null,
            keyword_type: 'Daily',
          },
        },
        { $group: { _id: '$keyword', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } },
        {
          $lookup: {
            from: 'keywords',
            let: { keywordName: '$keyword' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$eligibility.name', '$$keywordName'] },
                },
              },
              {
                $project: {
                  _id: 1,
                  'eligibility.name': 1,
                  'eligibility.keyword_schedule': 1,
                  'eligibility.keyword_shift': 1,
                  'eligibility.start_period': 1,
                  'eligibility.end_period': 1,
                  bonus: 1,
                  notification: 1,
                },
              },
            ],
            as: 'parent_keyword',
          },
        },
        {
          $match: {
            'parent_keyword.eligibility.end_period': { $lt: currentUtcDate },
          },
        },
        { $unwind: '$parent_keyword' },
      ])
      .allowDiskUse(true)
      .exec();

    return winner;
  }

  private async getShiftTypeExpiredAuction(currentUtcDate) {
    const winner = await this.bidderModel
      .aggregate([
        {
          $match: {
            is_already_send_notif: false,
            refund: null,
            keyword_type: 'Shift',
          },
        },
        {
          $lookup: {
            from: 'keywords',
            let: { keywordName: '$keyword' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$eligibility.name', '$$keywordName'],
                  },
                },
              },
              {
                $addFields: {
                  'eligibility.keyword_shift': {
                    $map: {
                      input: '$eligibility.keyword_shift',
                      as: 'shift',
                      in: {
                        from: {
                          $dateToString: {
                            format: '%Y-%m-%dT%H:%M:%SZ',
                            date: {
                              $cond: {
                                if: {
                                  $isNumber: '$$shift.from',
                                },
                                then: {
                                  $toDate: '$$shift.from',
                                },
                                else: {
                                  $toDate: '$$shift.from',
                                },
                              },
                            },
                            timezone: 'UTC',
                          },
                        },
                        to: {
                          $dateToString: {
                            format: '%Y-%m-%dT%H:%M:%SZ',
                            date: {
                              $cond: {
                                if: {
                                  $isNumber: '$$shift.to',
                                },
                                then: {
                                  $toDate: '$$shift.to',
                                },
                                else: {
                                  $toDate: '$$shift.to',
                                },
                              },
                            },
                            timezone: 'UTC',
                          },
                        },
                      },
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  'eligibility.name': 1,
                  'eligibility.keyword_schedule': 1,
                  'eligibility.keyword_shift': 1,
                  'eligibility.start_period': 1,
                  'eligibility.end_period': 1,
                  bonus: 1,
                  notification: 1,
                },
              },
            ],
            as: 'parent_keyword',
          },
        },
        { $unwind: '$parent_keyword' },
        {
          $addFields: {
            keyword_shift_matched: {
              $filter: {
                input: '$parent_keyword.eligibility.keyword_shift',
                as: 'shift',
                cond: {
                  $eq: [
                    '$$shift.from',
                    {
                      $dateToString: {
                        format: '%Y-%m-%dT%H:%M:%SZ',
                        date: '$event_time',
                        timezone: 'UTC',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        { $unwind: '$keyword_shift_matched' },
        {
          $match: {
            $expr: {
              $lt: [
                { $toDate: '$keyword_shift_matched.to' },
                { $toDate: currentUtcDate },
              ],
            },
          },
        },
      ])
      .allowDiskUse(true)
      .exec();

    return winner;
  }

  private async setWinner(transactionId: string): Promise<void> {
    try {
      await this.bidderModel.updateOne(
        { transaction_id: transactionId },
        { is_winning: true },
      );
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  private async setAlreadySendNotifBecomeTrue(
    keyword: string,
    eventTime: any,
  ): Promise<void> {
    try {
      await this.bidderModel.updateMany(
        { keyword, event_time: eventTime },
        { is_already_send_notif: true },
      );
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Get top bidder yg dipanggil oleh cron
   * cek dulu data top bidder di redis ada atau tidak
   * jika tidak ada maka ambil ke collection
   */
  private async getTopBidderByCron(keywordName: string, eventTime: any) {
    try {
      const topBidderFromRedis = await this.getRedisTopBidder(
        keywordName,
        eventTime.toString(),
      );

      if (topBidderFromRedis) {
        return topBidderFromRedis;
      }

      const [topBidderFromDb] = await this.getTopBidder(
        keywordName,
        eventTime,
        1,
      );

      return topBidderFromDb;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  private reformatAuctionNotificationContent(
    payload: { keyword: any; notificationTemplate: any },
    auctionWinningCodeIdentifier: string,
  ) {
    try {
      const { keyword, notificationTemplate } = payload;

      const keywordNotification: Array<any> = keyword.notification;
      const notificationContent = keywordNotification.find(
        (item) => item.code_identifier == auctionWinningCodeIdentifier,
      )?.notification_content;

      console.log('NOTIF CONTENT', notificationContent);

      if (!notificationContent) {
        return notificationTemplate;
      }

      for (const item of notificationTemplate) {
        item.template_content = notificationContent;
      }

      return notificationTemplate;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
