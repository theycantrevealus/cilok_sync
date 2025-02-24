import { ReportingServiceResult } from '@fmc_reporting_generation/model/reporting_service_result';
import {
  ReportKeywordTransaction,
  ReportKeywordTransactionDocument,
} from '@fmc_reporting_statistic/model/keyword-transaction/report-keyword-transaction.model';
import { ReportingStatisticService } from '@fmc_reporting_statistic/reporting_statistic.service';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
import { Stock, StockDocument } from '@/stock/models/stock.model';

import { tableGenerate } from '../../helpers/html.generatate';
import { ReportTrendErrorRedeemService } from '../error-redeemer-trends/report-trend-error-redeem.service';
import { ReportKeywordTransactionService } from '../keyword-transaction/report-keyword-transaction.service';
import { ReportingNotificationService } from '../reporting_notification/reporting-notification.service';
import { ReportingGenerateCouponUniqueMsisdnService } from '../unique-msisdn/reporting-generate-coupon-unique-msisdn.service';
import { ReportKeywordTransactionDTO } from './dto/alert-keyword-tobe-expired.dto';
const moment = require('moment-timezone');

@Injectable()
export class ReportTransactionProgramService {
  constructor(
    @InjectModel(ProgramV2.name)
    private programModel: Model<ProgramV2Document>,

    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,

    @InjectModel(Stock.name)
    private stockModel: Model<StockDocument>,

    @InjectModel(ReportKeywordTransaction.name, 'reporting')
    private reportKeywordTransactionModel: Model<ReportKeywordTransactionDocument>,
    private readonly reportKeywordTransactionService: ReportKeywordTransactionService,
    private readonly reportingGenerateCouponUniqueMsisdnService: ReportingGenerateCouponUniqueMsisdnService,
    private readonly reportTrendErrorRedeemService: ReportTrendErrorRedeemService,
    private readonly reportStatisticService: ReportingStatisticService,
    @Inject('NOTIFICATION_GENERAL_PRODUCER')
    private readonly notificationGeneralClient: ClientKafka,
    private reportingNotificationService: ReportingNotificationService,
  ) {
    //
  }

  async reportTransactionByProgramWithoutStock(
    payload: any,
  ): Promise<ReportingServiceResult> {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const targetTopic = payload?.target_topic;
      const param = payload?.parameter;
      const start_period = yesterday;
      const end_period = yesterday;
      const filter = {};
      const program_name = param.program_name;
      if (program_name) {
        filter['program_name'] = program_name;
      }
      const html = [];
      const headerHtml = `<html><head><title>Reporting Program Without Stock</title><style type='text/css'> table{border-collapse: collapse;}table, th, td{border: 1px solid rgb(156, 156, 156);}th{color: white; background-color: #b90024; text-align: center;}th, td{padding: 5px;}.flex-container{margin-top: 10px; display: flex; flex-wrap: wrap;}.flex-container > table{margin-right: 3px;margin-bottom: 3px;}.counter{text-align: right;}</style></head><body>`;
      html.push(headerHtml);
      const period =
        start_period !== undefined
          ? `Periode ${start_period} - ${end_period}`
          : '';
      html.push(`<div class='flex-container'>`);
      html.push(`<H4>Dear All</H4>`);
      html.push(
        `<H4>Berikut Transaction Program ${
          param.program_name ?? ''
        } ${period}</H4>`,
      );

      // Generate table html with data transaction start date until period time
      const programData = await this.programModel
        .findOne({ name: program_name })
        .exec();
      const startDate = programData?.start_period ?? yesterday;
      await this.reportKeywordTransactionService
        .reportKeywordTransactionGroupingGet(
          {
            start_date: startDate,
            end_date: end_period,
          },
          filter,
        )
        .then(async (res: ReportKeywordTransactionDTO[]) => {
          console.log('get report keyword transaction ' + res.length);
          if (res.length > 0) {
            const data = [];
            const date = moment(start_period).format('YYYYMMDD');
            res.forEach((item) => {
              data.push({
                created_at: date,
                program_name: program_name,
                keyword_name: item.keyword_name,
                total_success: item.total_success,
                total_fail: item.total_fail,
                total_trx: item.total_trx,
              });
            });
            const payloadHtml = {
              title: `Report Total Transaksi Sampai Saat ini:`,
              headers: [
                'Tanggal',
                'Program Name',
                'Keyword',
                'Success',
                'Gagal',
                'total Trx',
              ],
              bodies: data,
            };
            const htmlGenerate = await tableGenerate(payloadHtml);
            html.push(htmlGenerate);
          }
        });
      //.catch((e) => {
      //  console.error(e);
      //});

      // Generate table html with data transaction specifically on report date
      await this.reportKeywordTransactionService
        .reportKeywordTransactionGet(
          {
            start_date: start_period,
            end_date: end_period,
          },
          filter,
        )
        .then(async (res) => {
          console.log('get report keyword transaction ' + res.length);
          const data = [];
          const date = moment(start_period).format('YYYYMMDD');
          res.forEach((item) => {
            data.push({
              created_at: date,
              program_name: program_name,
              keyword_name: item.keyword_name,
              total_success: item.total_success,
              total_fail: item.total_fail,
              total_trx: item.total_trx,
            });
          });
          if (res.length > 0) {
            const payloadHtml = {
              title: `Report Proses Tanggal ${period}`,
              headers: [
                'Tanggal',
                'Program Name',
                'Keyword',
                'Success',
                'Gagal',
                'total Trx',
              ],
              bodies: data,
            };
            const htmlGenerate = await tableGenerate(payloadHtml);
            html.push(htmlGenerate);
          }
        });
      //.catch((e) => {
      //  console.error(e);
      //});
      // Generate table html with data coupon generate by unique msisdn
      await this.reportingGenerateCouponUniqueMsisdnService
        .couponGenerateUniqueMsisdnGetV2(
          {
            start_date: start_period,
            end_date: end_period,
          },
          filter,
        )
        .then(async (res: any) => {
          console.log('get coupon unique msisdn ' + res.length);
          const date = moment(start_period).format('YYYYMMDD');
          const data = [
            {
              created_at: date,
              program_name: filter['program_name'],
              total_coupon: res[0].total_coupon,
              total_msisdn: res[0].total_msisdn,
            },
          ];
          if (res.length > 0) {
            const payloadHtml = {
              title: `Report Total Kupon yang Tergenerate dan Unique Msisdn`,
              headers: [
                'Tanggal',
                'Program Name',
                'Jumlah Kupon',
                'Count msisdn',
              ],
              bodies: data,
            };
            const htmlGenerate = await tableGenerate(payloadHtml);
            html.push(htmlGenerate);
            console.log('html coupon unique msisdn', htmlGenerate);
          }
        });
      //.catch((e) => {
      //  console.error(e);
      //});
      await this.reportTrendErrorRedeemService
        .reportTrendErrorRedeemGet(
          {
            start_date: start_period,
            end_date: end_period,
          },
          filter,
        )
        .then(async (res) => {
          console.log('get report trend error ' + res.length);
          // Generate table html with data trend error redeem
          if (res.length > 0) {
            const data = [];
            res.forEach((item) => {
              const date = moment(item.created_at).format('YYYYMMDD');
              data.push({
                created_at: date,
                program_name: item.program_name,
                keyword_name: item.keyword_name,
                log_event: item.log_event,
                notification_content: item.notification_content,
                total: item.total,
              });
            });
            const payloadHtml = {
              title: `Report Trend Error Redeem:`,
              headers: [
                'Tanggal',
                'Program Name',
                'Keyword',
                'Log Event',
                'Notification',
                'Jumlah',
              ],
              bodies: data,
            };
            const htmlGenerate = await tableGenerate(payloadHtml);
            html.push(htmlGenerate);
            console.log('html trend_channel', htmlGenerate);
          }
        });
      //.catch((e) => {
      //  console.error(e);
      //});

      html.push(`</body></html>`);
      const result = html.join('').toString();
      // emit to notification
      const notificationPayload = {
        origin: payload.origin,
        tracing_id: param?.program_id,
        tracing_master_id: param?.Program_id,
        notification: [
          {
            via: payload.parameter?.notification?.via,
            template_content: result,
            param: {
              to: payload.parameter.notification.to,
              cc: payload.parameter.notification.cc,
              html: result,
              subject: payload.parameter.notification.subject,
            },
          },
        ],
      };
      console.log('-> Emit to notification ..');
      console.log('html', result);
      await this.notificationGeneralClient.emit(
        targetTopic,
        notificationPayload,
      );

      return new ReportingServiceResult({
        is_error: false,
        message: 'Success Report Transaction By Program Without Stock',
      });
    } catch (error) {
      return new ReportingServiceResult({
        is_error: true,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  async reportTransactionByProgramWithStock(
    payload,
  ): Promise<ReportingServiceResult> {
    try {
      const period = payload.period;
      const program_name = payload.parameter.program_name;
      const filter = {};
      if (program_name) {
        filter['program_name'] = program_name[0];
      }
      const html = [];
      const headerHtml = `<html><head><title>Reporting Program With Stock</title><style type='text/css'> table{border-collapse: collapse;}table, th, td{border: 1px solid rgb(156, 156, 156);}th{color: white; background-color: #b90024; text-align: center;}th, td{padding: 5px;}.flex-container{margin-top: 10px; display: flex; flex-wrap: wrap;}.flex-container > table{margin-right: 3px;margin-bottom: 3px;}.counter{text-align: right;}</style></head><body>`;

      html.push(headerHtml);
      html.push(`<div class='flex-container'>`);
      html.push(`<H4>Dear All</H4>`);
      html.push(
        `<H4>Berikut Report Transaksi Report ${
          program_name ?? ''
        } ${period}</H4>`,
      );
      const programs = await this.getAllPrograms(program_name);

      for (let p = 0; p < programs.length; p++) {
        const program = programs[p];
        const data = [];
        // keyword list
        const keywords = await this.getAllKeywords(
          period,
          program._id.toString(),
        );
        for (let k = 0; k < keywords.length; k++) {
          const keyword = keywords[k];

          let trx_success = 0;
          let trx_fail = 0;
          let stock_amount = 0;
          let stock_default = 0;
          let trx_total = 0;
          // apakah ada transaksi?
          const keyword_trans: any = await this.getKeywordTransaction(
            keyword.eligibility.name,
            program.name,
          );
          if (keyword_trans.length) {
            trx_success = keyword_trans?.[0]?.total_success || 0;
            trx_fail = keyword_trans?.[0]?.total_fail || 0;
            trx_total = keyword_trans?.[0]?.total_trx;
          }

          // sisa stock
          const stock = await this.getStockFromKeywordId(keyword._id);
          if (stock.length > 0) {
            const total_sisa_stock = stock.reduce((acc, obj) => {
              return acc + obj.balance;
            }, 0);

            stock_amount = total_sisa_stock;
          }

          // default stock
          if (keyword?.bonus?.[0]?.stock_location?.length) {
            const total_stock_default =
              keyword?.bonus?.[0]?.stock_location.reduce((acc, obj) => {
                return acc + obj.stock;
              }, 0);

            stock_default = total_stock_default;
          }
          data.push({
            period: String(period).replace(/-/g, ''),
            keyword: keyword.eligibility.name,
            trx_success,
            trx_fail,
            // total_trx: Number(trx_success) + Number(trx_fail),
            total_trx: trx_total,
            stock_amount,
            stock_default,
          });
        }
        const payloadHtmlKeyword = {
          title: `Report Keyword Program ${program_name ?? ''} ${period}`,
          headers: [
            'TANGGAL',
            'KEYWORD',
            'SUKSES',
            'GAGAL',
            'TOTAL TRX',
            'SISA STOCK',
            'DEFAULT STOCK',
          ],
          bodies: data,
        };
        const htmlGenerateKeyword = await tableGenerate(payloadHtmlKeyword);
        html.push(htmlGenerateKeyword);

        //TRENDS CHANNEL
        const payload_trend = {
          period: period,
          program: program_name[0],
        };
        console.log('PAYLOAD BRO', payload_trend);
        const reportTrendChannel =
          await this.reportStatisticService.counterTrendChannel(payload_trend);
        const resultHTML =
          await this.reportStatisticService.convertHTMLTrendsChannelErman(
            reportTrendChannel,
            period,
          );
        html.push(resultHTML);

        await this.reportTrendErrorRedeemService
          .reportTrendErrorRedeemGet(
            {
              start_date: period,
              end_date: period,
            },
            filter,
          )
          .then(async (res) => {
            console.log('get report trend error ' + res);
            // Generate table html with data trend error redeem
            if (res.length > 0) {
              const data = [];
              res.forEach((item) => {
                const date = moment(item.created_at).format('YYYYMMDD');
                data.push({
                  created_at: date,
                  program_name: item.program_name,
                  keyword_name: item.keyword_name,
                  log_event: item.log_event,
                  notification_content: item.notification_content,
                  total: item.total,
                });
              });
              const payloadHtml = {
                title: `Report Trend Error Redeem:`,
                headers: [
                  'Tanggal',
                  'Program Name',
                  'Keyword',
                  'Log Event',
                  'Notification',
                  'Jumlah',
                ],
                bodies: data,
              };
              const htmlGenerate = await tableGenerate(payloadHtml);
              html.push(htmlGenerate);
            }
          });
        //.catch((e) => {
        //  console.error(e);
        //});

        html.push(`</body></html>`);

        const result = html.join('').toString();

        console.log('-> Emit to notification ..');
        // console.log('html', result);

        await this.reportingNotificationService.sendNotificationKeywordWithStock(
          payload.parameter,
          payload.period,
          result,
          {
            program: program_name,
          },
        );

        return new ReportingServiceResult({
          is_error: false,
          message: 'Success Report Transaction By Program Without Stock',
        });
      }
    } catch (error) {
      return new ReportingServiceResult({
        is_error: true,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  private async getAllPrograms(program) {
    const query = [];

    if (program || program?.length) {
      query.push({
        $match: {
          name: {
            $in: program,
          },
        },
      });
    }

    query.push({
      $project: {
        _id: 1,
        name: 1,
      },
    });

    return await this.programModel.aggregate(query);
  }

  private async getAllKeywords(period, program_id) {
    const data = await this.keywordModel.aggregate([
      {
        $match: {
          $and: [
            { 'eligibility.program_id': program_id },
            { 'eligibility.name': { $not: /-/ } },
            { hq_approver: { $exists: true } },
          ],
          // date: {
          //   $gte: moment(period).startOf('day').toDate(),
          //   $lte: moment(period).endOf('day').toDate(),
          // },
        },
      },
    ]);

    return data;
  }

  //TODO : Check this query
  private async getKeywordTransaction(keyword_name, program_name) {
    return this.reportKeywordTransactionModel.aggregate(
      [
        {
          $project: {
            total_success: 1,
            total_fail: 1,
            total_trx: 1,
            keyword_name: 1,
            program_name: {
              $trim: {
                input: '$program_name',
              },
            },
          },
        },
        {
          $match: {
            keyword_name: keyword_name,
            program_name: program_name,
          },
        },
        {
          $group: {
            _id: '$keyword_name',
            keyword: {
              $first: '$keyword_name',
            },
            total_success: {
              $sum: '$total_success',
            },
            total_fail: {
              $sum: '$total_fail',
            },
            total_trx: {
              $sum: '$total_trx',
            },
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
  }

  private async getStockFromKeywordId(keywordId: string) {
    const query = [];
    const filter_builder = { $and: [] };

    filter_builder.$and.push({
      keyword: new Types.ObjectId(keywordId),
    });

    query.push({
      $match: filter_builder,
    });

    const data = await this.stockModel.aggregate(query, (err, result) => {
      return result;
    });

    return data;
  }
}
