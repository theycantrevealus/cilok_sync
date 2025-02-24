import { Controller, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { PersonalizedRewardCatalogService } from '@reporting_statistic/services/reward-catalog/personalized-reward-catalog.service';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';
import { Model } from 'mongoose';
import { Logger } from 'winston';

import {
  formatMsisdnCore,
  formatMsisdnToID,
} from '@/application/utils/Msisdn/formatter';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';

import { convertTime } from './helpers/time.format';
import {
  TransactionMasterDetail,
  TransactionMasterDetailDocument,
} from './model/trx-master-detail.model';
import { ReportingStatisticService } from './reporting_statistic.service';
import { ReportingTrendsChannelService } from './services/channel_trends/reporting-channel-trends.service';
import { CouponSummaryService } from './services/coupon/coupon-summary.service';
import { ReportingErrorRedeemerTrendsService } from './services/error-redeemer-trends/error-redeemer-trends.service';
import { ReportTrendErrorRedeemService } from './services/error-redeemer-trends/report-trend-error-redeem.service';
import { ReportingFactDetailService } from './services/fact-detail/reporting-fact-detail.service';
import { ReportKeywordTransactionService } from './services/keyword-transaction/report-keyword-transaction.service';
import { ReportingPoinBurningService } from './services/poin_burning/reporting-poin-burning.service';
// import { ReportingPoinBurningMyTselService } from './services/poin_burning_mytsel/reporting-poin-burning-mytsel.service';
import { ReportRedeemTransactionService } from './services/redeem-transaction/redeem-transaction.service';
// import { ReportRedeemerMyTselService } from './services/redeemer_mytsel/redeemer-mytsel.service';
import { ReportingRewardService } from './services/reward/reporting-reward.service';
// import { ReportTransactionService } from './services/transaction/reporting-transaction.service';
// import { ReportTransactionBurningMyTselService } from './services/transaction_burning_mytsel/transaction-burning-mytsel.service';
import { ReportingRedeemerExistingService } from './services/unique-msisdn/redeemer-existing.service';
import { ReportingGenerateCouponUniqueMsisdnService } from './services/unique-msisdn/reporting-generate-coupon-unique-msisdn.service';
import { ReportingUniqueMsisdnService } from './services/unique-msisdn/reporting-unique-msisdn.service';

@Controller()
export class ReportingStatisticController {
  constructor(
    @Inject(ReportingStatisticService)
    private readonly reportingStatisticService: ReportingStatisticService,

    // @Inject(ReportTransactionService)
    // private readonly reportTransactionService: ReportTransactionService,

    @Inject(ReportingRedeemerExistingService)
    private readonly redeemerExistingService: ReportingRedeemerExistingService,

    @Inject(ReportingUniqueMsisdnService)
    private readonly uniqueMsisdnReportingService: ReportingUniqueMsisdnService,

    @Inject(ReportingRewardService)
    private readonly rewardReportingService: ReportingRewardService,
    // private readonly rewardCatalogService: RewardCatalogXMLService,
    @Inject(ReportingTrendsChannelService)
    private readonly reportingTrendsChannelService: ReportingTrendsChannelService,

    @Inject(ReportingFactDetailService)
    private readonly reportingFactDetailService: ReportingFactDetailService,

    @Inject(ReportingErrorRedeemerTrendsService)
    private readonly reportErrorRedeemerTrendsService: ReportingErrorRedeemerTrendsService,

    @Inject(ReportingPoinBurningService)
    private readonly reportingPoinBurningService: ReportingPoinBurningService,

    @Inject(ReportKeywordTransactionService)
    private readonly reportKeywordTransactionService: ReportKeywordTransactionService,

    @Inject(ReportTrendErrorRedeemService)
    private readonly reportTrendErrorRedeemService: ReportTrendErrorRedeemService,

    @Inject(ReportingGenerateCouponUniqueMsisdnService)
    private readonly reportingGenerateCouponUniqueMsisdn: ReportingGenerateCouponUniqueMsisdnService,

    // @Inject(ReportingPoinBurningMyTselService)
    // private readonly reportingPoinBurningMyTselService: ReportingPoinBurningMyTselService,

    // @Inject(ReportRedeemerMyTselService)
    // private readonly reportingRedeemerMyTselService: ReportRedeemerMyTselService,

    // @Inject(ReportTransactionBurningMyTselService)
    // private readonly reportingTrxBurnMyTselService: ReportTransactionBurningMyTselService,

    @Inject(ReportRedeemTransactionService)
    private readonly reportRedeemTransactionService: ReportRedeemTransactionService,

    @Inject(PersonalizedRewardCatalogService)
    private readonly personalizedRewardCatalogService: PersonalizedRewardCatalogService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @InjectModel(TransactionMasterDetail.name)
    private transactionDetail: Model<TransactionMasterDetailDocument>,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(ConfigService) private readonly configService: ConfigService,

    private readonly couponSummaryService: CouponSummaryService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * REPORTING INGESTION
   */
  @MessagePattern(process.env.KAFKA_REPORTING_STATISTIC_TOPIC)
  async reportMonitoringRouting(@Payload() payload: any) {
    // console.log(payload, 'payload agung');
    console.log(new Date().toISOString());

    const loggerObject = {
      transaction_status: payload.transaction_status,
      transaction_classify: payload.transaction_classify,
      trace_custom_code: payload.trace_custom_code,
      origin: payload.origin,
      submit_time: payload.submit_time,
      tracing_id: payload.tracing_id,
      account: { ...payload.account },
      customer: {
        msisdn: payload.customer?.msisdn ?? '',
      },
      data: {
        msisdn: payload.customer?.msisdn ?? '',
      },
    };

    try {
      const isSyncCustomerCoupon = payload?.transaction_classify?.toUpperCase() == 'COUPON_SUMMARY';
      const isTransactionStatusSuccessful = payload?.transaction_status?.toUpperCase() == 'SUCCESS';
      const isTransactionTypeInjectCoupon = payload?.origin?.includes('inject_coupon_success');

      // sync customer coupons (purpose for enhancement performance view coupon)
      if (isSyncCustomerCoupon) {
        this.couponSummaryService.syncCustomerCouponSummary(payload);

        return;
      }

      // count up customer coupons (purpose for enhancement performance view coupon)
      if (isTransactionStatusSuccessful && isTransactionTypeInjectCoupon) {
        this.couponSummaryService.countUpCustomerCouponSummary(
          payload,
          loggerObject,
        );
      }

      // payload for detail transaction detail
      console.log('agung 1');
      const programPayload = {
        ...payload.program,
        created_by: payload.keyword.created_by,
      };
      // TODO : fact detail null created by
      // programPayload.created_by = { _id: programPayload.created_by._id ?? '' };
      delete programPayload['program_notification'];

      const keywordPayload = { ...payload.keyword };
      keywordPayload.created_by = { _id: keywordPayload.created_by?._id ?? '' };
      delete keywordPayload['notification'];

      const incomingPayload = { ...payload.incoming };
      incomingPayload.created_by = {
        _id: incomingPayload.created_by?._id ?? '',
      };

      const transDetailCreate = {
        transaction_classify: payload.transaction_classify,
        transaction_status: payload.transaction_status,
        origin: payload.origin,
        program: {
          _id: programPayload._id,
          name: programPayload.name,
          program_owner: programPayload.program_owner,
          program_owner_detail: programPayload.program_owner_detail,
        },
        keyword: {
          _id: keywordPayload._id,
          eligibility: {
            program_experience: keywordPayload.eligibility.program_experience,
            customer_value: keywordPayload.eligibility.customer_value,
            start_period: keywordPayload.eligibility.start_period,
            end_period: keywordPayload.eligibility.end_period,
            merchant: keywordPayload.eligibility.merchant,
            poin_redeemed: keywordPayload.eligibility.poin_redeemed,
            poin_value: keywordPayload.eligibility.poin_value,
            program_bersubsidi: keywordPayload.eligibility.program_bersubsidi,
          },
        },
        customer: {
          brand: payload?.customer?.brand,
          region: payload?.customer?.region,
          city: payload?.customer?.city,
          loyalty_tier: payload?.customer?.loyalty_tier,
        },
        redeem: {
          created_at: payload?.redeem?.created_at,
          msisdn: payload?.redeem?.msisdn,
          master_id: payload?.redeem?.master_id,
        },
        incoming: {
          channel_id: incomingPayload?.channel_id,
          master_id: incomingPayload?.master_id,
        },
        payload: {
          voucher: payload?.payload?.voucher,
          coupon: payload?.payload?.coupon,
        },
        error_message: payload?.error_message,
      };
      const transaction = new this.transactionDetail({
        payload: transDetailCreate,
      });
      const createdTransaction = await transaction.save();

      console.log('createdTransaction', createdTransaction);

      await this.loggerReportStatistic(
        loggerObject,
        false,
        'Create Transaction Master Detail',
        { message: JSON.stringify(payload) },
        new Date(),
      );

      /**
       * Data Ingestion
       * ---
       * Fungsi-fungsi dibawah digunakan untuk melakukan data ingestion dari transaksi yang tercatat.
       * Jangan menggunakan fungsi yang dapat memperlambat data ingestion, jika ada fungsi yang dapat memperlambat. dimohon untuk menggunakan consumer 'report_generation' dibawah.
       * Harap sesuaikan format dengan service yang sudah ada.
       * Jangan ditumpuk didalam 1 buah scope.
       * Gunakan angka-angka 01, 02 dll seperti yang sudah disediakan untuk mengintegrasikan service reporting yang dibuat.
       * *) Agar memudahkan dalam maintenance.
       */
      console.log({
        service: ReportingStatisticController.name,
        session_id: payload.account,
        step: `REPORT STATISTIC START`,
        param: '',
        result: '',
      });

      if (payload?.transaction_classify == 'REDEEM') {
        if (isTransactionStatusSuccessful) {
          // CODE DIBAWAH JANGAN DICOMMENT
          /*
          const result =
            await this.reportingStatisticService.reportMonitoringGeneration({
              period: payload.submit_time,
              msisdn: payload.redeem.msisdn,
            });

          // logger
          let isError = false;
          const errMsg = { ...result };
          let httpStatus = HttpStatus.OK;
          if (result && result.error_msg) {
            isError = true;
            // errMsg = result?.payload ? { ...result?.payload } : {};
            httpStatus = HttpStatus.BAD_REQUEST;
          }
          await this.loggerReportStatistic(
            {
              ...loggerObject,
              redeem: {
                msisdn: payload.redeem.msisdn,
              },
              period: payload.submit_time,
            },
            isError,
            'Report monitoring generation',
            errMsg,
            new Date(),
            httpStatus,
          );
          */

          const period = convertTime(payload.submit_time);
          const keys = Object.keys(payload);

          loggerObject['period'] = period;

          /**
           * Statistic for Personalize Reward Catalog - Customer Most Redeemed
           */
          this.personalizedRewardCatalogService.createStatisticOfPersonalizedRewardCatalog(
            keywordPayload.eligibility.program_experience[0] as string,
            loggerObject,
          );

          /**
           * SDT-714 - Report Daily Summary POIN
           */
          // 00. Transaction Success Counter
          // benerin logic --> pak wilyu
          // if (keys.includes('redeem')) {
          //   console.log('00. Transaction Success Counter');
          //   const msisdn = await formatMsisdnCore(payload['redeem']['msisdn']);

          //   const result =
          //     await this.reportTransactionService.createUniqueMsisdnReport({
          //       period: period,
          //       msisdn: msisdn,
          //     });

          //   // logger
          //   let isError = false;
          //   const errorMsg = { ...result.payload };
          //   if (result.code != HttpStatusTransaction.CODE_SUCCESS) {
          //     isError = true;
          //     // errorMsg = result.payload;
          //   }
          //   await this.loggerReportStatistic(
          //     {
          //       ...loggerObject,
          //       redeem: {
          //         msisdn: payload.redeem.msisdn,
          //       },
          //     },
          //     isError,
          //     '00. Report daily summary point: Create unique msisdn',
          //     errorMsg,
          //     new Date(),
          //   );

          //   await this.reportTransactionService.reportingMonitoringUpdate({
          //     period: period,
          //   });
          //   // logger
          //   await this.loggerReportStatistic(
          //     loggerObject,
          //     false,
          //     '00. Report daily summary point: Report monitoring update',
          //     '',
          //     new Date(),
          //   );
          // }

          // 01. Point Owner
          // TODO

          // 02. Gross Revenue
          // TODO

          // 03. Point Earned
          // TODO

          // 04. Redeemer Existing
          // if (keys.includes('redeem')) {
          //   console.log(
          //     '04. Redeemer Existing:' +
          //       JSON.stringify(formatMsisdnCore(payload['redeem']['msisdn'])),
          //   );
          //   const msisdn = await formatMsisdnCore(payload['redeem']['msisdn']);

          //   await this.redeemerExistingService.reportingMonitoringUpdate({
          //     period: period,
          //     msisdn: msisdn,
          //   });
          //   // logger
          //   await this.loggerReportStatistic(
          //     {
          //       ...loggerObject,
          //       redeem: {
          //         msisdn: payload.redeem.msisdn,
          //       },
          //     },
          //     false,
          //     '04. Redemeer existing: Report monitoring update',
          //     '',
          //     new Date(),
          //   );
          // }

          // 05. Reward Live System
          // - From CRON

          // 06. Reward Trx
          /*
          if (keys.includes('keyword')) {
            const keyword = payload['keyword']['_id'] || null;
            const merchant =
              payload['keyword']['eligibility']['merchant'] || null;
            console.log(
              '06. Reward - Transaction : ',
              JSON.stringify({ merchant: merchant, keyword: keyword }),
            );

            if (keyword) {
              await this.rewardReportingService.createUniqueRewardTransactionReport(
                {
                  period: period,
                  type: 'Keyword',
                  keyword: keyword,
                  merchant: null,
                },
              );
              // logger
              await this.loggerReportStatistic(
                loggerObject,
                false,
                '06. Reward trx: (if keyword) Create unique reward transaction report',
                '',
                new Date(),
              );
            }

            // merchant
            if (merchant) {
              await this.rewardReportingService.createUniqueRewardTransactionReport(
                {
                  period: period,
                  type: 'Merchant',
                  merchant: merchant,
                  keyword: null,
                },
              );
              // logger
              await this.loggerReportStatistic(
                {
                  ...loggerObject,
                  type: 'Keyword',
                  keyword: {
                    _id: keyword,
                    eligibility: {
                      merchant: merchant,
                    },
                  },
                },
                false,
                '06. Reward trx: (if merchant) Create unique reward transaction report',
                '',
                new Date(),
              );
            }

            // update summary
            await this.rewardReportingService.updateRewardReport({
              period: period,
            });
            // logger
            await this.loggerReportStatistic(
              loggerObject,
              false,
              '06. Reward trx: Update reward report',
              '',
              new Date(),
            );
          }
          */

          // 07. Program
          // if (keys.includes('redeem')) {
          //   const program = await formatMsisdnCore(payload['program']['_id']);
          //   const keyword = await formatMsisdnCore(payload['keyword']['_id']);
          //   const bonus_type = await formatMsisdnCore(
          //     payload['keyword']['bonus'][0]['bonus_type'],
          //   );
          //   console.log(
          //     '07. Program :' + `${period} ${program} ${keyword} ${bonus_type}`,
          //   );

          //   await this.reportingProgramHistoryService.reportingProgramHistoryCreate(
          //     {
          //       period: period,
          //       program: program,
          //       keyword: keyword,
          //       bonus_type: bonus_type,
          //     },
          //   );
          // }

          // 08. Redeemer
          // benerin logic --> pak wilyu
          // if (keys.includes('redeem')) {
          //   // await this.redeemerExistingService.checkByLocationDSP(formatMsisdnToID(payload['redeem']['msisdn']));

          //   console.log(
          //     '08. Redeemer :' +
          //       JSON.stringify(formatMsisdnCore(payload['redeem']['msisdn'])),
          //   );
          //   const msisdn = await formatMsisdnCore(payload['redeem']['msisdn']);

          //   const result =
          //     await this.uniqueMsisdnReportingService.createUniqueMsisdnReport({
          //       period: period,
          //       msisdn: msisdn,
          //       point_burning: 0,
          //       point_burning_channel: null,
          //     });
          //   // logger start ------
          //   let isError = false;
          //   const errorMsg = { ...result };
          //   if (result.code != HttpStatusTransaction.CODE_SUCCESS) {
          //     isError = true;
          //   }
          //   await this.loggerReportStatistic(
          //     {
          //       ...loggerObject,
          //       redeem: {
          //         msisdn: payload.redeem.msisdn,
          //       },
          //       point_burning: 0,
          //       point_burning_channel: null,
          //     },
          //     isError,
          //     '08. Redeemer: Create unique msisdn',
          //     errorMsg,
          //     new Date(),
          //   );
          //   // logger end ------

          //   await this.uniqueMsisdnReportingService.reportingMonitoringUpdate({
          //     period: period,
          //     msisdn: msisdn,
          //     point_burning: 0,
          //   });
          //   // logger
          //   await this.loggerReportStatistic(
          //     {
          //       ...loggerObject,
          //       redeem: {
          //         msisdn: payload.redeem.msisdn,
          //       },
          //       point_burning: 0,
          //     },
          //     false,
          //     '08. Redemeer: Report monitoring update',
          //     '',
          //     new Date(),
          //   );
          // }

          // 09. Gross Revenue Redeemer
          // TODO

          // 10. Point Earned Redeemer
          // TODO

          // 11. Poin Burning
          // if (keys.includes('redeem')) {
          //   const msisdn = await formatMsisdnCore(payload['redeem']['msisdn']);
          //   const point_burning = Math.abs(
          //     payload['payload']['deduct']['amount'],
          //   );
          //   console.log('11. Poin Burning : start ' + point_burning + msisdn);

          //   await this.reportingPoinBurningService.reportingPoinBurningUpdate({
          //     period: period,
          //     msisdn: msisdn,
          //     point_burning,
          //   });
          //   // logger
          //   await this.loggerReportStatistic(
          //     {
          //       ...loggerObject,
          //       redeem: {
          //         msisdn: payload.redeem.msisdn,
          //       },
          //       deduct: {
          //         amount: point_burning,
          //       },
          //     },
          //     false,
          //     '11. Poin burning: Reporting poin burning update',
          //     '',
          //     new Date(),
          //   );
          // }

          // 12. Trx Burn
          // TODO

          // 13. Redeemer MYTELKOMSEL
          // if (keys.includes('redeem')) {
          //   const msisdn = await formatMsisdnCore(payload['redeem']['msisdn']);
          //   const channel = payload['incoming']['channel_id'] || null;

          //   if (channel) {
          //     console.log(
          //       '13. Redeemer MyTelkomsel: ' + msisdn + ' ' + channel,
          //     );

          //     await this.reportingRedeemerMyTselService.reportingRedeemerMyTselUpdate(
          //       {
          //         period: period,
          //         msisdn: msisdn,
          //         channel,
          //       },
          //     );
          //     // logger
          //     await this.loggerReportStatistic(
          //       {
          //         ...loggerObject,
          //         redeem: {
          //           msisdn: payload.redeem.msisdn,
          //         },
          //         incoming: {
          //           channel_id: channel,
          //         },
          //       },
          //       false,
          //       '13. Redeemer MYTELKOMSEL: Reporting redemeer MyTselUpdate',
          //       '',
          //       new Date(),
          //     );
          //   }
          // }

          // 14. Gross Revenue Redeemer MYTELKOMSEL
          // TODO

          // 15. Poin Earned Redeemer MYTELKOMSEL
          // TODO

          // 16. Poin Burning MYTELKOMSEL
          // if (keys.includes('redeem')) {
          //   const msisdn = await formatMsisdnCore(payload['redeem']['msisdn']);
          //   const point_burning = Math.abs(
          //     payload['payload']['deduct']['amount'],
          //   );
          //   const channel = payload['incoming']['channel_id'] || null;
          //   if (channel) {
          //     console.log(
          //       '16. Poin Burning : start ' + point_burning + msisdn + channel,
          //     );

          //     await this.reportingPoinBurningMyTselService.reportingPoinBurningMyTselUpdate(
          //       {
          //         period: period,
          //         msisdn: msisdn,
          //         point_burning,
          //         channel,
          //       },
          //     );
          //     // logger
          //     await this.loggerReportStatistic(
          //       {
          //         ...loggerObject,
          //         redeem: {
          //           msisdn: payload.redeem.msisdn,
          //         },
          //         incoming: {
          //           channel_id: channel,
          //         },
          //         point_burning: 0,
          //       },
          //       false,
          //       '16. Poin Burning MYTELKOMSEL: Reporting poin burning MyTselUpdate',
          //       '',
          //       new Date(),
          //     );
          //   }
          // }

          // 17. Trx Burn MYTELKOMSEL
          // if (keys.includes('redeem')) {
          //   const msisdn = await formatMsisdnCore(payload['redeem']['msisdn']);
          //   const channel = payload['incoming']['channel_id'] || null;
          //   if (channel) {
          //     console.log(
          //       '17. Trx Burn MyTelkomsel: ' + msisdn + ' ' + channel,
          //     );

          //     await this.reportingTrxBurnMyTselService.reportingRedeemerMyTselUpdate(
          //       {
          //         period: period,
          //         msisdn: msisdn,
          //         channel,
          //       },
          //     );
          //     // logger
          //     await this.loggerReportStatistic(
          //       {
          //         ...loggerObject,
          //         redeem: {
          //           msisdn: payload.redeem.msisdn,
          //         },
          //         incoming: {
          //           channel_id: channel,
          //         },
          //       },
          //       false,
          //       '17. Trx Burn MYTELKOMSEL: Reporting redemeer MyTselUpdate',
          //       '',
          //       new Date(),
          //     );
          //   }
          // }

          // 18. Reporting Trends Channel
          // if (keys.includes('redeem') && payload?.incoming?.channel_id) {
          //   const msisdnNonCore = await formatMsisdnToID(
          //     payload['redeem']['msisdn'],
          //   );
          //   const program = payload['program']['_id'] || null;
          //   const channel = payload['incoming']['channel_id'] || null;
          //   console.log(payload.submit_time, 'payload.submit_time');
          //
          //   const inputDateTime = new Date(payload.submit_time);
          //   const offsetMilliseconds = 7 * 60 * 60 * 1000; // GMT+7 offset in milliseconds
          //   const resultDateTime = new Date(
          //     inputDateTime.getTime() + offsetMilliseconds,
          //   );
          //
          //   console.log(resultDateTime.toISOString(), 'gmt output'); // Output: 2023-05-26T13:52:30.382Z
          //
          //   const reportEnd = new Date(payload.submit_time);
          //
          //   const reportStart = new Date(payload.submit_time);
          //   reportEnd.setTime(reportEnd.getTime() + offsetMilliseconds);
          //   reportStart.setTime(reportStart.getTime() + offsetMilliseconds);
          //
          //   const hour = reportStart.getUTCHours(); // Getting UTC hours for comparison
          //
          //   if (hour <= 10) {
          //     reportStart.setDate(reportStart.getDate() - 1);
          //   } else {
          //     reportEnd.setDate(reportEnd.getDate() + 1);
          //   }
          //
          //   const reportStartDate = reportStart.toISOString().split('T')[0];
          //   const reportEndDate = reportEnd.toISOString().split('T')[0];
          //
          //   console.log(reportStartDate);
          //   console.log(reportEndDate);
          //
          //   await this.reportingTrendsChannelService.createReportingChannelTrends(
          //     {
          //       program,
          //       channel,
          //       msisdn: Number(msisdnNonCore),
          //       total_redeem: 1,
          //       report_start: reportStartDate,
          //       report_end: reportEndDate,
          //     },
          //   );
          //   console.log('<--- end report trends channel --->');
          //   // logger
          //   await this.loggerReportStatistic(
          //     {
          //       ...loggerObject,
          //       redeem: {
          //         msisdn: msisdnNonCore,
          //       },
          //       incoming: {
          //         channel_id: channel,
          //       },
          //       program: {
          //         _id: program,
          //       },
          //       total_redeem: 1,
          //       report_start: reportStartDate,
          //       report_end: reportEndDate,
          //     },
          //     false,
          //     '18. Reporting trends channel: Create reporting channel trends',
          //     '',
          //     new Date(),
          //   );
          // }

          // 19. reporting counter keyword transaction | ada keperluan fail transaksi
          // KODE DIBAWAH =====

          // 20. Reporting generate coupon unique msisdn
          // if (payload?.payload.coupon) {
          //   await this.reportingGenerateCouponUniqueMsisdn.couponGenerateUniqueMsisdnStore(
          //     {
          //       program_name: payload?.program?.name,
          //       msisdn: payload?.customer?.msisdn,
          //       start_period: new Date(payload?.program?.start_period),
          //       end_period: new Date(payload?.program?.end_period),
          //     },
          //   );
          //   // logger
          //   await this.loggerReportStatistic(
          //     {
          //       ...loggerObject,
          //       redeem: {
          //         msisdn: payload?.customer?.msisdn,
          //       },
          //       program: {
          //         name: payload?.program?.name,
          //       },
          //       start_period: new Date(payload?.program?.start_period),
          //       end_period: new Date(payload?.program?.end_period),
          //     },
          //     false,
          //     '20. Reporting generate coupon unique msisdn: Coupon generate unique msisdn store',
          //     '',
          //     new Date(),
          //   );
          // }

          // SDT-584 21. Report redeem transaction
          await this.reportRedeemTransactionService
            .createReportData(payload)
            .catch((error) => {
              console.error({
                message: `Error saving data report_redeem_transaction : ${error}`,
                stack: error.stack,
              });
            });
          // logger
          await this.loggerReportStatistic(
            loggerObject,
            false,
            'Create Report Data',
            '',
            new Date(),
          );

          console.log('Finish create report');

          // SDT-445 - SFTP - Fact Detail
          // await this.reportingFactDetailService.addValue(payload); // disable report fact detail
        }
        // else if (payload?.transaction_status?.toUpperCase() == 'FAIL') {
        //   const period = convertTime(payload.submit_time);
        //
        //   // SDT-603 - Report Error Redeemer Trends (Email)
        //   await this.reportErrorRedeemerTrendsService.createErrorRedeemerTrends(
        //     period,
        //     payload,
        //   );
        //   // logger
        //   await this.loggerReportStatistic(
        //     loggerObject,
        //     false,
        //     'Report Error Redeemer Trends (Email) - SDT-603',
        //     '',
        //     new Date(),
        //   );
        //
        //   // 21. Reporting Trend Error Redeem
        //   // KODE DIBAWAH =====
        // }
        else {
          console.error(
            `Unknown transaction_status value! ${payload?.transaction_status?.toUpperCase()}`,
          );
          await this.loggerReportStatistic(
            loggerObject,
            false,
            'Unknown transaction_status value',
            '',
            new Date(),
          );
        }

        /**
         * CUSTOM
         */

        // 19. reporting counter keyword transaction | ada keperluan fail transaksi
        const param = {
          transaction_status: payload?.transaction_status,
          keyword_name: payload?.keyword?.eligibility?.name,
          program_name: payload?.program?.name,
          start_period: new Date(payload?.program?.start_period),
          end_period: new Date(payload?.program?.end_period),
          msisdn: payload?.customer?.msisdn,
          log_event: payload?.notification
            ? payload?.notification[0]?.notification_code
            : null,
          notification_content: payload?.notification
            ? payload?.notification[0]?.template_content
            : null,
        };
        await this.reportKeywordTransactionService.reportKeywordTransactionStore(
          param,
        );
        // logger
        await this.loggerReportStatistic(
          loggerObject,
          false,
          '19. Reporting counter keyword transaction: Report keyword transaction store',
          '',
          new Date(),
        );

        // 21. Reporting Trend Error Redeem
        if (payload?.transaction_status?.toUpperCase() == 'FAIL') {
          await this.reportTrendErrorRedeemService.reportTrendErrorRedeemStore(
            param,
          );
          // logger
          await this.loggerReportStatistic(
            loggerObject,
            false,
            '21. Reporting trend error redeem: Report keyword transaction store',
            '',
            new Date(),
          );
        }

        /**
         * END CUSTOM
         */

        console.log({
          service: ReportingStatisticController.name,
          session_id: null,
          step: `REPORT STATISTIC END`,
          param: '',
          result: '',
        });
      } else {
        console.log(`Not redeem transaction ${payload?.transaction_classify}`);
      }
    } catch (error) {
      await this.loggerReportStatistic(
        loggerObject,
        true,
        'Report monitoring routing',
        {
          message: error.message,
          stack: error.stack,
        },
        new Date(),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async testing(parameter) {
    // Proses
    try {
      //
    } catch (e) {
      console.error({
        service: ReportingStatisticController.name,
        session_id: null,
        step: `REPORT STATISTIC GAGAL`,
        param: parameter,
        result: e.message,
      });
    }
  }

  /**
   * REPORTING GENERATION
   */
  // @MessagePattern('report_generation')
  // async reportGenerationRouting(@Payload() payload: any) {
  //   /**
  //    * From CRON
  //    * Disini 'hanya' untuk consumer yang berasal dari cron.
  //    * Fungsi-fungsi dibawah dibuat untuk menjalankan satu atau beberapa query yang berat.
  //    * Dan untuk melakukan generate template email, pengiriman email, pengiriman sftp, atau operasi lain yang lambat agar tidak mengganggu transaksi utama.
  //    */
  //   const period = moment().format('YYYY-MM-DD');

  //   if (payload?.origin?.toString()?.toUpperCase() == 'CRON') {
  //     console.log(
  //       `Reporting cron for ${payload.service_name} with param: `,
  //       JSON.stringify(payload),
  //     );

  //     /**
  //      * Generate banyak data
  //      * Atau fungsi yang memakan waktu yang agak lama
  //      */

  //     /**
  //      * SDT-714 - Report Daily Summary POIN
  //      */

  //     // 01. Point Owner
  //     // 02. Gross Revenue
  //     // 03. Point Earned
  //     // 04. Redeemer Existing
  //     // 05. Reward Live System
  //     if (payload?.service_name?.toUpperCase() == 'REWARD_LIVE_SYSTEM') {
  //       // const period = convertTime(payload.running_at);

  //       await this.rewardReportingService.createUniqueLiveSystemReport(period); // get data
  //       await this.rewardReportingService.updateRewardReport(
  //         {
  //           period: period,
  //         },
  //         true,
  //       ); // update summary
  //     }

  //     if (payload?.service_name?.toUpperCase() == 'REWARD_CATALOG_MYTSEL') {
  //       await this.rewardCatalogService.generateRewardCatalogXML(
  //         payload.parameter,
  //         payload,
  //       );
  //     }

  //     // 06. Reward Trx
  //     // 07. Program

  //     if (payload?.service_name?.toUpperCase() == 'PROGRAM') {
  //       console.log('07. Program :' + `${period} `);
  //       await this.reportingProgramHistoryService.reportingProgramHistoryCreate();
  //     }
  //     // 08. Redeemer
  //     // 09. Gross Revenue Redeemer
  //     // 10. Point Earned Redeemer
  //     // 11. Poin Burning
  //     // 12. Trx Burn
  //     // 13. Redeemer MYTELKOMSEL
  //     // 14. Gross Revenue Redeemer MYTELKOMSEL
  //     // 15. Poin Earned Redeemer MYTELKOMSEL
  //     // 16. Poin Burning MYTELKOMSEL
  //     // 17. Trx Burn MYTELKOMSEL

  //     // SDT berapa?
  //     if (payload?.service_name?.toUpperCase() == 'REMINDER_VOUCHER_EXPIRE') {
  //       await this.reportingStatisticService.reminder_voucher_expire(payload);
  //     }

  //     // SDT-717 - REPORT QUOTA STOCK DAILY
  //     if (payload?.service_name?.toUpperCase() == 'REPORT_QUOTA_STOCK_DAILY') {
  //       await this.reportingQuotaStockAlertService.generateReportingQuotaStockService(
  //         payload,
  //       );
  //     }

  //     // SDT-445 - SFTP Fact Detail
  //     if (payload?.service_name?.toUpperCase() == 'FACT_DETAIL_REPORT') {
  //       // const period = convertTime(payload.running_at);

  //       await this.reportingStatisticService.get_fact_detail({
  //         ...payload,
  //         period,
  //       });
  //     }

  //     // [SDT-584] 21. Report redeem transaction
  //     if (payload?.service_name?.toUpperCase() == 'REPORT_REDEEM_TRANSACTION') {
  //       await this.reportRedeemTransactionService.generateReportData({
  //         ...payload,
  //         period,
  //       });
  //     }

  //     // SDT-768 - Gross Revenue Redeemer &
  //     // SDT-773 - Gross Revenue MyTelkomsel
  //     if (payload?.service_name?.toUpperCase() == 'GROSS_REVENUE_FROM_CORE') {
  //       await this.grossRevenueService.generateReport(period, payload);
  //     }

  //     // SDT-760 - POIN Owner
  //     if (payload?.service_name?.toUpperCase() == 'POIN_OWNER_FROM_CORE') {
  //       await this.poinOwnerService.generateReport(period, payload);
  //     }

  //     //  POIN EARN
  //     if (payload?.service_name?.toUpperCase() == 'POIN_EARN_FROM_CORE') {
  //       await this.poinEarnService.generateReport(period, payload);
  //     }

  //     //  GROSS REVENUE TOTAL
  //     if (payload?.service_name?.toUpperCase() == 'GROSS_REVENUE_FROM_CORE') {
  //       await this.grossRevenueTotalService.generateReport(period, payload);
  //     }

  //     // SDT-769 - POIN Earned Redeemer &
  //     // SDT-774 - POIN Earned Redeemer MyTelkomsel
  //     if (
  //       payload?.service_name?.toUpperCase() == 'POIN_EARN_REDEEMER_FROM_CORE'
  //     ) {
  //       await this.poinEarnRedeemerService.generateReport(period, payload);
  //     }

  //     /**
  //      * ---
  //      * Produk Hasil Reporting
  //      * ---
  //      */

  //     // Scope Notifikasi
  //     if (payload?.target_topic?.toUpperCase() == 'NOTIFICATION') {
  //       // const period = convertTime(payload.running_at);
  //       // TODO: nanti akan emit ke notifikasi

  //       console.log(payload?.parameter?.daily_summary_point, 'log summary ');
  //       // SDT-714 - Report Daily Summary POIN
  //       if (payload?.parameter?.daily_summary_point) {
  //         await this.reportingStatisticService.reportMessengerDailySummaryPoint({
  //           parameter: payload?.parameter,
  //           period: period,
  //         });
  //       }

  //       // SDT-783 - Keyword
  //       if (payload?.parameter?.keyword_with_stock) {
  //         await this.reportKeywordWithStockService.createReport({
  //           parameter: payload?.parameter,
  //           period: period,
  //         });
  //       }

  //       // SDT-602 - Report Channel Redeemer Trends (Email)
  //       if (
  //         payload?.parameter?.program &&
  //         payload?.service_name?.toUpperCase() == 'REPORT_TRENDS_CHANNEL'
  //       ) {
  //         await this.reportingStatisticService.reportMessengerChannelRedeemerTrends({
  //           notification: payload.parameter.notification,
  //           period: period,
  //           program: payload.parameter.program,
  //         });
  //       }

  //       // SDT-603 - Report Error Redeemer Trends (Email)
  //       if (payload?.parameter?.error_redeemer) {
  //         await this.reportingStatisticService.reportMessengerErrorRedeemerTrends({
  //           parameter: payload?.parameter,
  //           period: period,
  //         });
  //       }
  //     }

  //     // SDT-778 - Report Daily transaction program without stock
  //     if (
  //       payload?.service_name?.toUpperCase() ==
  //       'REPORT_TRANSACTION_BY_PROGRAM_WITHOUT_STOCK'
  //     ) {
  //       await this.reportTransactionProgramService.reportTransactionByProgramWithoutStock(
  //         payload,
  //       );
  //     }

  //     // Scope Reward Catalog MyTelkomsel
  //     if (payload?.target_topic?.toUpperCase() == 'REWARD_CATALOG_MYTSEL') {
  //       // TODO: nanti akan emit ke notifikasi
  //       // Emit ke Topic SFTP
  //       await this.reportingStatisticService.sftp_outgoing(payload.sftp_config);
  //     }

  //     // Scope SFTP-Outgoing
  //     if (payload?.target_topic?.toUpperCase() == 'SFTP-OUTGOING') {
  //       // emit ke sftp
  //       await this.reportingStatisticService.sftp_outgoing(payload.sftp_config);
  //     }

  //     // Scope Batch Redeemer
  //     if (payload?.service_name?.toUpperCase() == 'BATCH_REDEEMER') {
  //       // emit ke batch_redeemer service
  //       await this.reportingSftpService.executeBatchRedeemer(payload);
  //     }

  //     // SDT-1569 - QUOTA STOCK ALERT DAILY
  //     if (
  //       payload?.service_name?.toUpperCase() ==
  //       'QUOTA_STOCK_ALERT_DAILY_SUMMARY'
  //     ) {
  //       await this.reportingQuotaStockAlertService.generateReportingQuotaStockAlertSummaryService(
  //         payload,
  //       );
  //     }
  //     if (
  //       payload?.service_name?.toUpperCase() ==
  //       'QUOTA_STOCK_ALERT_DAILY_PROGRAM'
  //     ) {
  //       await this.reportingQuotaStockAlertService.generateReportingProgramSentNotifByPIC(
  //         payload,
  //       );
  //     }

  //     // SDT-1570 - ALERT KEYWORD TOBE EXPIRED
  //     if (
  //       payload?.service_name?.toUpperCase() == 'ALERT_KEYWORD_TOBE_EXPIRED'
  //     ) {
  //       await this.alertKeywordTobeExpiredService.generateReportingKeywordTobeExpired(
  //         payload,
  //       );
  //     }

  //     // SDT-1670 - UPDATE VOUCHER TOBE EXPIRED
  //     if (payload?.service_name?.toUpperCase() == 'VOUCHER_EXPIRED_UPDATE') {
  //       await this.voucherExpiredTriggerService.voucherActionUpdate();
  //     }

  //     console.log(`Reporting cron for ${payload.service_name} finished!`);
  //   }
  // }

  async loggerReportStatistic(
    payload: any,
    isError: boolean,
    step: string,
    error: any,
    start: Date,
    statusCode: number = HttpStatus.OK,
    notifOperation = false,
    notifCustomer = false,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    const result = error ? error : {};

    await this.exceptionHandler.handle({
      level: isError ? 'error' : 'verbose',
      notif_operation: notifOperation,
      notif_customer: notifCustomer,
      transaction_id: payload.tracing_id,
      config: this.configService,
      taken_time: takenTime,
      statusCode: statusCode,
      payload: {
        transaction_id: payload.tracing_id,
        statusCode: statusCode,
        method: 'kafka',
        url: 'reporting_statistic',
        service: ReportingStatisticController.name,
        step: step,
        taken_time: takenTime,
        result: result,
        payload: {
          service: ReportingStatisticController.name,
          user_id: new IAccount(payload.account),
          step: step,
          result: result,
          param: payload,
        },
      } satisfies LoggingData,
    });
  }
}
