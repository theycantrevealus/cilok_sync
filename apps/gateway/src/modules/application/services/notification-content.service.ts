import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { Model } from 'mongoose';

import { validationKeywordPointValueRule } from '@/application/utils/Validation/keyword.validation';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import {
  NotificationTemplate,
  NotificationTemplateDocument,
} from '@/notification/models/notification.model';
import { NotificationService } from '@/notification/services/notification.service';

import { ApplicationService } from './application.service';

const moment = require('moment-timezone');

@Injectable()
export class NotificationContentService {
  constructor(
    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,
    @InjectModel(NotificationTemplate.name)
    private notificationTemplateModel: Model<NotificationTemplateDocument>,
    private appliactionService: ApplicationService,

    @Inject(LovService)
    private lovService: LovService,

    @Inject(NotificationService)
    private readonly notificatonService: NotificationService,
  ) {}

  // TODO: Add mapping keyword in this variableGet
  /**
   * @deprecated
   * variableGet is a function for mapping variable notification to content notification.
   * @param key variableName
   * @param param data from Message topic
   * @returns
   */
  private variableGet = (key, param) => {
    const variable = {
      programName: param.program
        ? param.program.name
        : param.keyword_notification
        ? param.keyword_notification?.program_detail?.name
        : null,
      keywordName: param.incoming.keyword,
      keywordDesc: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.program_title_expose
          : null
        : null,
      keywordVerification: param.keyword
        ? param.keyword.notification[3]
          ? param.keyword.notification[3].keyword_name
          : null
        : null,
      amountPoinEarned: param.keyword
        ? param.keyword.bonus[0].earning_poin
          ? param.keyword.bonus[0].earning_poin
          : null
        : null,
      // amountPoinOwned: param.payload?.void?.amount_point_owned
      //   ? param.payload?.void?.amount_point_owned
      //   : null,
      amountPoinOwned: param.payload?.void?.amount_point_owned ?? 0,
      keywordTierList: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.segmentation_customer_tier_name
          : null
        : null,
      CouponAmountByTrx: param?.incoming?.total_redeem
        ? param?.incoming?.total_redeem
        : param?.incoming?.total_coupon
        ? param?.incoming?.total_coupon
        : 1,
      // "couponAmount": null,
      counterMaxRedeem: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.max_redeem_counter
          : null
        : null,
      channelRedeem: param.incoming.channel_code,
      // "auctionprize": null,
      // "bidder1": null,
      // "bidder2": null,
      channelName: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.max_redeem_counter
          : null
        : null,
      // "Campaign Wording1": null,
      // "Campaign Wording2": null,
      // "expDate": null,
      cust_tier: param.customer
        ? param.customer?.loyalty_tier
          ? param.customer?.loyalty_tier[0]?.name
          : null
        : null,
      // expDateVoucher: param.keyword
      //   ? param.keyword.bonus
      //     ? param.keyword.bonus[0].exp_voucher
      //       ? param.keyword.bonus[0].exp_voucher
      //       : null
      //     : null
      //   : null,
      expDateVoucher: param?.payload?.voucher?.core?.end_time
        ? moment(param?.payload?.voucher?.core?.end_time).format('DD-MM-YYYY')
        : null,
      FailedCondition: param.reason ? param.reason : null,
      // keywordEndDate: param.keyword
      //   ? param.keyword.eligibility
      //     ? param.keyword.eligibility.end_period
      //     : null
      //   : null,
      keywordEndDate: param.keyword
        ? param.keyword.eligibility
          ? moment(param.keyword.eligibility.end_period).format(
              'DD-MM-YYYY HH:mm:ss',
            )
          : null
        : null,
      // "linkDetail": null,
      location: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.location
          : null
        : null,
      locationQuot: param.keyword
        ? param.keyword.bonus
          ? param.keyword.bonus[0].stock_location
          : null
        : null,
      keywordLosUnit: param.customer ? param.customer.los : null,
      keywordLosValue: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.segmentation_customer_los_operator ===
            'Ranged'
            ? `${param.keyword.eligibility.segmentation_customer_los_min} - ${param.keyword.eligibility.segmentation_customer_los_max}`
            : param.keyword.eligibility.segmentation_customer_los
          : null
        : null,
      merchandiseItem: param.keyword
        ? param.keyword.bonus
          ? param.keyword.bonus[0].merchandise
            ? param.keyword.bonus[0].merchandise
            : null
          : null
        : null,
      'merchant name': param?.payload?.coupon?.merchant_name
        ? param.payload.coupon.merchant_name
        : null,
      merchantName: param.payload.coupon
        ? param.payload.coupon.merchant_name
        : null,
      msisdn: param.incoming ? param.incoming.msisdn : null,
      // "numberofCoupon": null,
      // "OTP": null,
      // poinAmount: param.payload?.void?.amount_point_owned
      //   ? param.payload?.void?.amount_point_owned
      //   : null,
      poinAmount: param.payload?.void?.amount_point_owned ?? 0,
      // "poinAmoutExp": null,
      // "poinBidding": null,
      // "poinExpDate": null,
      poinRedeem: validationKeywordPointValueRule(param),
      poinType: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.point_type
          : null
        : null,
      // "priceAmount": null,
      // "prizeDrawingDate": null,
      // "prizeItem": null,
      // "prizeName": null,
      // "produk": null,
      programCreator: param.program
        ? param.program?.created_by?.user_name
        : null,
      programEndDate: param.program ? param.program.end_period : null,
      programMechanism: param.program ? param.program.program_mechanism : null,
      programOwner: param.program ? param.program.program_owner : null,
      programPeriod: param.program
        ? param.program.start_period + '-' + param.program.end_period
        : null,
      redeemDate: param.submit_time ? param.submit_time : null,
      'remainAmount to reach threshold': null,
      // "remainingQuota": null,
      // "startDateNewMonth": null,
      sysdate: moment().format('DD-MM-YYYY'),
      threshold: param.program ? param.program.threshold_alarm_expired : null,
      timeZone: param.program ? param.program.program_time_zone : null,
      // "totalbidder": null,
      // "totalQuota": null,
      thresholdQuota: param.program
        ? param.program.threshold_alarm_voucher
        : null,
      'trx date': param.submit_time ? param.submit_time : null,
      trxDate: param.submit_time ? param.submit_time : null,
      // "trxType": null,
      // "validReplyTime": null,
      voucherCode: param?.payload?.voucher?.core?.voucher_code
        ? param?.payload?.voucher?.core?.voucher_code
        : null,
      progExperience: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.program_experience
          : null
        : null,
      // keywordStartDate: param.keyword
      //   ? param.keyword.eligibility
      //     ? param.keyword.eligibility.start_period
      //     : null
      //   : null,
      keywordStartDate: param.keyword
        ? param.keyword.eligibility
          ? moment(param.keyword.eligibility.start_period).format(
              'DD-MM-YYYY HH:mm:ss',
            )
          : null
        : null,
      keywordCreator: param.keyword
        ? param.keyword.eligibility
          ? param.keyword?.created_by?.user_name
          : null
        : null,
      keywordPeriod: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.end_period
          : null
        : null,
      // keywordCustTypeList: param.keyword
      //   ? param.keyword.eligibility
      //     ? param.keyword.eligibility.customer_value
      //     : null
      //   : null,
      keywordCustTypeList: param.keyword
        ? param.keyword.eligibility.segmentation_customer_type
          ? param.keyword.eligibility.segmentation_customer_type
          : null
        : null,
      keywordLosOperator: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.segmentation_customer_los_operator
          : null
        : null,
      keywordBrandList: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.segmentation_customer_brand_name
          : null
        : null,
      keywordBCPValue: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility?.keywordBCPValue
          : null
        : null,
      keywordIMEIValue: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility?.imei
          : null
        : null,
      keywordBCPOperator: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility?.keywordBCPOperator
          : null
        : null,
      keywordIMEIOperator: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility?.imei_operator
          : null
        : null,
      keywordARPUUnit: param.customer ? param.customer.arpu : null,
      keywordARPUValue: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.segmentation_customer_arpu_operator ===
            'Ranged'
            ? `${param.keyword.eligibility.segmentation_customer_arpu_min} - ${param.keyword.eligibility.segmentation_customer_arpu_max}`
            : param.keyword.eligibility.segmentation_customer_arpu
          : null
        : null,
      keywordARPUOperator: param.keyword
        ? param.keyword.eligibility
          ? param.keyword.eligibility.segmentation_customer_arpu_operator
          : null
        : null,
      donationAmount: param.keyword
        ? param?.payload?.donation
          ? param?.payload?.donation?.total_redeem
          : null
        : null,
      OTP: param?.payload?.void?.otp,
      CouponAmountBySubsKeyword:
        param?.payload?.void?.checkInfoPayload?.CouponAmountBySubsKeyword,
      CouponAmountByKeyword:
        param?.payload?.void?.checkInfoPayload?.CouponAmountByKeyword,
      prizeItem: param?.payload?.void?.checkInfoPayload?.prizeItem,
      outletName: param?.outlet_name,
      outletname: param?.outlet_name,
      totalBonus: param?.incoming?.total_bonus,
      packageName: param?.incoming?.package_name,
    };

    return variable[key] ?? key;
  };

  /**
   * New version for variableGet
   * Enhancement using switch case
   * @param key
   * @param param
   */
  private variableGetV2 = (key, param) => {
    let result = key;

    switch (key) {
      case 'programName':
        result = param.program
          ? param.program.name
          : param.keyword_notification
          ? param.keyword_notification?.program_detail?.name
          : null;
        break;

      case 'keywordName':
        return param.incoming.keyword;

      case 'keywordDesc':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.program_title_expose
            : null
          : null;
        break;

      case 'keywordVerification':
        result = param.keyword
          ? param.keyword.notification[3]
            ? param.keyword.notification[3].keyword_name
            : null
          : null;
        break;

      case 'amountPoinEarned':
        result = param.keyword
          ? param.keyword.bonus[0].earning_poin
            ? param.keyword.bonus[0].earning_poin
            : null
          : null;
        break;

      //case 'amountPoinOwned':
      //  result = param.payload?.void?.amount_point_owned
      //    ? param.payload?.void?.amount_point_owned
      //    : null;
      //  break;

      case 'amountPoinOwned':
        result = param.payload?.void?.amount_point_owned ?? 0;
        break;

      case 'keywordTierList':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.segmentation_customer_tier_name
            : null
          : null;
        break;

      case 'CouponAmountByTrx':
        result = param?.incoming?.total_redeem
          ? param?.incoming?.total_redeem
          : param?.incoming?.total_coupon
          ? param?.incoming?.total_coupon
          : 1;
        break;
      // "couponAmount": null,
      case 'counterMaxRedeem':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.max_redeem_counter
            : null
          : null;
        break;

      case 'channelRedeem':
        result = param.incoming.channel_code;
        break;

      // "auctionprize": null,
      // "bidder1": null,
      // "bidder2": null,
      case 'channelName':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.max_redeem_counter
            : null
          : null;
        break;
      // "Campaign Wording1": null,
      // "Campaign Wording2": null,
      // "expDate": null,
      case 'cust_tier':
        result = param.customer
          ? param.customer?.loyalty_tier
            ? param.customer?.loyalty_tier[0]?.name
            : null
          : null;
        break;

      // expDateVoucher: param.keyword
      //   ? param.keyword.bonus
      //     ? param.keyword.bonus[0].exp_voucher
      //       ? param.keyword.bonus[0].exp_voucher
      //       : null
      //     : null
      //   : null,
      case 'expDateVoucher':
        result = param?.payload?.voucher?.core?.end_time
          ? moment(param?.payload?.voucher?.core?.end_time).format('DD-MM-YYYY')
          : null;
        break;
      case 'FailedCondition':
        result = param.reason ? param.reason : null;
        break;

      // keywordEndDate: param.keyword
      //   ? param.keyword.eligibility
      //     ? param.keyword.eligibility.end_period
      //     : null
      //   : null,
      case 'keywordEndDate':
        result = param.keyword
          ? param.keyword.eligibility
            ? moment(param.keyword.eligibility.end_period).format(
                'DD-MM-YYYY HH:mm:ss',
              )
            : null
          : null;
        break;
      // "linkDetail": null,
      case 'location':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.location
            : null
          : null;
        break;

      case 'locationQuot':
        result = param.keyword
          ? param.keyword.bonus
            ? param.keyword.bonus[0].stock_location
            : null
          : null;
        break;

      case 'keywordLosUnit':
        result = param.customer ? param.customer.los : null;
        break;

      case 'keywordLosValue':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.segmentation_customer_los_operator ===
              'Ranged'
              ? `${param.keyword.eligibility.segmentation_customer_los_min} - ${param.keyword.eligibility.segmentation_customer_los_max}`
              : param.keyword.eligibility.segmentation_customer_los
            : null
          : null;
        break;

      case 'merchandiseItem':
        result = param.keyword
          ? param.keyword.bonus
            ? param.keyword.bonus[0].merchandise
              ? param.keyword.bonus[0].merchandise
              : null
            : null
          : null;
        break;
      case 'merchant name':
        result = param?.payload?.coupon?.merchant_name
          ? param.payload.coupon.merchant_name
          : null;
        break;
      case 'merchantName':
        result = param.payload.coupon
          ? param.payload.coupon.merchant_name
          : null;
        break;

      case 'msisdn':
        result = param.incoming ? param.incoming.msisdn : null;
        break;
      // "numberofCoupon": null,
      // "OTP": null,

      //case 'poinAmount':
      //  result = param.payload?.void?.amount_point_owned
      //    ? param.payload?.void?.amount_point_owned
      //    : null;
      //  break;

      case 'poinAmount':
        result = param.payload?.void?.amount_point_owned ?? 0;
        break;

      case 'poinAmountByTrx':
        result =
          param?.payload?.inject_point?.amount ??
          Math.abs(param?.payload?.deduct?.amount) ??
          0;
        break;

      case 'poinExpDate':
        result = param.payload?.inject_point?.expired_date ?? null;
        break;

      // "poinAmoutExp": null,
      // "poinBidding": null,
      // "poinExpDate": null,
      case 'poinRedeem':
        result = validationKeywordPointValueRule(param);
        break;

      case 'poinType':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.point_type
            : null
          : null;
        break;
      // "priceAmount": null,
      // "prizeDrawingDate": null,
      // "prizeItem": null,
      // "prizeName": null,
      // "produk": null,
      case 'programCreator':
        result = param.program ? param.program?.created_by?.user_name : null;
        break;
      case 'programEndDate':
        result = param.program ? param.program.end_period : null;
        break;

      case 'programMechanism':
        result = param.program ? param.program.program_mechanism : null;
        break;

      case 'programOwner':
        result = param.program ? param.program.program_owner : null;
        break;

      case 'programPeriod':
        result = param.program
          ? param.program.start_period + '-' + param.program.end_period
          : null;
        break;

      case 'redeemDate':
        result = param.submit_time
          ? moment(param.submit_time).format('DD MMMM YYYY')
          : null;
        break;

      case 'remainAmount to reach threshold':
        result = null;
        break;

      // "remainingQuota": null,
      // "startDateNewMonth": null,
      case 'sysdate':
        result = moment().format('DD-MM-YYYY');
        break;

      case 'threshold':
        result = param.program ? param.program.threshold_alarm_expired : null;
        break;

      case 'timeZone':
        result = param.program ? param.program.program_time_zone : null;
        break;

      // "totalbidder": null,
      // "totalQuota": null,
      case 'thresholdQuota':
        result = param.program ? param.program.threshold_alarm_voucher : null;
        break;

      case 'trx date':
        result = param.submit_time
          ? moment(param.submit_time).format('DD MMMM YYYY')
          : null;
        break;

      case 'trx_date':
        result = param.submit_time
          ? moment(param.submit_time).format('DD MMMM YYYY')
          : null;
        break;

      case 'trxDate':
        result = param.submit_time
          ? moment(param.submit_time).format('DD MMMM YYYY')
          : null;
        break;

      // "trxType": null,
      // "validReplyTime": null,
      case 'voucherCode':
        result = param?.payload?.voucher?.core?.voucher_code
          ? param?.payload?.voucher?.core?.voucher_code
          : null;
        break;

      case 'progExperience':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.program_experience
            : null
          : null;
        break;

      // keywordStartDate: param.keyword
      //   ? param.keyword.eligibility
      //     ? param.keyword.eligibility.start_period
      //     : null
      //   : null,
      case 'keywordStartDate':
        result = param.keyword
          ? param.keyword.eligibility
            ? moment(param.keyword.eligibility.start_period).format(
                'DD-MM-YYYY HH:mm:ss',
              )
            : null
          : null;
        break;

      case 'keywordCreator':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword?.created_by?.user_name
            : null
          : null;
        break;

      case 'keywordPeriod':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.end_period
            : null
          : null;
        break;
      // keywordCustTypeList: param.keyword
      //   ? param.keyword.eligibility
      //     ? param.keyword.eligibility.customer_value
      //     : null
      //   : null,
      case 'keywordCustTypeList':
        result = param.keyword
          ? param.keyword.eligibility.segmentation_customer_type
            ? param.keyword.eligibility.segmentation_customer_type
            : null
          : null;
        break;

      case 'keywordLosOperator':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.segmentation_customer_los_operator
            : null
          : null;
        break;

      case 'keywordBrandList':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.segmentation_customer_brand_name
            : null
          : null;
        break;

      case 'keywordBCPValue':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility?.keywordBCPValue
            : null
          : null;
        break;

      case 'keywordIMEIValue':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility?.imei
            : null
          : null;
        break;

      case 'keywordBCPOperator':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility?.keywordBCPOperator
            : null
          : null;
        break;

      case 'keywordIMEIOperator':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility?.imei_operator
            : null
          : null;
        break;

      case 'keywordARPUUnit':
        result = param.customer ? param.customer.arpu : null;
        break;

      case 'keywordARPUValue':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.segmentation_customer_arpu_operator ===
              'Ranged'
              ? `${param.keyword.eligibility.segmentation_customer_arpu_min} - ${param.keyword.eligibility.segmentation_customer_arpu_max}`
              : param.keyword.eligibility.segmentation_customer_arpu
            : null
          : null;
        break;

      case 'keywordARPUOperator':
        result = param.keyword
          ? param.keyword.eligibility
            ? param.keyword.eligibility.segmentation_customer_arpu_operator
            : null
          : null;
        break;
      case 'donationAmount':
        result = param.keyword
          ? param?.payload?.donation
            ? param?.payload?.donation?.total_redeem
            : null
          : null;
        break;

      case 'OTP':
        result = param?.payload?.void?.otp;
        break;

      case 'CouponAmountBySubsKeyword':
        result =
          param?.payload?.void?.checkInfoPayload?.CouponAmountBySubsKeyword;
        break;

      case 'CouponAmountByKeyword':
        result = param?.payload?.void?.checkInfoPayload?.CouponAmountByKeyword;
        break;

      case 'prizeItem':
        result = param?.payload?.void?.checkInfoPayload?.prizeItem;
        break;
      case 'outletName':
        result = param?.outlet_name;
        break;
      case 'outletname':
        result = param?.outlet_name;
        break;
      case 'auctionprize':
        result = param?.auction?.auction_prize;
        break;
      case 'bidder1':
        result = param?.auction?.top_bidder[0]?.msisdn ?? 'none';
        break;
      case 'bidder2':
        result = param?.auction?.top_bidder[1]?.msisdn ?? 'none';
        break;
      case 'bidPoint1':
        result = param?.auction?.top_bidder[0]?.bid_point ?? 'none';
        break;
      case 'bidPoint2':
        result = param?.auction?.top_bidder[1]?.bid_point ?? 'none';
        break;
      case 'totalbidder':
        result = param?.auction?.total_bidder;
        break;
      case 'poinBidding':
        result = param?.auction?.poinBidding;
        break;
      case 'totalBonus':
        result = param?.incoming?.total_bonus;
        break;
      case 'packageName':
        result = param?.incoming?.package_name;
        break;
    }

    return result;
  };

  /**
   * This is service for generate notification template.
   * @param notif_content string tempalte content
   * @param param data from Message topic
   */
  async generateNotificationTemplateFromConsumer_old(
    notif_content: string,
    param,
  ): Promise<string> {
    const content = await this.getNotificationTemplateContent(notif_content);

    const contentReplace1 = content?.replace(/\]/gi, '');
    const contentFinal = contentReplace1?.replace(/\[/gi, '');
    const contentArray = contentFinal?.split(' ');

    console.log('=========== NOTIFIKASI TEMPLATE OPEN ==========');
    console.log('notif_content : ', notif_content);
    console.log('content : ', content);
    console.log('contentReplace1 : ', contentReplace1);
    console.log('contentFinal : ', contentFinal);
    console.log('contentArray : ', contentArray);
    console.log('=========== NOTIFIKASI TEMPLATE CLOSE ==========');

    let contentReturn = '';
    if (contentArray.length > 0) {
      for (let i of contentArray) {
        const containDot = i.endsWith('.');
        if (containDot) {
          i = i.slice(0, -1); // remove dot from contentArray
        }

        const variable = this.variableGetV2(i, param);
        if (variable) {
          contentReturn += containDot ? variable + '. ' : variable + ' ';
        } else if (variable == 0) {
          // untuk value yang isinya 0
          contentReturn += containDot ? variable + '. ' : variable + ' ';
        } else {
          contentReturn += i + ' ';
        }
      }
    }

    console.log('=========== FINAL NOTIFICATION START ==========');
    console.log(contentReturn);
    console.log('=========== FINAL NOTIFICATION END ==========');

    return contentReturn;
  }

  async generateNotificationTemplateFromConsumer(
    notif_content: string,
    param,
  ): Promise<string> {
    const content = await this.getNotificationTemplateContent(notif_content);

    console.log('=========== NOTIFIKASI TEMPLATE OPEN ==========');
    console.log('notif_content : ', notif_content);
    console.log('content : ', content);
    console.log('=========== NOTIFIKASI TEMPLATE CLOSE ==========');

    const contentReturn = content.replace(/\[(.*?)\]/gm, (val) => {
      let replacedVal = val;
      replacedVal = replacedVal?.replace(/\]/gi, '');
      replacedVal = replacedVal?.replace(/\[/gi, '');

      const varvalue = this.variableGetV2(replacedVal, param);
      if (varvalue) {
        replacedVal = varvalue;
      } else if (varvalue == 0) {
        // untuk value yang isinya 0
        replacedVal = varvalue; // disini valuenya 0
      }

      return replacedVal;
    });

    console.log('=========== FINAL NOTIFICATION START ==========');
    console.log(contentReturn);
    console.log('=========== FINAL NOTIFICATION END ==========');

    return contentReturn;
  }

  async getNotificationTemplateContent(notif_content: string): Promise<string> {
    if (notif_content) {
      return notif_content?.replace('Detail: FailedCondition ', '');
    } else {
      return '';
    }
  }

  /**
   * Get Template Notification by Groupname LOV
   * @param group_name notification Name
   * @param params payload from topic
   * @returns
   */
  async getNotificationTemplate(
    group_name: string,
    params?: any,
    error_code?: any,
  ) {
    let defaultErrorCode = '';
    if (!error_code || error_code == '' || error_code == undefined) {
      try {
        const default_error_code = await this.appliactionService.getConfig(
          'GENERAL_ERROR_CODE',
        );
        defaultErrorCode = default_error_code;
      } catch (error) {
        console.log(
          '<-- error get notification template :: default error code -->',
        );
        console.log(error);
        console.log(
          '<-- error get notification template :: default error code -->',
        );
      }
    }

    const lov = await this.lovModel.findOne({ group_name });

    const notification = params?.keyword?.notification;
    if (lov && notification) {
      if (lov.additional === 'lovs' && notification !== null) {
        // TODO : lov.set_value is not OID type sometime, please add handling if not OID type
        if (lov.set_value) {
          // const lovDefault = await this.lovModel.findOne({
          //   _id: new ObjectId(lov.set_value),
          // });

          const lovDefault = await this.lovService.getLovData(lov.set_value);
          const singleNotif = notification.find(
            (data) => lovDefault._id.toString() === data.code_identifier,
          );

          const notif = [];
          if (singleNotif) {
            for (const iterator of singleNotif['via']) {
              // const via = await this.lovModel.findOne({
              //   _id: new ObjectId(iterator.toString()),
              // });

              const via = await this.lovService.getLovData(iterator.toString());
              notif.push({
                via: via.set_value,
                error_code: error_code ? error_code : defaultErrorCode,
                notification_code: group_name,
                template_content: singleNotif.notification_content,
                template_source: 'lovs',
              });
            }
          }
          return notif;
        } else {
          return [];
        }
      } else {
        // TODO : lov.set_value is not OID type sometime, please add handling if not OID type
        if (lov.set_value) {
          const template = await this.notificationTemplateModel.findOne({
            _id: new ObjectId(lov.set_value.toString()),
          });

          // const template =
          //   await this.notificatonService.getNotificationTemplateDetail(
          //     lov.set_value.toString(),
          //   );

          if (template) {
            const notif = [];
            for (const iterator of template['notif_via']) {
              // const via = await this.lovModel.findOne({
              //   _id: new ObjectId(iterator.toString()),
              // });

              const via = await this.lovService.getLovData(iterator.toString());
              notif.push({
                via: via.set_value,
                error_code: error_code ? error_code : defaultErrorCode,
                notification_code: template.notif_name
                  ? template.notif_name
                  : null,
                template_content: template.notif_content,
                template_source: 'notificationtemplates',
              });
            }
            return notif ? notif : [];
          } else {
            return [];
          }
        } else {
          return [];
        }
      }
    } else {
      // TODO: Set addition to constant file.
      const newLov = new this.lovModel({
        group_name,
        set_value: null,
        additional: 'notificationtemplates',
      });
      newLov.save();
      return [];
    }
  }

  async getNotificationTemplateFromConfig(group_name: string, params) {
    const lov = await this.lovModel.findOne({ group_name });
    const { notification } = params.keyword.notification;
    if (lov && notification) {
      const singleNotif = notification.find(
        (data) => lov._id.toString() === data.code_identifier,
      );

      const notif = [];
      for (const iterator of singleNotif['via']) {
        // const via = await this.lovModel.findOne({
        //   _id: new ObjectId(iterator.toString()),
        // });

        const via = await this.lovService.getLovData(iterator.toString());
        notif.push({
          via: via.set_value,
          template_content: singleNotif.notification_content,
        });
      }

      if (singleNotif) {
        return notif ? notif : null;
      } else {
        const template = await this.notificationTemplateModel.findOne({
          _id: new ObjectId(lov.set_value.toString()),
        });

        // const template =
        //   await this.notificatonService.getNotificationTemplateDetail(
        //     lov.set_value.toString(),
        //   );

        if (template) {
          const notif = [];
          for (const iterator of template['notif_via']) {
            // const via = await this.lovModel.findOne({
            //   _id: new ObjectId(iterator.toString()),
            // });

            const via = await this.lovService.getLovData(iterator.toString());
            notif.push({
              via: via.set_value,
              template_content: template.notif_content,
            });
          }

          return notif ? notif : null;
        } else {
          const newLov = new this.lovModel({
            group_name,
            set_value: null,
            additional: 'notificationtemplates',
          });
          newLov.save();
          return null;
        }
      }
    }
  }
}
