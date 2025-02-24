import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportingStatisticService } from '@reporting_statistic/reporting_statistic.service';
import { GrossRevenueService } from '@reporting_statistic/services/gross-revenue/gross_revenue.service';
import { GrossRevenueTotalService } from '@reporting_statistic/services/gross-revenue/gross_revenue_total.service';
import { ReportKeywordWithStockService } from '@reporting_statistic/services/keyword_with_stocks/keyword_with_stocks.service';
import { AlertKeywordTobeExpiredService } from '@reporting_statistic/services/keyword-transaction/alert-keyword-tobe-expired.service';
import { MerchantOutletCatalogueXMLService } from '@reporting_statistic/services/merchant-outlet/merchant-outlet-catalogue-xml.service';
import { ReportingPoinBurningService } from '@reporting_statistic/services/poin_burning/reporting-poin-burning.service';
import { ReportingPoinBurningMyTselService } from '@reporting_statistic/services/poin_burning_mytsel/reporting-poin-burning-mytsel.service';
import { PoinEarnService } from '@reporting_statistic/services/poin_earn/poin_earn.service';
import { PoinEarnRedeemerService } from '@reporting_statistic/services/poin_earn_redeemer/poin_earn_redeemer.service';
import { PoinOwnerService } from '@reporting_statistic/services/poin_owner/poin_owner.service';
import { ReportTransactionProgramService } from '@reporting_statistic/services/program/report.transaction.program.service';
import { ReportingProgramHistoryService } from '@reporting_statistic/services/program/reporting-program-history.service';
import { ReportingQuotaStockAlertService } from '@reporting_statistic/services/quota-stock-daily/reporting-quota-stock-alert.service';
import { ReportRedeemTransactionService } from '@reporting_statistic/services/redeem-transaction/redeem-transaction.service';
import { ReportingSftpService } from '@reporting_statistic/services/reporting-sftp/reporting-sftp.service';
import { ReportingRewardService } from '@reporting_statistic/services/reward/reporting-reward.service';
import { RewardCatalogXMLService } from '@reporting_statistic/services/reward-catalog/reward-catalog-xml.service';
import { ReportTransactionBurningService } from '@reporting_statistic/services/transaction_burning/transaction-burning.service';
import { ReportTransactionBurningMyTselService } from '@reporting_statistic/services/transaction_burning_mytsel/transaction-burning-mytsel.service';
import { ReportingRedeemerExistingService } from '@reporting_statistic/services/unique-msisdn/redeemer-existing.service';
import { ReportingUniqueMsisdnService } from '@reporting_statistic/services/unique-msisdn/reporting-unique-msisdn.service';
import { ReportingUniqueMsisdnMyTselService } from '@reporting_statistic/services/unique-msisdn/reporting-unique-msisdn-mytsel.service';
import { VoucherExpiredTriggerService } from '@reporting_statistic/services/voucher_expired/voucher_expired_trigger.service';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';
import * as moment from 'moment/moment';

import { TimeManagement } from '@/application/utils/Time/timezone';
import { StockService } from '@/stock/services/stock.service';
import { VoucherService } from '@/transaction/services/voucher/voucher.service';

import { AuctionService } from '../../auction/src/auction.service';
import { ReportingServiceResult } from './model/reporting_service_result';

@Injectable()
export class ReportingGenerationService {
  constructor(
    private auctionService: AuctionService,

    @Inject(ConfigService) private readonly configService: ConfigService,

    @Inject(ReportingRewardService)
    private readonly rewardReportingService: ReportingRewardService,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(RewardCatalogXMLService)
    private readonly rewardCatalogService: RewardCatalogXMLService,

    @Inject(MerchantOutletCatalogueXMLService)
    private readonly merchantOutletCatalogueXmlService: MerchantOutletCatalogueXMLService,

    @Inject(ReportingProgramHistoryService)
    private readonly reportingProgramHistoryService: ReportingProgramHistoryService,

    @Inject(ReportingQuotaStockAlertService)
    private readonly reportingQuotaStockAlertService: ReportingQuotaStockAlertService,

    @Inject(ReportingStatisticService)
    private readonly reportingStatisticService: ReportingStatisticService,

    @Inject(ReportRedeemTransactionService)
    private readonly reportRedeemTransactionService: ReportRedeemTransactionService,

    @Inject(GrossRevenueService)
    private readonly grossRevenueService: GrossRevenueService,

    @Inject(PoinOwnerService)
    private readonly poinOwnerService: PoinOwnerService,

    @Inject(PoinEarnService)
    private readonly poinEarnService: PoinEarnService,

    @Inject(GrossRevenueTotalService)
    private readonly grossRevenueTotalService: GrossRevenueTotalService,

    @Inject(PoinEarnRedeemerService)
    private readonly poinEarnRedeemerService: PoinEarnRedeemerService,

    @Inject(ReportKeywordWithStockService)
    private readonly reportKeywordWithStockService: ReportKeywordWithStockService,

    @Inject(ReportTransactionProgramService)
    private readonly reportTransactionProgramService: ReportTransactionProgramService,

    @Inject(ReportingSftpService)
    private readonly reportingSftpService: ReportingSftpService,

    @Inject(AlertKeywordTobeExpiredService)
    private readonly alertKeywordTobeExpiredService: AlertKeywordTobeExpiredService,

    @Inject(VoucherExpiredTriggerService)
    private readonly voucherExpiredTriggerService: VoucherExpiredTriggerService,

    @Inject(ReportingPoinBurningService)
    private readonly reportingPoinBurningService: ReportingPoinBurningService,

    @Inject(ReportingPoinBurningMyTselService)
    private readonly reportingPoinBurningMyTselService: ReportingPoinBurningMyTselService,

    @Inject(ReportTransactionBurningMyTselService)
    private readonly reportingTrxBurnMyTselService: ReportTransactionBurningMyTselService,

    @Inject(ReportTransactionBurningService)
    private readonly reportTransactionBurningService: ReportTransactionBurningService,

    @Inject(ReportingUniqueMsisdnService)
    private readonly reportUniqueMsisdn: ReportingUniqueMsisdnService,

    @Inject(ReportingRedeemerExistingService)
    private readonly redeemerExisting: ReportingRedeemerExistingService,

    @Inject(ReportingUniqueMsisdnMyTselService)
    private readonly reportingUniqueMsisdnMyTselService: ReportingUniqueMsisdnMyTselService,

    @Inject(StockService)
    private readonly stockService: StockService,

    @Inject(VoucherService)
    private readonly voucherService: VoucherService,
  ) {}

  async reportGenerationRouting(payload) {
    console.log({
      service: this.constructor.name,
      session_id: payload?.account,
      step: `REPORT GENERATION START`,
      param: '',
      result: '',
    });

    console.log('payload.service_name : ', payload.service_name);
    console.log('payload.parameter : ', payload.parameter);

    const startTime = new Date();
    const subtractNonCore = payload?.parameter?.subtract ?? 1;
    // const subtractCore = payload?.parameter?.subtract_core ?? 1;
    const historyData = payload?.parameter?.historyData ?? false;

    try {
      /**
       * From CRON
       * Disini 'hanya' untuk consumer yang berasaprivate readonly reportingService: ReportingStatisticService,l dari cron.
       * Fungsi-fungsi dibawah dibuat untuk menjalankan satu atau beberapa query yang berat.
       * Dan untuk melakukan generate template email, pengiriman email, pengiriman sftp, atau operasi lain yang lambat agar tidak mengganggu transaksi utama.
       */
      const period = moment().format('YYYY-MM-DD');
      const periodEndOfDay = moment()
        .endOf('day')
        .format('YYYY-MM-DD HH:mm:ss.SSS');
      const periodUpdated = moment(period)
        .subtract(subtractNonCore, 'days')
        .format('YYYY-MM-DD');

      if (payload?.origin?.toString()?.toUpperCase() == 'CRON') {
        console.log(
          `Reporting generator for ${payload.service_name} with param: `,
          JSON.stringify(payload),
        );

        /**
         * GENERATE LOCATION PREFIX
         * for fact detail
         */
        if (
          payload?.service_name?.toUpperCase() == 'GENERATE_LOCATION_PREFIX'
        ) {
          const resultGenerateLocationPrefix =
            await this.reportingStatisticService.generateLocationPrefix(
              payload,
            );

          console.log('result GENERATE_LOCATION_PREFIX : ');
          console.log(resultGenerateLocationPrefix);
          await this.checkAndSetLog(
            'GENERATE LOCATION PREFIX - Generate location prefix for program regional in fact detail',
            resultGenerateLocationPrefix,
            payload,
            startTime,
          );
        }

        /**
         * RESET STOCK KEYWORD
         */
        if (payload?.service_name?.toUpperCase() == 'RESET_KEYWORD_STOCK') {
          const resultResetKeywordStock =
            await this.stockService.cronStockThreshold();
          console.log('result RESET_KEYWORD_STOCK : ');
          console.log(resultResetKeywordStock);
          await this.checkAndSetLog(
            'RESET KEYWORD STOCK - Reporting RESET KEYWORD STOCK',
            resultResetKeywordStock,
            payload,
            startTime,
          );
        }

        /**
         * AUCTION WINNING NOTIFICATION
         */
        if (
          payload?.service_name?.toUpperCase() == 'AUCTION_WINNING_NOTIFICATION'
        ) {
          this.auctionService.cronWinningNotification();

          await this.checkAndSetLog(
            'Auction Winning Notification',
            new ReportingServiceResult({
              is_error: false,
              message: `${payload.service_name}'s status is in progress`,
              stack: '',
            }),
            payload,
            startTime,
          );
        }

        if (
          payload?.service_name?.toUpperCase() == 'VOUCHER_MANAGEMENT_CHECK'
        ) {
          console.log('=== STARTING VOUCHER_MANAGEMENT_STOCK ===');
          await this.voucherService.voucherUploadSummaryCron();
          console.log('=== END VOUCHER_MANAGEMENT_STOCK ===');
        }
        /**
         * Generate banyak data
         * Atau fungsi yang memakan waktu yang agak lama
         */

        // Generate template
        await this.reportingStatisticService.reportMonitoringGeneration({
          period: periodUpdated,
        });

        /**
         * SDT-714 - Report Daily Summary POIN
         */

        // 01. Point Owner
        // 02. Gross Revenue
        // 03. Point Earned
        // 04. Redeemer Existing
        if (payload?.service_name?.toUpperCase() == 'REDEEMER_EXISTING') {
          console.log('04. REDEEMER EXISTING :' + `${periodEndOfDay} `);

          await this.redeemerExisting.reportingMonitoringUpdate({
            periodReport: period,
            period: moment(period)
              .subtract(subtractNonCore, 'days')
              .format('YYYY-MM-DD'),
            historyData,
          });

          await this.checkAndSetLog(
            'REDEEMER EXISTING - Reporting REDEEMER EXISTING create',
            {},
            payload,
            startTime,
          );
        }

        // 05. Reward Live System
        // LOG - DONE
        if (payload?.service_name?.toUpperCase() == 'REWARD_LIVE_SYSTEM') {
          // const period = convertTime(payload.running_at);

          // const createReport =
          //   await this.rewardReportingService.createUniqueLiveSystemReport(
          //     moment(period).subtract(subtractNonCore, 'days'),
          //   ); // get data

          // await this.checkAndSetLog(
          //   'Reward Live System - Create unique live system report',
          //   createReport,
          //   payload,
          //   startTime,
          // );

          const updateReport =
            await this.rewardReportingService.updateRewardReport(
              {
                period: periodUpdated,
                periodReport: periodUpdated,
              },
              true,
            ); // update summary

          await this.checkAndSetLog(
            'Reward Live System - Update reward report',
            updateReport,
            payload,
            startTime,
          );
        }

        if (payload?.service_name?.toUpperCase() == 'REWARD_CATALOG_MYTSEL') {
          const rewardCatalogMyTsel =
            this.rewardCatalogService.generateRewardCatalogXML(
              payload.parameter,
              payload,
            );

          await this.checkAndSetLog(
            'Reward Catalog MyTsel - Generate Reward Catalog XML',
            new ReportingServiceResult({
              is_error: false,
              message: `${payload.service_name}'s status is in progress`,
              stack: '',
            }),
            payload,
            startTime,
          );
        }

        // MERCHANT OUTLET CATALOGUE
        // LOG - DONE
        if (
          payload?.service_name?.toUpperCase() == 'MERCHANT_OUTLET_CATALOGUE'
        ) {
          const merchantOutletResult =
            this.merchantOutletCatalogueXmlService.generateXML(
              payload.parameter,
              payload,
            );

          await this.checkAndSetLog(
            'Merchant Outlet Catalogue - Generate XML',
            new ReportingServiceResult({
              is_error: false,
              message: `${payload.service_name}'s status is in progress`,
              stack: '',
            }),
            payload,
            startTime,
          );
        }

        // 06. Reward Trx
        if (payload?.service_name?.toUpperCase() == 'REWARD_TRX') {
          console.log('06. REWARD_TRX :' + `${periodEndOfDay} `);

          await this.rewardReportingService.updateRewardReport({
            periodReport: period,
            period: moment(period)
              .subtract(subtractNonCore, 'days')
              .format('YYYY-MM-DD'),
          });

          await this.checkAndSetLog(
            'REWARD_TRX - Reporting REWARD_TRX create',
            {},
            payload,
            startTime,
          );
        }
        // 07. Program
        // LOG - DONE
        if (payload?.service_name?.toUpperCase() == 'PROGRAM') {
          console.log('07. Program :' + `${period} `);
          const programResult =
            await this.reportingProgramHistoryService.reportingProgramHistoryCreate(
              subtractNonCore,
            );

          await this.checkAndSetLog(
            'Program - Reporting program history create',
            programResult,
            payload,
            startTime,
          );
        }

        // 08. Redeemer
        if (payload?.service_name?.toUpperCase() == 'REDEEMER') {
          console.log('08. REDEEMER :' + `${periodEndOfDay} `);

          await this.reportUniqueMsisdn.reportingMonitoringUpdate({
            periodReport: period,
            period: moment(period)
              .subtract(subtractNonCore, 'days')
              .format('YYYY-MM-DD'),
            historyData,
          });

          await this.checkAndSetLog(
            'REDEEMER - Reporting REDEEMER create',
            {},
            payload,
            startTime,
          );
        }

        // SDT-602 - Report Channel Redeemer Trends (Email)
        // LOG - DONE
        if (
          payload?.parameter?.program &&
          payload?.service_name?.toUpperCase() == 'REPORT_TRENDS_CHANNEL'
        ) {
          const reportChannel =
            await this.reportingStatisticService.reportMessengerChannelRedeemerTrendsErman(
              {
                notification: payload.parameter.notification,
                period: payload.parameter.period,
                program: payload.parameter.program,
              },
            );

          await this.checkAndSetLog(
            'Report Channel Redeemer Trends Erman (Email)',
            reportChannel,
            payload,
            startTime,
          );
        }

        // 09. Gross Revenue Redeemer
        // 10. Point Earned Redeemer
        // 11. Poin Burning
        if (payload?.service_name?.toUpperCase() == 'POIN_BURNING') {
          console.log('11. Poin Burning :' + `${periodEndOfDay} `);

          await this.reportingPoinBurningService.reportingPoinBurningUpdate({
            period: period,
            periodReport: moment(period)
              .subtract(subtractNonCore, 'days')
              .format('YYYY-MM-DD'),
            subtract: subtractNonCore,
          });

          await this.checkAndSetLog(
            'Poin Burning - Reporting poin burning create',
            {},
            payload,
            startTime,
          );
        }
        // 12. Trx Burn
        if (payload?.service_name?.toUpperCase() == 'TRX_BURN') {
          console.log('12. TRX BURN  :' + `${periodEndOfDay} `);

          await this.reportTransactionBurningService.reportingRedeemerUpdate({
            // period: period,
            // periodReport: moment(period)
            //   .subtract(subtractNonCore, 'days')
            //   .format('YYYY-MM-DD'),
            // subtract: subtractNonCore,
            periodReport: period,
            period: moment(period)
              .subtract(subtractNonCore, 'days')
              .format('YYYY-MM-DD'),
          });

          await this.checkAndSetLog(
            'TRX BURN - Reporting TRX BURN create',
            {},
            payload,
            startTime,
          );
        }

        // 13. Redeemer MYTELKOMSEL
        if (payload?.service_name?.toUpperCase() == 'REDEEMER_MYTELKOMSEL') {
          console.log('13. Redeemer MYTELKOMSEL :' + `${periodEndOfDay} `);

          await this.reportingUniqueMsisdnMyTselService.reportingMonitoringUpdate(
            {
              periodReport: period,
              period: moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
              historyData,
            },
          );

          await this.checkAndSetLog(
            'REDEEMER_MYTELKOMSEL - Reporting REDEEMER_MYTELKOMSEL create',
            {},
            payload,
            startTime,
          );
        }
        // 14. Gross Revenue Redeemer MYTELKOMSEL
        // 15. Poin Earned Redeemer MYTELKOMSEL
        // 16. Poin Burning MYTELKOMSEL
        if (
          payload?.service_name?.toUpperCase() == 'POIN_BURNING_MYTELKOMSEL'
        ) {
          console.log('16. Poin Burning MYTELKOMSEL :' + `${periodEndOfDay} `);

          await this.reportingPoinBurningMyTselService.reportingPoinBurningMyTselUpdate(
            {
              period: period,
              periodReport: moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
              subtract: subtractNonCore,
            },
          );

          await this.checkAndSetLog(
            'Poin Burning - Reporting Poin Burning my telkomsel create',
            {},
            payload,
            startTime,
          );
        }
        // 17. Trx Burn MYTELKOMSEL

        if (payload?.service_name?.toUpperCase() == 'TRX_BURN_MYTELKOMSEL') {
          console.log('17. TRX BURN MYTELKOMSEL :' + `${periodEndOfDay} `);

          await this.reportingTrxBurnMyTselService.reportingRedeemerMyTselUpdate(
            {
              // period: period,
              // periodReport: moment(period)
              //   .subtract(subtractNonCore, 'days')
              //   .format('YYYY-MM-DD'),
              // subtract: subtractNonCore,
              periodReport: period,
              period: moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
            },
          );

          await this.checkAndSetLog(
            'TRX BURN - Reporting TRX BURN my telkomsel create',
            {},
            payload,
            startTime,
          );
        }

        // SDT berapa?
        // LOG - DONE
        if (payload?.service_name?.toUpperCase() == 'REMINDER_VOUCHER_EXPIRE') {
          const reminderResult =
            await this.reportingStatisticService.reminder_voucher_expire(
              payload,
            );

          await this.checkAndSetLog(
            'Reminder Voucher Expire',
            reminderResult,
            payload,
            startTime,
          );
        }

        // SDT-717 - REPORT QUOTA STOCK DAILY
        // LOG - DONE
        if (
          payload?.service_name?.toUpperCase() == 'REPORT_QUOTA_STOCK_DAILY'
        ) {
          const quotaStockResult =
            await this.reportingQuotaStockAlertService.generateReportingQuotaStockService(
              payload,
            );

          await this.checkAndSetLog(
            'Report quota stock daily',
            quotaStockResult,
            payload,
            startTime,
          );
        }

        // SDT-445 - SFTP Fact Detail
        // LOG - DONE
        if (payload?.service_name?.toUpperCase() == 'FACT_DETAIL_REPORT') {
          // const period = convertTime(payload.running_at);

          const factDetailResult =
            this.reportingStatisticService.get_fact_detail({
              ...payload,
              period: moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
            });

          await this.checkAndSetLog(
            'Fact Detail Report',
            new ReportingServiceResult({
              is_error: false,
              message: `${payload.service_name}'s status is in progress`,
              stack: '',
            }),
            payload,
            startTime,
          );
        }

        // [SDT-584] 21. Report redeem transaction
        // LOG - DONE
        if (
          payload?.service_name?.toUpperCase() == 'REPORT_REDEEM_TRANSACTION'
        ) {
          const reportRedeemResult =
            this.reportRedeemTransactionService.generateReportData({
              ...payload,
              period: moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
            });

          await this.checkAndSetLog(
            'Report Redeem Transaction',
            new ReportingServiceResult({
              is_error: false,
              message: `${payload.service_name}'s status is in progress`,
              stack: '',
            }),
            payload,
            startTime,
          );
        }

        // SDT-768 - Gross Revenue Redeemer &
        // SDT-773 - Gross Revenue MyTelkomsel
        // LOG - DONE
        if (
          payload?.service_name?.toUpperCase() ==
          'GROSS_REVENUE_REDEEMER_FROM_CORE'
        ) {
          const grossRevenueResult =
            await this.grossRevenueService.generateReport(
              moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
              payload,
              historyData,
            );

          // check and set log
          await this.checkAndSetLog(
            'Gross revenue redemeer & myTelkomsel from core',
            grossRevenueResult,
            payload,
            startTime,
          );
        }

        // SDT-760 - POIN Owner
        // LOG - DONE
        if (payload?.service_name?.toUpperCase() == 'POIN_OWNER_FROM_CORE') {
          const poinOwnerResult = await this.poinOwnerService.generateReport(
            moment(period)
              .subtract(subtractNonCore, 'days')
              .format('YYYY-MM-DD'),
            payload,
            historyData,
          );

          // check and set log
          await this.checkAndSetLog(
            'Poin owner from core',
            poinOwnerResult,
            payload,
            startTime,
          );
        }

        //  POIN EARN
        // LOG - DONE
        if (payload?.service_name?.toUpperCase() == 'POIN_EARN_FROM_CORE') {
          const poinEarnFromCore = await this.poinEarnService.generateReport(
            moment(period)
              .subtract(subtractNonCore, 'days')
              .format('YYYY-MM-DD'),
            payload,
            historyData,
          );

          // check and set log
          await this.checkAndSetLog(
            'Poin Earn from Core',
            poinEarnFromCore,
            payload,
            startTime,
          );
        }

        //  GROSS REVENUE TOTAL
        // LOG - DONE
        if (payload?.service_name?.toUpperCase() == 'GROSS_REVENUE_FROM_CORE') {
          const grossRevenueResult =
            await this.grossRevenueTotalService.generateReport(
              moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
              payload,
              historyData,
            );

          // check and set log
          await this.checkAndSetLog(
            'Gross Revenue from Core',
            grossRevenueResult,
            payload,
            startTime,
          );
        }

        // SDT-769 - POIN Earned Redeemer &
        // SDT-774 - POIN Earned Redeemer MyTelkomsel
        // LOG - DONE
        if (
          payload?.service_name?.toUpperCase() == 'POIN_EARN_REDEEMER_FROM_CORE'
        ) {
          const poinEarnRedemeerResult =
            await this.poinEarnRedeemerService.generateReport(
              moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
              payload,
              historyData,
            );

          // check and set log
          await this.checkAndSetLog(
            'POIN Earned Redeemer & MyTelkomsel',
            poinEarnRedemeerResult,
            payload,
            startTime,
          );
        }

        /**
         * ---
         * Produk Hasil Reporting
         * ---
         */

        // Scope Notifikasi
        if (payload?.target_topic?.toUpperCase() == 'NOTIFICATION') {
          // const period = convertTime(payload.running_at);
          // TODO: nanti akan emit ke notifikasi

          console.log(payload?.parameter?.daily_summary_point, 'log summary ');
          // SDT-714 - Report Daily Summary POIN
          // LOG - DONE
          if (payload?.parameter?.daily_summary_point) {
            const reportDailyResult =
              await this.reportingStatisticService.reportMessengerDailySummaryPoint(
                {
                  parameter: payload?.parameter,
                  period: moment(period)
                    .subtract(subtractNonCore, 'days')
                    .format('YYYY-MM-DD'),
                },
              );

            // if result is error or instance of ReportingServiceResult
            if (reportDailyResult instanceof ReportingServiceResult) {
              // check and set log
              await this.checkAndSetLog(
                'Report Daily Summary POIN',
                reportDailyResult,
                payload,
                startTime,
              );
            } else {
              // when result is returning payload
              const successLog = new ReportingServiceResult({
                is_error: false,
                message: 'Success generate Report Daily summary POIN',
              });

              await this.checkAndSetLog(
                'Report Daily Summary POIN',
                successLog,
                payload,
                startTime,
              );
            }
          }

          // SDT-783 - Keyword
          // LOG - DONE
          if (payload?.parameter?.keyword_with_stock) {
            const keywordResult =
              await this.reportKeywordWithStockService.createReport({
                parameter: payload?.parameter,
                period: period,
              });
            await this.checkAndSetLog(
              'Keyword Result',
              keywordResult,
              payload,
              startTime,
            );
          }

          // SDT-602 - Report Channel Redeemer Trends (Email)
          // LOG - DONE
          // if (
          //   payload?.parameter?.program &&
          //   payload?.service_name?.toUpperCase() == 'REPORT_TRENDS_CHANNEL'
          // ) {
          //   const reportChannel =
          //     await this.reportingStatisticService.reportMessengerChannelRedeemerTrends(
          //       {
          //         notification: payload.parameter.notification,
          //         period: period,
          //         program: payload.parameter.program,
          //       },
          //     );
          //
          //   await this.checkAndSetLog(
          //     'Report Channel Redeemer Trends (Email)',
          //     reportChannel,
          //     payload,
          //     startTime,
          //   );
          // }

          // SDT-603 - Report Error Redeemer Trends (Email)
          // LOG - DONE
          if (payload?.parameter?.error_redeemer) {
            const reportErrorRedeemer =
              await this.reportingStatisticService.reportMessengerErrorRedeemerTrends(
                {
                  parameter: payload?.parameter,
                  period: period,
                },
              );

            await this.checkAndSetLog(
              'Report Error Redeemr Trends (Email)',
              reportErrorRedeemer,
              payload,
              startTime,
            );
          }
        }

        // SDT-778 - Report Daily transaction program without stock
        // LOG - DONE
        if (
          payload?.service_name?.toUpperCase() ==
          'REPORT_TRANSACTION_BY_PROGRAM_WITHOUT_STOCK'
        ) {
          const reportTransaction =
            await this.reportTransactionProgramService.reportTransactionByProgramWithoutStock(
              payload,
            );

          await this.checkAndSetLog(
            'Report Error Redeemr Trends (Email)',
            reportTransaction,
            payload,
            startTime,
          );
        }

        if (
          payload?.service_name?.toUpperCase() ==
          'REPORT_TRANSACTION_BY_PROGRAM_WITH_STOCK'
        ) {
          const reportTransaction =
            await this.reportTransactionProgramService.reportTransactionByProgramWithStock(
              {
                parameter: payload?.parameter,
                period: moment(period)
                  .subtract(subtractNonCore, 'days')
                  .format('YYYY-MM-DD'),
              },
            );

          await this.checkAndSetLog(
            'Report Error Redeemr Trends With Stock (Email)',
            reportTransaction,
            payload,
            startTime,
          );
        }

        // Scope Reward Catalog MyTelkomsel
        // LOG - DONE
        if (payload?.target_topic?.toUpperCase() == 'REWARD_CATALOG_MYTSEL') {
          // TODO: nanti akan emit ke notifikasi
          // Emit ke Topic SFTP
          const sftpOutgoingResult =
            await this.reportingStatisticService.sftp_outgoing(
              payload.sftp_config,
              'REWARD_CATALOG_MYSEL',
            );

          await this.checkAndSetLog(
            'Reward Catalog MyTsel (SFTP)',
            sftpOutgoingResult,
            payload,
            startTime,
          );
        }

        // Scope Merchant Outlet Catalogue
        // LOG - DONE
        if (
          payload?.target_topic?.toUpperCase() == 'MERCHANT_OUTLET_CATALOGUE'
        ) {
          if (payload?.sftp_config) {
            const sftpOutgoingResult =
              await this.reportingStatisticService.sftp_outgoing(
                payload.sftp_config,
                'MERCHANT_OUTLET_CATALOGUE',
              );

            await this.checkAndSetLog(
              'Merchant Outlet Catalogue (SFTP)',
              sftpOutgoingResult,
              payload,
              startTime,
            );
          }
        }

        // Scope SFTP-Outgoing
        // LOG - DONE
        if (payload?.target_topic?.toUpperCase() == 'SFTP-OUTGOING') {
          // emit ke sftp
          const sftpOutgoingResult =
            await this.reportingStatisticService.sftp_outgoing(
              payload.sftp_config,
              'SFTP-OUTGOING',
            );

          await this.checkAndSetLog(
            'SFTP Outgoing',
            sftpOutgoingResult,
            payload,
            startTime,
          );
        }

        // Scope Batch Redeemer
        // LOG - DONE
        if (payload?.service_name?.toUpperCase() == 'BATCH_REDEEMER') {
          // emit ke batch_redeemer service
          const batchRedeemer =
            await this.reportingSftpService.executeBatchRedeemer({
              ...payload,
              period: moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
            });

          await this.checkAndSetLog(
            'Batch Redeemer',
            batchRedeemer,
            payload,
            startTime,
          );
        }
        if (payload?.service_name?.toUpperCase() == 'BATCH_REDEEMER_INJECT') {
          // emit ke batch_redeemer_inject service
          const batchRedeemerInject =
            await this.reportingSftpService.executeBatchRedeemerInject({
              ...payload,
              period: moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
            });

          await this.checkAndSetLog(
            'Batch Redeemer Inject',
            batchRedeemerInject,
            payload,
            startTime,
          );
        }

        // SDT-1569 - QUOTA STOCK ALERT DAILY
        // LOG - DONE
        if (
          payload?.service_name?.toUpperCase() ==
          'QUOTA_STOCK_ALERT_DAILY_SUMMARY'
        ) {
          const quotaStokAlertDaily =
            await this.reportingQuotaStockAlertService.generateReportingQuotaStockAlertSummaryService(
              payload,
            );

          await this.checkAndSetLog(
            'Quota Stock Alert Daily Summary',
            quotaStokAlertDaily,
            payload,
            startTime,
          );
        }

        // LOG - DONE
        if (
          payload?.service_name?.toUpperCase() ==
          'QUOTA_STOCK_ALERT_DAILY_PROGRAM'
        ) {
          const quotaStockAlertProgram =
            await this.reportingQuotaStockAlertService.generateReportingProgramSentNotifByPIC(
              payload,
            );

          await this.checkAndSetLog(
            'Quota Stock Alert Daily Program',
            quotaStockAlertProgram,
            payload,
            startTime,
          );
        }

        // SDT-1570 - ALERT KEYWORD TOBE EXPIRED
        // LOG - DONE
        if (
          payload?.service_name?.toUpperCase() == 'ALERT_KEYWORD_TOBE_EXPIRED'
        ) {
          const alertKeyword =
            await this.alertKeywordTobeExpiredService.generateReportingKeywordTobeExpired(
              payload,
            );

          await this.checkAndSetLog(
            'Alert Keyword Tobe Expired',
            alertKeyword,
            payload,
            startTime,
          );
        }

        // SDT-1670 - UPDATE VOUCHER TOBE EXPIRED
        // LOG - DONE
        if (payload?.service_name?.toUpperCase() == 'VOUCHER_EXPIRED_UPDATE') {
          const voucherExpired =
            await this.voucherExpiredTriggerService.voucherActionUpdate();

          await this.checkAndSetLog(
            'Voucher Expired Update',
            voucherExpired,
            payload,
            startTime,
          );
        }

        // SOFT-DELETE ACTIVE VOUCHER
        if (
          payload?.service_name.toUpperCase() == 'BULK_UPDATE_ACTIVE_VOUCHER'
        ) {
          const response: ReportingServiceResult =
            await this.voucherService.bulkUpdateVoucherActiveToSoftDelete();

          await this.checkAndSetLog(
            'BULK_VOUCHER_ACTIVE_TO_SOFT_DELETE',
            response,
            payload,
            startTime,
          );
        }

        // EXPIRED VOUCHER UPDATEs
        if (
          payload?.service_name.toUpperCase() == 'BULK_UPDATE_ACTIVE_VOUCHER'
        ) {
          const response: ReportingServiceResult =
            await this.voucherService.bulkUpdateVoucherToExpired();

          await this.checkAndSetLog(
            'BULK_VOUCHER_EXPIRED',
            response,
            payload,
            startTime,
          );
        }

        console.log(`Reporting cron for ${payload.service_name} finished!`);
      }
    } catch (error) {
      // todo: write log
    }

    console.log({
      service: this.constructor.name,
      session_id: null,
      step: `REPORT GENERATION END`,
      param: '',
      result: '',
    });
  }

  async reportGenerationRecoveryRouting(payload) {
    console.log({
      service: this.constructor.name,
      session_id: payload?.account,
      step: `REPORT GENERATION RECOVERY START`,
      param: '',
      result: '',
    });

    const startTime = new Date();
    const subtractNonCore = payload?.parameter?.subtract ?? 1;
    // const subtractCore = payload?.parameter?.subtract_core ?? 1;
    const historyData = payload?.parameter?.historyData ?? false;
    try {
      const startDate = new Date(payload.start_period);
      const endDate = new Date(payload.end_period);

      const timeManagement = new TimeManagement();
      const dateRanges = timeManagement.getDatesInRange(startDate, endDate);

      console.log(
        `Reporting generator for ${payload.service_name} with param: `,
        JSON.stringify(payload),
      );

      for (let i = 0; i < dateRanges.length; i++) {
        const period = dateRanges[i];

        if (payload?.service_name?.includes('REWARD_LIVE_SYSTEM')) {
          const createReport =
            await this.rewardReportingService.createUniqueLiveSystemReport(
              moment(period).subtract(subtractNonCore, 'days'),
            ); // get data

          await this.checkAndSetLog(
            '(Trx Recovery) Reward Live System - Create unique live system report',
            createReport,
            payload,
            startTime,
          );

          const updateReport =
            await this.rewardReportingService.updateRewardReport(
              {
                period: period,
              },
              true,
            ); // update summary

          await this.checkAndSetLog(
            '(Trx Recovery) Reward Live System - Update reward report',
            updateReport,
            payload,
            startTime,
          );
        }

        if (
          payload?.service_name?.includes('GROSS_REVENUE_REDEEMER_FROM_CORE')
        ) {
          const grossRevenueResult =
            await this.grossRevenueService.generateReport(
              moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
              payload,
              historyData,
            );

          // check and set log
          await this.checkAndSetLog(
            '(Trx Recovery) Gross revenue redemeer & myTelkomsel from core',
            grossRevenueResult,
            payload,
            startTime,
          );
        }

        if (payload?.service_name?.includes('POIN_OWNER_FROM_CORE')) {
          const poinOwnerResult = await this.poinOwnerService.generateReport(
            moment(period)
              .subtract(subtractNonCore, 'days')
              .format('YYYY-MM-DD'),
            payload,
            historyData,
          );

          // check and set log
          await this.checkAndSetLog(
            '(Trx Recovery) Poin owner from core',
            poinOwnerResult,
            payload,
            startTime,
          );
        }

        if (payload?.service_name?.includes('POIN_EARN_FROM_CORE')) {
          await this.poinEarnService.generateReport(
            period,
            payload,
            historyData,
          );
          const poinEarnFromCore = await this.poinEarnService.generateReport(
            moment(period)
              .subtract(subtractNonCore, 'days')
              .format('YYYY-MM-DD'),
            payload,
            historyData,
          );

          // check and set log
          await this.checkAndSetLog(
            '(Trx Recovery) Poin Earn from Core',
            poinEarnFromCore,
            payload,
            startTime,
          );
        }

        if (payload?.service_name?.includes('GROSS_REVENUE_FROM_CORE')) {
          const grossRevenueResult =
            await this.grossRevenueTotalService.generateReport(
              moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
              payload,
              historyData,
            );

          // check and set log
          await this.checkAndSetLog(
            '(Trx Recovery) Gross Revenue from Core',
            grossRevenueResult,
            payload,
            startTime,
          );
        }

        if (payload?.service_name?.includes('POIN_EARN_REDEEMER_FROM_CORE')) {
          const poinEarnRedemeerResult =
            await this.poinEarnRedeemerService.generateReport(
              moment(period)
                .subtract(subtractNonCore, 'days')
                .format('YYYY-MM-DD'),
              payload,
              historyData,
            );

          // check and set log
          await this.checkAndSetLog(
            '(Trx Recovery) POIN Earned Redeemer & MyTelkomsel',
            poinEarnRedemeerResult,
            payload,
            startTime,
          );
        }
      }

      console.log(`Reporting cron for ${payload.service_name} finished!`);
    } catch (e) {
      console.log(e);
    }

    console.log({
      service: this.constructor.name,
      session_id: null,
      step: `REPORT GENERATION END`,
      param: '',
      result: '',
    });
  }

  /**
   * For check return of every service and set log
   * by calling loggerReporting
   */
  async checkAndSetLog(
    transcationName: string,
    result: ReportingServiceResult,
    payload: any,
    startTime: Date,
  ) {
    let errStatus = false,
      errCode = result?.custom_code ?? HttpStatus.OK;

    const errResult = { ...result };
    if (errResult.is_error) {
      errStatus = true;
      errCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    // insert logging
    await this.loggerReportGeneration(
      payload,
      errStatus,
      transcationName,
      errResult,
      startTime,
      errCode,
    );
  }

  /**
   * For handle log reporting generation
   */
  async loggerReportGeneration(
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
      transaction_id: payload?.tracing_id ?? '-',
      config: this.configService,
      taken_time: takenTime,
      statusCode: statusCode,
      payload: {
        transaction_id: payload?.tracing_id ?? '-',
        statusCode: statusCode,
        method: 'kafka',
        url: 'reporting_generation',
        service: this.constructor.name,
        step: step,
        taken_time: takenTime,
        result: result,
        payload: {
          service: this.constructor.name,
          user_id: new IAccount(payload.account),
          step: step,
          result: result,
          param: payload,
        },
      } satisfies LoggingData,
    });
  }
}
