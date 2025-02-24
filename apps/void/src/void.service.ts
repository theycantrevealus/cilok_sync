import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { Model } from 'mongoose';

import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  KeywordNotification,
  KeywordNotificationDocument,
} from '@/keyword/models/keyword.notification.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import { OTPService } from '@/otp/services/otp.service';
import { ViewPointQueryDTO } from '@/transaction/dtos/point/view_current_balance/view.current.balance.property.dto';
import { CouponService } from '@/transaction/services/coupon/coupon.service';
import { EauctionService } from '@/transaction/services/eauction/eauction.service';
import { PointService } from '@/transaction/services/point/point.service';

import { AuctionService } from '../../auction/src/auction.service';
import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import {
  NOTIFICATION_VOID_FAILED_LOV,
  NOTIFICATION_VOID_SUCCESS_LOV,
} from './consts/void.notif.const';

const moment = require('moment-timezone');

@Injectable()
export class VoidKafkaConsumerService {
  constructor(
    private applicationService: ApplicationService,
    private couponService: CouponService,
    private notifService: NotificationContentService,
    private otpService: OTPService,
    private pointService: PointService,
    private auctionService: AuctionService,
    private eAuctionService: EauctionService,

    @InjectModel(KeywordNotification.name)
    private keywordNotificationModel: Model<KeywordNotificationDocument>,

    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,

    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(LovService)
    private readonly lovService: LovService,
  ) {}

  async processPoinVoidKeyword(payload: any) {
    const start = new Date();
    await this.pointService
      .getCustomerTselPointBalance(payload.payload.void.msisdn, payload.token)
      .then(async (res) => {
        console.error('getCustomerTselPointBalance success: ', res);

        if (!res) res = 0;
        payload.payload.void.amount_point_owned = res;

        await this.sendVoidSuccessNotification(payload);
      })
      .catch(async (err: any) => {
        console.error('getCustomerTselPointBalance failed!', err?.message);
        await this.loggingVoid(
          payload,
          err,
          start,
          'error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );

        await this.sendVoidFailedNotification({
          ...payload,
          reason: 'Unable to get Customer Point Balance', // err?.message,
        });
      });
  }

  async sendVoidSuccessNotification(payload: any) {
    payload.origin = `${payload.origin}.void_success`;
    const start = new Date();
    const template = payload?.is_keyword_registration
      ? NotificationTemplateConfig.KEYWORD_REGISTRATION_SUCCESS
      : NOTIFICATION_VOID_SUCCESS_LOV;

    console.log({ template });

    payload.notification = await this.notifService.getNotificationTemplate(
      template,
      payload,
    );

    this.loggingVoid(
      payload,
      {
        message: 'sendVoidSuccessNotification',
        trace: template,
      },
      start,
    );

    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
  }

  async sendVoidFailedNotification(payload: any) {
    payload.origin = `${payload.origin}.void_failed`;
    const start = new Date();
    const template = payload?.is_keyword_registration
      ? NotificationTemplateConfig.KEYWORD_REGISTRATION_FAILED
      : NOTIFICATION_VOID_FAILED_LOV;

    payload.notification = await this.notifService.getNotificationTemplate(
      template,
      payload,
    );

    this.loggingVoid(
      payload,
      {
        message: 'sendVoidFailedNotification',
        trace: template,
      },
      start,
    );

    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
  }

  async processNotificationKeyword(payload: any) {
    const auctionNotificationLists = [
      NotificationTemplateConfig.NOTIFICATION_GROUP_AUCTION_TOP_BIDDER,
      NotificationTemplateConfig.NOTIFICATION_GROUP_AUCTION_SUMMARY_KEYWORD,
    ];
    const start = new Date();
    const couponCount = await this.couponService.couponAmountPerProgram(
      payload.msisdn,
      payload.program_name,
    );

    const payloadNotification = {
      origin: `${payload.origin}_success`,
      incoming: payload.incoming,

      customer: payload.customer,
      keyword: payload.keyword,

      CouponAmountBySubsKeyword: couponCount?.length || 0,
      CouponAmountByKeyword: couponCount?.length || 0,
      programName: payload.program_name,
      prizeItem: payload.keyword.bonus[0].lucky_draw_prize,
      notification: null,
    };

    /*
      NOTIFICATION_GROUP_LUCKY_DRAW_CHECK
      NOTIFICATION_GROUP_LUCKY_DRAW_INFO
    */

    let template_group = null;

    const key_notif = payload?.keyword_notification;
    const isAuctionKeyword = auctionNotificationLists.includes(
      key_notif?.code_identifier_detail?.notification_template,
    );

    if (
      key_notif?.code_identifier_detail?.set_value === 'Check Coupon Keyword'
    ) {
      template_group = 'NOTIFICATION_GROUP_LUCKY_DRAW_CHECK';
    } else if (
      key_notif?.code_identifier_detail?.set_value === 'Info Keyword'
    ) {
      template_group = 'NOTIFICATION_GROUP_LUCKY_DRAW_INFO';
    }

    /*
      NOTIFICATION_GROUP_AUCTION_TOP_BIDDER
      NOTIFICATION_GROUP_AUCTION_SUMMARY_KEYWORD
    */
    const keyword = payload.keyword;
    const currentTime = moment().utc();
    const isKeywordPaused = this.eAuctionService.checkKeywordPause(keyword);
    const isInPeriodKeyword = this.eAuctionService.checkStartedOrExpiredKeyword(
      keyword,
      currentTime,
    );

    if (isAuctionKeyword) {
      const notifTemplate = key_notif?.code_identifier_detail?.notification_template;
      template_group = notifTemplate;

      if (isKeywordPaused || !isInPeriodKeyword) {
        template_group = NotificationTemplateConfig.REDEEM_FAILED_INACTIVE_KEYWORD;
      } else {
        if (keyword.eligibility.keyword_schedule === 'Shift') {
          payload.keyword = this.eAuctionService.detectActiveShift(
            payloadNotification.keyword,
            currentTime,
          );
        }

        const isActiveAuctionEvent = this.eAuctionService.checkWithinEventRange(
          keyword,
          currentTime,
        );

        const eventTime = isActiveAuctionEvent
          ? await this.auctionService.getEventTime({ keyword })
          : null;

        if (notifTemplate === NotificationTemplateConfig.NOTIFICATION_GROUP_AUCTION_TOP_BIDDER) {
          const [top2Bidder, totalBidder] = await Promise.all([
            this.auctionService.getTopBidder(
              payloadNotification.keyword.eligibility.name,
              eventTime,
              2,
            ),
            this.auctionService.getTotalBidder(
              payloadNotification.keyword.eligibility.name,
              eventTime,
            ),
          ]);
    
          payloadNotification['auction'] = {
            top_bidder: top2Bidder,
            auction_prize: payload.keyword.bonus[0]?.auction_prize_name ?? null,
            total_bidder: totalBidder ?? 0,
          };
        } else {
          const totalBidder = await this.auctionService.getTotalBidder(
            payloadNotification.keyword.eligibility.name,
            eventTime,
          );
    
          payloadNotification['auction'] = {
            total_bidder: totalBidder,
            auction_prize: payload.keyword.bonus[0]?.auction_prize_name ?? null,
          };
        }
      }
    }

    try {
      if (template_group) {
        payloadNotification.notification =
          await this.notifService.getNotificationTemplate(
            template_group,
            payloadNotification,
          );

        console.log('payloadNotification', payloadNotification);

        if (isAuctionKeyword && !isKeywordPaused && isInPeriodKeyword) {
          payloadNotification.notification = this.reformatAuctionNotificationContent(payload, payloadNotification.notification);
        }

        this.loggingVoid(
          payload,
          {
            message: 'processNotificationKeyword',
            trace: JSON.stringify(payloadNotification),
          },
          start,
        );

        console.log('RESULT', JSON.stringify(payloadNotification));

        this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payloadNotification);
      } else {
        console.log(
          `== SKIP, KEY_NOTIF NOT FOUND FOR KEYWORD '${payload.keyword.eligibility.name}' ==`,
        );
        this.loggingVoid(
          payload,
          {
            message: `== SKIP, KEY_NOTIF NOT FOUND FOR KEYWORD '${payload.keyword.eligibility.name}' ==`,
            trace: JSON.stringify(key_notif),
          },
          start,
        );
      }
    } catch (err) {
      console.error(`== ERROR, KEY_NOTIF FOR KEYWORD '${payload.keyword}' ==`);
      console.error(err);
      await this.loggingVoid(
        payload,
        err,
        start,
        'error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processBulkRedeemCouponApproval(payload: any) {
    const notif = [];
    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_APPROVAL_CODE_IDENTIFIER',
    );
    const start = new Date();
    if (payload.keyword.notification) {
      for (const bulk_redeem_approval_notif of payload.keyword.notification) {
        if (bulk_redeem_approval_notif.code_identifier === lov_id.toString()) {
          for (const v of bulk_redeem_approval_notif.via) {
            // const via = await this.lovModel.findOne({ _id: new ObjectId(v) });
            const via = await this.lovService.getLovData(v);
            notif.push({
              via: via.set_value,
              template_content: bulk_redeem_approval_notif.notification_content,
            });
          }
        }
      }

      payload.notification = notif;
      payload.origin = `${payload.origin}.void_success`;

      this.loggingVoid(
        payload,
        {
          message: 'processBulkRedeemCouponConfirmation',
          trace: JSON.stringify(payload?.payload?.void),
        },
        start,
      );

      this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
    }
  }

  async processBulkRedeemCouponConfirmation(payload: any) {
    const start = new Date();
    console.log('Generating OTP...');
    const msisdn = payload.customer.msisdn;
    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_CONFIRMATION_CODE_IDENTIFIER',
    );
    const bulk_redeem_confirm_notif = await this.keywordNotificationModel
      .findOne({
        keyword_name: payload.payload.void.keyword,
        code_identifier: lov_id,
      })
      .lean();

    const notif = [];

    for (const v of bulk_redeem_confirm_notif.via) {
      // const via = await this.lovModel.findOne({ _id: new ObjectId(v) });
      const via = await this.lovService.getLovData(v);
      notif.push({
        via: via.set_value,
        template_content: bulk_redeem_confirm_notif.notification_content,
      });
    }

    const parent_keyword_id: any = bulk_redeem_confirm_notif.keyword;

    const otp = await this.otpService
      .createOTP({
        msisdn: msisdn,
        keyword: parent_keyword_id,
        keyword_name: payload.payload.void.keyword,
      })
      .catch((e: Error) => {
        console.log(e);
        this.loggingVoid(
          payload,
          e,
          start,
          'error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      });

    const amount_point_owned = await this.pointService
      .getCustomerTselPointBalance(msisdn, payload.token)
      .catch((e: Error) => {
        console.log(e);
      });
    // const amount_point_owned = await this.pointService.customer_point_balance(
    //   msisdn,
    //   new ViewPointQueryDTO(),
    //   payload.token,
    // );
    //
    payload.notification = notif;
    payload.payload.void.amount_point_owned = amount_point_owned;
    payload.payload.void.otp = otp.otp;
    payload.origin = `${payload.origin}.void_success`;

    this.loggingVoid(
      payload,
      {
        message: 'processBulkRedeemCouponConfirmation',
        trace: JSON.stringify(payload?.payload?.void),
      },
      start,
    );

    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
  }

  async processBulkRedeemCouponInfo(payload: any) {
    const notif = [];
    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_INFO_CODE_IDENTIFIER',
    );
    const start = new Date();
    if (payload.keyword.notification) {
      for (const bulk_redeem_info_notif of payload.keyword.notification) {
        if (bulk_redeem_info_notif.code_identifier === lov_id.toString()) {
          for (const v of bulk_redeem_info_notif.via) {
            // const via = await this.lovModel.findOne({ _id: new ObjectId(v) });
            const via = await this.lovService.getLovData(v);
            notif.push({
              via: via.set_value,
              template_content: bulk_redeem_info_notif.notification_content,
            });
          }
        }
      }

      const couponCount = await this.couponService.couponAmountPerKeyword(
        payload.customer.msisdn,
        payload.program
          ? payload.program.name
          : payload.keyword_notification
          ? payload.keyword_notification?.program_detail?.name
          : null,
        payload.incoming?.keyword
          ? payload.incoming.keyword
          : payload.keyword?.eligibility?.name
          ? payload.keyword.eligibility.name
          : null,
      );

      payload.payload.void.checkInfoPayload = {
        CouponAmountBySubsKeyword: couponCount?.length || 0,
        CouponAmountByKeyword: couponCount?.length || 0,
        prizeItem: payload.keyword.bonus[0].lucky_draw_prize,
      };

      payload.notification = notif;
      payload.origin = `${payload.origin}.void_success`;

      this.loggingVoid(
        payload,
        {
          message: 'processBulkRedeemCouponInfo',
          trace: JSON.stringify(payload?.payload?.void),
        },
        start,
      );

      this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
    }
  }

  async processBulkRedeemCouponCheck(payload: any) {
    const notif = [];
    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_CHECK_CODE_IDENTIFIER',
    );
    const start = new Date();
    if (payload.keyword.notification) {
      for (const bulk_redeem_check_notif of payload.keyword.notification) {
        if (bulk_redeem_check_notif.code_identifier === lov_id.toString()) {
          for (const v of bulk_redeem_check_notif.via) {
            // const via = await this.lovModel.findOne({ _id: new ObjectId(v) });
            const via = await this.lovService.getLovData(v);
            notif.push({
              via: via.set_value,
              template_content: bulk_redeem_check_notif.notification_content,
            });
          }
        }
      }

      const couponCount = await this.couponService.couponAmountPerKeyword(
        payload.customer.msisdn,
        payload.program
          ? payload.program.name
          : payload.keyword_notification
          ? payload.keyword_notification?.program_detail?.name
          : null,
        payload.incoming?.keyword
          ? payload.incoming.keyword
          : payload.keyword?.eligibility?.name
          ? payload.keyword.eligibility.name
          : null,
      );

      payload.payload.void.checkInfoPayload = {
        CouponAmountBySubsKeyword: couponCount?.length || 0,
        CouponAmountByKeyword: couponCount?.length || 0,
        prizeItem: payload.keyword.bonus[0].lucky_draw_prize,
      };

      console.log(payload.payload.void);

      payload.notification = notif;
      payload.origin = `${payload.origin}.void_success`;

      this.loggingVoid(
        payload,
        {
          message: 'processBulkRedeemCouponCheck',
          trace: JSON.stringify(payload?.payload?.void),
        },
        start,
      );

      this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
    }
  }

  async loggingVoid(
    payload,
    error,
    start,
    levelLog = 'verbose',
    httpsStatus = HttpStatus.OK,
  ) {
    const end = new Date();
    await this.exceptionHandler.handle({
      level: levelLog,
      statusCode: httpsStatus,
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload.tracing_id
        ? payload?.tracing_id
        : payload?.tracing_master_id,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      payload: {
        service: VoidKafkaConsumerService.name,
        statusCode: httpsStatus,
        user_id: payload?.account,
        transaction_id: payload.tracing_id
          ? payload?.tracing_id
          : payload?.tracing_master_id,
        step: 'Void Consumer Service',
        method: 'kafka',
        param: payload,
        taken_time: start.getTime() - end.getTime(),
        result: {
          result: {
            message: error?.message,
            stack: error?.trace,
          },
        },
      } satisfies LoggingData,
    });
  }

  reformatAuctionNotificationContent(payload: any, paylaodNotification: Array<any>): Array<any> {
    const keywordNotification: Array<any> = payload.keyword.notification;
    const notificationContent = keywordNotification.find((data) => data.keyword_name === payload.incoming.keyword)?.notification_content;

    console.log('NOTIF CONTENT', notificationContent);

    if (!notificationContent) {
      return paylaodNotification;
    }

    for (const item of paylaodNotification) {
      item.template_content = notificationContent;
    }

    console.log('paylaodNotification', paylaodNotification);

    return paylaodNotification;
  }
}
