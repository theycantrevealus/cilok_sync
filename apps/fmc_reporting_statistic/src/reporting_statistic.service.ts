import { ReportingServiceResult } from '@fmc_reporting_generation/model/reporting_service_result';
import {
  ReportTrendChannelRedeemer,
  ReportTrendChannelRedeemerDocument,
} from '@gateway/report/models/report-trend-channel-redeemer.model';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import {
  TransactionMaster,
  TransactionMasterDocument,
} from '@transaction_master/models/transaction_master.model';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';
import { UtilsService } from '@utils/services/utils.service';
import * as fs from 'fs';
import { Model } from 'mongoose';
import { Logger } from 'winston';

import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  checkExistingFile,
  readOneFile,
} from '@/application/utils/File/file-management.service';
import {
  allowedIndihomeNumber,
  allowedMSISDN,
  msisdnCombineFormatted,
  msisdnCombineFormatToId,
} from '@/application/utils/Msisdn/formatter';
import { validationKeywordPointValueRule } from '@/application/utils/Validation/keyword.validation';
import { Customer, CustomerDocument } from '@/customer/models/customer.model';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';
import { Voucher, VoucherDocument } from '@/transaction/models/voucher/voucher.model';

import {
  CronConfig,
  CronConfigDocument,
} from '../../cron/src/models/cron.config.model';
import {
  ReportMonitoring,
  ReportMonitoringDocument,
} from '../src/model/reporting.model';
import { formatReport } from './helpers/report.format';
import { convertTime } from './helpers/time.format';
import {
  ReportErrorRedeemerTrends,
  ReportErrorRedeemerTrendsDocument,
} from './model/error-redeemer-trends/error.redeemer.trends.model';
import {
  ReportFactDetail,
  ReportFactDetailDocument,
} from './model/fact-detail/report-fact-detail.model';
import {
  LocationPrefix,
  LocationPrefixDocument,
} from './model/location-prefix/location-prefix.mode';
import { ReportingNotificationService } from './services/reporting_notification/reporting-notification.service';

const moment = require('moment-timezone');

@Injectable()
export class ReportingStatisticService {
  private httpService: HttpService;
  private urlSL: string;
  private account: any;

  constructor(
    httpService: HttpService,
    private readonly configService: ConfigService,
    private reportingNotificationService: ReportingNotificationService,
    private notifService: NotificationContentService,
    private transactionOptional: TransactionOptionalService,
    private utilsService: UtilsService,
    @Inject('NOTIFICATION_GENERAL_PRODUCER')
    private readonly notificationGeneralClient: ClientKafka,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    // @Inject('REPORTING') private readonly reportingClient: ClientKafka,
    @Inject('SFTP_SERVICE_PRODUCER') private readonly sftpClient: ClientKafka,
    @InjectModel(ReportFactDetail.name, 'reporting')
    private reportFactDetailModel: Model<ReportFactDetailDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(ReportMonitoring.name, 'reporting')
    private reportMonitoringModel: Model<ReportMonitoringDocument>,
    @InjectModel(ReportTrendChannelRedeemer.name, 'reporting')
    private reportTrendChannelRedeemerModel: Model<ReportTrendChannelRedeemerDocument>,
    @InjectModel(ProgramV2.name)
    private programModel: Model<ProgramV2Document>,
    @InjectModel(ReportErrorRedeemerTrends.name, 'reporting')
    private reportErrorRedeemerTrendsModel: Model<ReportErrorRedeemerTrendsDocument>,
    @InjectModel(Voucher.name)
    private transactionVoucherModel: Model<VoucherDocument>,
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
    @InjectModel(TransactionMaster.name)
    private transactionMasterModel: Model<TransactionMasterDocument>,
    @InjectModel(LocationPrefix.name)
    private locationPrefixModel: Model<LocationPrefixDocument>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @InjectModel(CronConfig.name)
    private cronConfigModel: Model<CronConfigDocument>,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
  ) {
    this.httpService = httpService;

    this.urlSL = `${configService.get<string>('application.hostport')}`;
  }

  getHello(): string {
    return 'Hello World!';
  }

  async reportMonitoringGeneration(payload: any) {
    try {
      const period = new Date(
        payload.period.slice(0, 10) + 'T00:00:00.000Z',
      ).toISOString();
      payload.period = period;

      const dataExistence = await this.reportMonitoringModel.find({
        period: period,
      });

      let result;
      if (dataExistence.length >= 1) {
        console.log(
          'Report Monitoring period ' + period + ' is already available!',
        );
        result = {
          message:
            'Report Monitoring period ' + period + ' is already available!',
        };
        // result = await this.reportingMonitoringUpdate(payload);
      } else if (dataExistence.length == 0) {
        result = await this.reportingMonitoringCreation(payload);
        // console.log('Report Monitoring is created!');
        result = {
          message: 'Report Monitoring is created!',
        };
      } else {
        result = {
          message: 'Error Finding in Collection.',
        };
      }
      return result;
    } catch (error) {
      return {
        error_msg:
          'Service: reportingService, func: reportMonitoringGeneration',
        message: error.message,
        stack: error.stack,
      };
    }
  }

  private toSnakeCase(str) {
    return str
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g,
      )
      .map((x) => x.toLowerCase())
      .join('_');
  }

  private initDefaultValue(period, datas) {
    const names = ['Date Last Year', 'Date Last Month', 'Date Today'];
    const periods = [
      convertTime(moment(period).subtract(1, 'years').toISOString()),
      convertTime(moment(period).subtract(1, 'months').toISOString()),
      convertTime(moment(period).toISOString()),
    ];

    let values = datas.map((d) => {
      d = this.toSnakeCase(d);

      return {
        [d]: 0,
      };
    });

    values = Object.assign({}, ...values);

    return names.map((n, i) => {
      return {
        name: n,
        period: periods[i],
        ...values,
      };
    });
  }

  async reportingMonitoringCreation(payload: any) {
    const test = this.initDefaultValue(payload.period, [
      'Year To Date',
      'Month To Date',
    ]);

    const newData = new this.reportMonitoringModel({
      period: payload.period,
      point_owner: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      point_owner_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      point_owner_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      gross_revenue: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      gross_revenue_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      gross_revenue_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      poin_earned: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      poin_earned_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      poin_earned_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      redeemer_existing: this.initDefaultValue(payload.period, [
        'Year To Date',
      ]),
      redeemer_existing_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
      ]),
      redeemer_existing_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
      ]),
      reward_live_system: this.initDefaultValue(payload.period, [
        'Merchant',
        'Keyword',
      ]),
      reward_trx: this.initDefaultValue(payload.period, [
        'Merchant',
        'Keyword',
      ]),
      program: this.initDefaultValue(payload.period, ['Program', 'Keyword']),
      redeemer: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      redeemer_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      redeemer_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      gross_revenue_redeemer: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      gross_revenue_redeemer_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      gross_revenue_redeemer_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      poin_earned_redeemer: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      poin_earned_redeemer_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      poin_earned_redeemer_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      point_burning: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      point_burning_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      point_burning_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      trx_burn: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      trx_burn_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      trx_burn_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      redeemer_mytelkomsel: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      redeemer_mytelkomsel_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      redeemer_mytelkomsel_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      gross_revenue_redeemer_mytelkomsel: this.initDefaultValue(
        payload.period,
        ['Year To Date', 'Month To Date'],
      ),
      gross_revenue_redeemer_mytelkomsel_telco: this.initDefaultValue(
        payload.period,
        ['Year To Date', 'Month To Date'],
      ),
      gross_revenue_redeemer_mytelkomsel_indihome: this.initDefaultValue(
        payload.period,
        ['Year To Date', 'Month To Date'],
      ),
      poin_earned_redeemer_mytelkomsel: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      poin_earned_redeemer_mytelkomsel_telco: this.initDefaultValue(
        payload.period,
        ['Year To Date', 'Month To Date'],
      ),
      poin_earned_redeemer_mytelkomsel_indihome: this.initDefaultValue(
        payload.period,
        ['Year To Date', 'Month To Date'],
      ),
      poin_burning_mytelkomsel: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      poin_burning_mytelkomsel_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      poin_burning_mytelkomsel_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      trx_burn_mytelkomsel: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      trx_burn_mytelkomsel_telco: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
      trx_burn_mytelkomsel_indihome: this.initDefaultValue(payload.period, [
        'Year To Date',
        'Month To Date',
      ]),
    });

    return await newData.save().catch((e: BadRequestException) => {
      throw new BadRequestException(e.message); //Error untuk mongoose
    });
  }

  private async getReportOlderDate(period) {
    const start = Date.now();

    const ress = {
      year_to_date: 0,
      month_to_date: 0,
    };

    try {
      console.log(`=>> REDEEMER on ${period} query ...`);

      const data = await this.reportMonitoringModel.findOne({ period: period });
      console.log('DATANYA', data);

      if (data) {
        ress.year_to_date = data.redeemer[2].year_to_date; // today
        ress.month_to_date = data.redeemer[2].month_to_date; // today
      }

      console.log(`=>> REDEEMER on ${period} Exec time: ${Date.now() - start}`);
    } catch (err) {
      // TODO
    }

    return ress;
  }

  async reportMessengerDailySummaryPoint(
    payload: any,
  ): Promise<any | ReportingServiceResult> {
    console.log('-> Report Daily Summary Point Messenger start !!');
    try {
      if (payload?.notification) {
        console.log("-> Parameter 'notification' not found!");
        return new ReportingServiceResult({
          is_error: true,
          message: 'Report messenger daily summary point: paramter not found',
          stack:
            'Parameter "notification" not found at payload for reportMessengerDailySummaryPoint',
        });
      }

      const reportPeriod = await this.reportMonitoringModel
        .findOne({
          period: payload.period,
        })
        .exec();

      console.log(reportPeriod, 'log summary reportPeriod ');
      if (!reportPeriod) {
        console.log('-> Report not found!');
        return null;
      }
      const original_subject = payload.parameter.notification.subject;
      await this.proceedAll(reportPeriod, payload);

      console.log('-> Report Daily Summary Point Messenger finish !!');

      return payload;
    } catch (e) {
      return new ReportingServiceResult({
        is_error: true,
        message: e.message,
        stack: e.stack,
      });
    }
  }

  async reportMessengerChannelRedeemerTrends(
    payload: any,
  ): Promise<ReportingServiceResult> {
    console.log('-> Report Channel Redeemer Trends (Email) Messenger start !!');
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const programID = await this.programModel
        .findOne({
          name: payload.program,
        })
        .exec();

      if (!programID) {
        console.log('-> Program not found!');

        serviceResult.is_error = true;
        serviceResult.message =
          'ReportMessengerChannelRedeemerTrends: Program not found';

        serviceResult.stack = 'Program not found at db';
        return serviceResult;
      }

      console.log('agung generate : ', {
        date: payload.period,
        program: programID._id,
        channel_name: { $ne: '' },
      });

      const reportPeriod = await this.reportTrendChannelRedeemerModel
        .find({
          date: payload.period,
          program: programID._id,
          channel_name: { $ne: '' }, // tambahkan query untuk menyaring objek dengan channel_name tidak null
        })
        .exec();

      console.log(payload.period, programID._id, 'reportPeriod');

      if (!reportPeriod.length) {
        console.log('-> Report not found!');
        return null;
      }

      const resultHTML = await this.convertHTMLTrendsChannel(reportPeriod);
      console.log(payload, 'payload');
      await this.reportingNotificationService.sendNotificationTrendsChannel(
        payload.notification,
        payload.period,
        resultHTML,
      );

      console.log(
        '-> Report Channel Redeemer Trends (Email) Messenger finish !!',
      );

      serviceResult.message = 'Success report channel redeemer trends email';
      return serviceResult;
    } catch (e) {
      serviceResult.is_error = true;
      serviceResult.message = e.message;
      serviceResult.stack = e.stack;
      return serviceResult;
    }

    // console.log(payload.period, 'payload.period');
    // return payload;
  }

  async reportMessengerChannelRedeemerTrendsErman(
    payload: any,
  ): Promise<ReportingServiceResult> {
    console.log('-> Report Channel Redeemer Trends (Email) Messenger start !!');
    const serviceResult = new ReportingServiceResult({ is_error: false });
    try {
      // counting data from transaction_master_detail
      const reportTrendChannel = await this.counterTrendChannel(payload);
      console.log(reportTrendChannel);
      // generate html
      const resultHTML = await this.convertHTMLTrendsChannelErman(
        reportTrendChannel,
        payload.period,
      );

      // emit to notification
      const notificationPayload = {
        origin: payload.origin,
        tracing_id: payload?.program,
        tracing_master_id: payload?.program,
        notification: [
          {
            via: payload.parameter?.notification?.via,
            template_content: resultHTML,
            param: {
              to: payload?.parameter?.notification?.to,
              cc: payload?.parameter?.notification?.cc,
              html: resultHTML,
              subject: payload?.parameter?.notification?.subject,
            },
          },
        ],
      };
      console.log('-> Emit to notification ..');
      await this.notificationGeneralClient.emit(
        'notification_general',
        notificationPayload,
      );

      // send notification
      // await this.reportingNotificationService.sendNotificationTrendsChannel(
      //   payload.notification,
      //   payload.period,
      //   resultHTML,
      // );

      serviceResult.message = 'Success report channel redeemer trends email';
      return serviceResult;
    } catch (e) {
      serviceResult.is_error = true;
      serviceResult.message = e.message;
      serviceResult.stack = e.stack;
      return serviceResult;
    }
  }

  async counterTrendChannel(payload: any) {
    const period = payload?.period ? new Date(payload.period) : new Date();
    console.log('start period', period);
    console.log('end period', new Date(moment(period).endOf('day').toDate()));
    return this.transactionMasterModel.aggregate([
      {
        $match: {
          program_name: payload.program,
          status: 'Success',
          transaction_date: {
            $gte: period,
            $lt: new Date(moment(period).endOf('day').toDate()),
          },
        },
      },
      {
        $group: {
          _id: { channel_id: '$channel_id', msisdn: '$msisdn' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: { number_of_redeem: '$count', channel_id: '$_id.channel_id' },
          count_msisdn: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.number_of_redeem': 1,
        },
      },
    ]);
  }

  async convertHTMLTrendsChannelErman(data: any, period) {
    const date = moment(period).format('YYYYMMDD');
    // Buat baris data
    const rows = data
      .map(
        (item) =>
          `<tr><td>${date}</td><td>${item?._id?.channel_id}</td><td>${item?._id?.number_of_redeem}</td><td>${item?.count_msisdn}</td></tr>`,
      )
      .join('');

    // Gabungkan baris data menjadi sebuah tabel
    const table = `<div class='flex-container'><h4>Detailed Trend Channel Redeemers Keyword Program Daily Check in ${period}</h4><br><table width='100%'><thead><tr><th>Tanggal</th><th>Channel</th><th>Number of Redeem</th><th>Count MSISDN</th></tr></thead><tbody>${rows}</tbody></table></div>`;

    // Kembalikan elemen tabel HTML
    return table;
  }

  async convertHTMLTrendsChannel(data: any) {
    // Kelompokkan data berdasarkan channel_name
    const channelGroups = {};
    data.forEach((item) => {
      if (!channelGroups[item.channel_name]) {
        channelGroups[item.channel_name] = [];
      }
      channelGroups[item.channel_name].push(item);
    });

    // Urutkan data dalam setiap kelompok berdasarkan jumlah redeem
    for (const key in channelGroups) {
      channelGroups[key].sort((a, b) => a.total_redeem - b.total_redeem);
    }

    // Buat baris data
    let rows = '';
    for (const key in channelGroups) {
      const items = channelGroups[key];
      const row = items
        .map(
          (item) =>
            `<tr>
              <td>${item.date}</td>
              <td>${item.channel_name}</td>
              <td>${item.total_redeem}</td>
              <td>${item.total_msisdn}</td>
            </tr>`,
        )
        .join('');
      rows += row;
    }

    // Gabungkan baris data menjadi sebuah tabel
    const table = `
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Channel</th>
            <th>Number of Redeem</th>
            <th>Count MSISDN</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    // Kembalikan elemen tabel HTML
    return table;
  }

  async reportMessengerErrorRedeemerTrends(
    payload,
  ): Promise<ReportingServiceResult> {
    console.log('-> Report Error Redeemer Trends (Email) Messenger start !!');
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      if (payload?.notification) {
        console.log("-> Parameter 'notification' not found!");
        serviceResult.is_error = true;
        serviceResult.message =
          'Report Error Redeemer Trends (Email): Parameter not found';
        serviceResult.stack = 'Parameter "notification" not found!';

        return serviceResult;
      }

      const reportPeriod = await this.reportErrorRedeemerTrendsModel
        .find({
          period: payload.period,
        })
        .exec();
      if (!reportPeriod) {
        console.log('-> Report not found!');

        serviceResult.message =
          'Report Error Redeemer Trends (Email): Report not found';
        serviceResult.stack = `Report not found at period ${payload.period}!`;
        serviceResult.custom_code = HttpStatus.BAD_REQUEST;

        return serviceResult;
      }

      const htmlResult = await this.htmlReportErrorRedeemerTrends(reportPeriod);
      await this.reportingNotificationService.sendNotificationErrorRedeemerTrends(
        payload.parameter,
        payload.period,
        htmlResult,
      );

      console.log(
        '-> Report Error Redeemer Trends (Email) Messenger finish !!',
      );

      serviceResult.message = 'Success Report Error Redeemer Trends (Email)';
      return serviceResult;
    } catch (e) {
      serviceResult.is_error = true;
      serviceResult.message = e.message;
      serviceResult.stack = e.stack;

      return serviceResult;
    }
    //return payload;
  }

  private async htmlReportErrorRedeemerTrends(payload) {
    const htmlTable = [];

    const rows = payload.map((row) => {
      return `<tr><td>${row.period}</td><td>${row.keyword}</td><td>${row.log_event}</td><td>${row.notification_message}</td><td>${row.total}</td></tr>`;
    });

    htmlTable.push('<table>');
    htmlTable.push('<thead>');
    htmlTable.push('<tr>');
    htmlTable.push('<th>TANGGAL - JAM</th>');
    htmlTable.push('<th>KEYWORD</th>');
    htmlTable.push('<th>LOG_EVENT</th>');
    htmlTable.push('<th>NOTIFIKASI</th>');
    htmlTable.push('<th>JUMLAH</th>');
    htmlTable.push('</tr>');
    htmlTable.push('</thead>');
    htmlTable.push('<tbody>');
    htmlTable.push(rows.join(''));
    htmlTable.push('</tbody>');
    htmlTable.push('</table>');

    return htmlTable.join('');
  }

  async reminder_voucher_expire(payload: any) {
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const amount: number = payload.threshold?.amount ?? 0;
      const unit: string = payload.threshold?.unit ?? '';
      const response = new GlobalTransactionResponse();
      response.transaction_classify = 'REMINDER_VOUCHER_EXPIRE';
      response.trace_custom_code = 'EXP';

      const moment = require('moment-timezone');
      const thresholdDate = new Date(moment().add(amount, unit));
      const aggregate = [
        {
          $match: {
            end_time: { $lt: thresholdDate },
            keyword_id: {
              $exists: true,
              $ne: null,
            },
          },
        },
        {
          $addFields: {
            keywordId: {
              $cond: [
                { $gte: ['$keyword_id', ''] },
                { $toObjectId: '$keyword_id' },
                '',
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'keywords',
            localField: 'keywordId',
            foreignField: '_id',
            as: 'keyword',
          },
        },
        {
          $project: {
            _id: 0,
            program_name: '$keyword.eligibility.program_title_expose',
            voucher_type: '$voucher_type',
            end_time: '$end_time',
          },
        },
      ];

      // TODO : Check this query
      await this.transactionVoucherModel
        .aggregate(aggregate)
        .exec()
        .then(
          async (
            findVoucherExpired,
            notificationGeneralClient = this.notificationGeneralClient,
          ) => {
            console.log('find data' + findVoucherExpired);
            const notificationContent =
              payload.parameter.notification.notif_content;
            const via = payload.parameter.notification.via;
            const to = payload.parameter.notification.to;
            if (findVoucherExpired.length > 0) {
              const notificationPayload = {
                origin: payload.origin,
                tracing_id: false,
                tracing_master_id: false,
                notification: [],
              };
              findVoucherExpired.forEach(function (index: any) {
                const mapObj = {
                  voucherCode: index.voucher_code,
                  programName: index.program_name,
                  expDateVoucher: index.end_time,
                };
                const res = notificationContent.replace(
                  /\b(?:voucherCode|programName|expDateVoucher)\b/gi,
                  (matched) => mapObj[matched],
                );
                notificationPayload.notification.push({
                  via: via,
                  template_content: res,
                  to: to,
                });

                notificationGeneralClient.emit(
                  payload.target_topic,
                  notificationPayload,
                );
              });
            }
          },
        );
      //.catch((e) => console.error(e));

      serviceResult.message = 'Reminder voucher expired success';
      return serviceResult;
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      return serviceResult;
    }
  }

  async generateLocationPrefix(payload: any): Promise<any> {
    try {
      const currentDateTime = moment().utc();
      const dirPath = payload.parameter.dir;
      const fileName = 'atp_regional.csv';
      console.log('currentDateTime UTC', currentDateTime);
      console.log('dirPath', dirPath);

      const isLocationPrefixAlreadyGenerated =
        (await this.locationPrefixModel.count({})) > 0;

      console.log('TOTAL', await this.locationPrefixModel.count({}));

      if (isLocationPrefixAlreadyGenerated) {
        return {
          is_error: false,
          message: `location prefix already generated`,
          stack: null,
          custom_code: HttpStatus.BAD_REQUEST,
          result: null,
        };
      }

      const isFileExist = await checkExistingFile(`${dirPath}${fileName}`);

      if (!isFileExist) {
        console.log(`${fileName} doesn't exist`);
        return {
          is_error: false,
          message: `${fileName} doesn't exist`,
          stack: null,
          custom_code: HttpStatus.NOT_FOUND,
          result: null,
        };
      }

      const { data: dataFile } = readOneFile(dirPath, fileName);
      const arrayLocationPrefix = [];

      for (const data of dataFile) {
        arrayLocationPrefix.push({
          regional: data.regional,
          area: data.area,
          prefix:
            data.prefix.length > 6 ? data.prefix.slice(0, -1) : data.prefix,
          origin_prefix: data.prefix,
          area_id: data.area_id,
          region_id: data.region_id,
        });
      }

      // insert to collection locationPrefix
      await this.locationPrefixModel.insertMany(arrayLocationPrefix);

      console.log('arrayLocationPrefix', arrayLocationPrefix);
      console.log('SUCCESS INSERT LOCATION PREFIX');

      return {
        is_error: false,
        message: 'success generate location prefix',
        stack: null,
        custom_code: HttpStatus.OK,
        result: JSON.stringify({
          time: currentDateTime,
          result: arrayLocationPrefix,
        }),
      };
    } catch (error) {
      return {
        is_error: true,
        message: error.message,
        stack: error?.stack,
        custom_code: HttpStatus.INTERNAL_SERVER_ERROR,
        result: null,
      };
    }
  }

  convertSubscriberBrand(subscriberBrand: string, msisdn: string): string {
    let result = '';

    if (
      typeof subscriberBrand == 'string' &&
      ![null, undefined, '', []].includes(subscriberBrand)
    ) {
      return subscriberBrand;
    }

    const slicedPart = msisdn.substring(0, 3);

    switch (slicedPart) {
      case '811':
        result = 'HALLO';
        break;
      case '812':
      case '813':
      case '821':
      case '822':
        result = 'SIMPATI';
        break;
      case '851':
      case '852':
      case '853':
        result = 'AS';
        break;
      default:
        result = 'OTHERS';
    }

    return result;
  }

  private generatePeriod(inputPeriod: number, startDate) {
    const resultPeriod = {};
    let currentDate = moment(startDate);
    let index = 0;

    while (
      currentDate.format('YYYY-MM-DD') ===
      moment(startDate).format('YYYY-MM-DD')
    ) {
      let periodKey = index === 0 ? 'early_day' : `early_day_${index}`;
      const startTime = moment(currentDate);
      let endTime = moment(currentDate)
        .add(inputPeriod - 1, 'hours')
        .endOf('hour');

      if (endTime.isSameOrAfter(moment(startDate).endOf('day'))) {
        periodKey = 'night';
        endTime = moment(startDate).endOf('day');
      }

      resultPeriod[periodKey] = {
        start_date: startTime.toISOString(),
        end_date: endTime.toISOString(),
      };

      currentDate = moment(currentDate).add(inputPeriod, 'hours');
      index++;
    }

    return resultPeriod;
  }

  async get_fact_detail(payload: any) {
    console.log(
      '\n\n\n ====================================================================================================== FACT DETAIL',
    );
    let totalRow = 0;
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      console.log('-> Get Fact Detail start !!');

      // Prepare for generate file
      // TODO : remove the time from payload.parameter.file_name
      // const fileName = `${payload.parameter.file_name}${moment(payload.period)
      //   .format('YYYYMMDD')
      //   .toString()
      //   .substring(-8)}.dat`;

      const fileName = `poin_fact_report_detail_${moment(payload.period)
        .format('YYYYMMDD')
        .toString()
        .substring(-8)}.dat`;

      const dir = payload.parameter.generate_dir;
      const dirFile = `${dir}/${fileName}`;
      console.log('dirFile : ', dirFile);

      const currenTime = moment().utc();
      const { _id: cronConfigId, last_running_time } =
        await this.cronConfigModel.findOne({
          'payload.service_name': payload.service_name,
        });
      console.log('currenTime', currenTime);
      console.log('last_running_time', last_running_time);

      if (last_running_time !== null) {
        const currentDate = currenTime.add(7, 'hours').startOf('days');
        const lastRunning = moment(last_running_time)
          .utc()
          .add(7, 'hours')
          .startOf('days');
        const isAlreadyRunToday = currentDate.isSame(lastRunning);

        console.log('currentDate', currentDate);
        console.log('lastRunning', lastRunning);

        if (isAlreadyRunToday) {
          console.log('isAlreadyRunToday', isAlreadyRunToday);
          serviceResult.message = `Fact detail report already run today`;
          await this.checkAndSetLog(
            'Fact Detail Report',
            serviceResult,
            payload,
            new Date(),
          );
          return;
        }
      }

      // update status last running time in cron config
      await this.cronConfigModel.updateOne(
        { _id: cronConfigId },
        { last_running_time: currenTime },
      );
      console.log('=== success update last running time ===');

      payload.period = moment(payload.period).endOf('day');
      const excludeKeywords = payload.parameter.exclude_keyword ?? [];
      const startPeriod = moment(payload.period).startOf('day');
      // const endPeriod = moment(payload.period).endOf('day');

      const periodRange = payload.parameter.range ?? 3;
      const period = this.generatePeriod(periodRange, startPeriod);
      console.log('PERIOD RANGE', periodRange);
      console.log('Period', period);

      for (const keyName in period) {
        console.log('keyName', keyName);
        console.time(`query-${keyName}`);
        let factDetail: any = await this.getFactDetail(
          period[keyName].start_date,
          period[keyName].end_date,
          excludeKeywords,
        );
        console.log(`QUERY ${keyName} END AT :`, moment().utc());
        console.timeEnd(`query-${keyName}`);
        const totalRecords = factDetail.length;
        totalRow = totalRow + totalRecords;
        console.log(`total records ${keyName}`, totalRecords);
        console.log(`total row ${keyName}`, totalRow);

        if (totalRecords > 0) {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          const batchSize = 20000;
          let content = ``;

          for (
            let batchStart = 0;
            batchStart < totalRecords;
            batchStart += batchSize
          ) {
            const batchEnd = Math.min(batchStart + batchSize, totalRecords);
            console.log(
              `pengolahan data fact detail report: ${batchEnd} of ${totalRecords}`,
            );
            for (let index = batchStart; index < batchEnd; index++) {
              // const subscriberBrand = this.convertSubscriberBrand(
              //   factDetail[index].subscriber_brand,
              //   factDetail[index].msisdn,
              // );

              const transactionDate = factDetail[index]?.transaction_date
                ? this.convertDateTime(factDetail[index].transaction_date)
                : '';
              const startDate = factDetail[index]?.start_date
                ? this.convertDateTime(factDetail[index].start_date)
                : '';
              const endDate = factDetail[index]?.end_date
                ? this.convertDateTime(factDetail[index].end_date)
                : '';

              const formattedTrxDate = transactionDate
                ? this.formattedTrxDate(transactionDate.toISOString())
                : '';
              const formattedStartDate = startDate
                ? this.formatDateToDDMMMYY(
                    this.formattedTrxDate(startDate.toISOString()),
                  )
                : '';
              const formattedEndDate = endDate
                ? this.formatDateToDDMMMYY(
                    this.formattedTrxDate(endDate.toISOString()),
                  )
                : '';

              // const targetMsisdn = allowedIndihomeNumber(
              //   factDetail[index].msisdn,
              // )
              //   ? factDetail[index].msisdn
              //   : `62${('6' + factDetail[index]?.msisdn).substring(1)}`;

              const targetMsisdn = msisdnCombineFormatToId(
                factDetail[index].msisdn,
              );

              // console.log(`>>>>>>>>>>>>>>>>>>>>>>>>Replacing to IH ${factDetail[index].msisdn}`);
              // const targetMsisdn = factDetail[index].msisdn;
              content += formattedTrxDate;
              // content += `|${factDetail[index].msisdn ?? ''}|${
              //   factDetail[index].keyword ?? ''
              // }|${factDetail[index].program_name ?? ''}|${
              //   factDetail[index].program_owner ?? ''
              // }|${factDetail[index].detail_program_owner ?? ''}|${
              //   factDetail[index].created_by ?? ''
              // }|${factDetail[index].lifestyle ?? ''}|${
              //   factDetail[index].category ?? ''
              // }|${factDetail[index].keyword_title ?? ''}|${
              //   factDetail[index].SMS ?? ''
              // }|${factDetail[index].UMB ?? ''}|${
              //   factDetail[index].point
              //     ? validationKeywordPointValueRule(factDetail[index].point)
              //     : ''
              // }|${subscriberBrand}|${
              //   factDetail[index].program_regional ?? 'OTHERS'
              // }|${factDetail[index].cust_value ?? ''}|`;
              // content += formattedStartDate;
              // content += `|`;
              // content += formattedEndDate;
              // content += `|${factDetail[index].merchant_name ?? ''}|${
              //   factDetail[index].subscriber_region ?? 'OTHERS'
              // }|${factDetail[index].subscriber_branch ?? 'OTHERS'}|${
              //   factDetail[index].channel_code ?? ''
              // }|${factDetail[index].subsidy ?? ''}|${
              //   factDetail[index].subscriber_tier ?? ''
              // }|${factDetail[index].voucher_code ?? ''}\n`;
              content += `|${targetMsisdn}|${factDetail[index].keyword}|${
                factDetail[index].program_name
              }|${factDetail[index].program_owner}|${
                factDetail[index].detail_program_owner
              }|${factDetail[index].created_by}|${
                factDetail[index].lifestyle
              }|${factDetail[index].category}|${
                factDetail[index].keyword_title
              }|${factDetail[index].SMS}|${factDetail[index].UMB}|${
                factDetail[index]
                  ? validationKeywordPointValueRule(factDetail[index].point)
                  : ''
              }|${factDetail[index].subscriber_brand}|${
                factDetail[index].program_regional
              }|${factDetail[index].cust_value ?? '0'}|`;
              content += formattedStartDate;
              content += `|`;
              content += formattedEndDate;
              content += `|${factDetail[index].merchant_name}|${
                factDetail[index].subscriber_region
              }|${factDetail[index].subscriber_branch}|${
                factDetail[index].channel_code
              }|${factDetail[index].subsidy}|${
                factDetail[index].subscriber_tier
              }|${factDetail[index].voucher_code ?? ''}|${allowedIndihomeNumber(
                factDetail[index].msisdn,
              )}\n`;
            }
            fs.appendFileSync(dirFile, content);
            content = ''; // Reset content for the next batch
          }

          console.log('File generate success <--> end');
        } else {
          console.log('1 cek error');
          console.log('-> Data Not Found !!');
          serviceResult.message = 'Fact detail not found';
        }

        // if (keyName === 'night' && totalRow > 0) { // Tanaka : Take out to always generate ctl after dat generated
        if (totalRow > 0) {
          const ctlDirFile = dirFile.replace('.dat', '.ctl');
          const stats = fs.statSync(dirFile);
          const fileSizeInBytes = stats.size;

          fs.writeFileSync(
            ctlDirFile,
            `${fileName}|${totalRow}|${fileSizeInBytes}\n`,
          );

          console.log('CTL file generate success <--> end');

          const payloadSftp = payload.sftp_config;
          console.log('1 cek');
          payloadSftp.generated_file = dirFile;
          console.log('2 cek');
          await this.sftpClient.emit('sftp-outgoing', payloadSftp);

          console.log('3 cek');
          serviceResult.message =
            'Success get fact detail & generate .ctl file';
        }

        factDetail = '';
      }

      console.log('-> Get Fact Detail finish !!');

      await this.checkAndSetLog(
        'Fact Detail Report',
        serviceResult,
        payload,
        new Date(),
      );
    } catch (error) {
      console.log('1 cek error 11');
      console.log(error);
      console.log(error.message);
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;
      await this.checkAndSetLog(
        'Fact Detail Report',
        serviceResult,
        payload,
        new Date(),
      );
    }
  }

  async getFactDetail(
    startDate: any,
    endDate: any,
    excludeKeywords: Array<string>,
  ) {
    const start_date = moment(startDate);
    const end_date = moment(endDate);

    const queryMatch = {
      $match: {
        // keyword: { $ne: '0POIN' },
        transaction_date: {
          $gte: start_date.toDate(),
          $lte: end_date.toDate(),
        },
        status: 'Success',
        origin: {
          $regex: /^redeem/,
        },
      },
    };

    if (excludeKeywords.length > 0) {
      const exclude = { keyword: { $nin: excludeKeywords } };

      queryMatch.$match = {
        ...exclude,
        ...queryMatch.$match,
      };
    }

    console.log('queryMatch', JSON.stringify(queryMatch));

    const factDetail = await this.transactionMasterModel
      .aggregate([
        queryMatch,
        {
          $lookup: {
            from: 'transaction_master_detail',
            localField: 'transaction_id',
            foreignField: 'payload.redeem.master_id',
            as: 'transaction_detail',
          },
        },
        {
          $project: {
            _id: 0,
            transaction_date: '$transaction_date',
            // msisdn: { $substr: ['$msisdn', 2, { $strLenCP: '$msisdn' }] },
            msisdn: '$msisdn',
            keyword: '$keyword',
            program_name: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.program' }, 0],
                },
                then: '',
                else: {
                  $arrayElemAt: ['$transaction_detail.payload.program.name', 0],
                },
              },
            },
            program_owner: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.program' }, 0],
                },
                then: '',
                else: {
                  $convert: {
                    input: {
                      $arrayElemAt: [
                        '$transaction_detail.payload.program.program_owner',
                        0,
                      ],
                    },
                    to: 'objectId',
                    onError: 'null',
                  },
                },
              },
            },
            detail_program_owner: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.program' }, 0],
                },
                then: '',
                else: {
                  $convert: {
                    input: {
                      $arrayElemAt: [
                        '$transaction_detail.payload.program.program_owner_detail',
                        0,
                      ],
                    },
                    to: 'objectId',
                    onError: 'null',
                  },
                },
              },
            },
            created_by: {
              $cond: {
                if: { $eq: [{ $ifNull: ['$created_by', null] }, null] },
                then: '',
                else: {
                  $convert: {
                    input: '$created_by',
                    to: 'objectId',
                    onError: 'null',
                  },
                },
              },
            },
            lifestyle: {
              $cond: {
                if: {
                  $eq: [
                    {
                      $size: '$transaction_detail.payload.keyword.eligibility',
                    },
                    0,
                  ],
                },
                then: '',
                else: {
                  $convert: {
                    input: {
                      $arrayElemAt: [
                        {
                          $arrayElemAt: [
                            '$transaction_detail.payload.keyword.eligibility.program_experience',
                            0,
                          ],
                        },
                        0,
                      ],
                    },
                    to: 'objectId',
                    onError: 'null',
                  },
                },
              },
            },
            keyword_title: '$keyword',
            SMS: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.incoming' }, 0],
                },
                then: '0',
                else: {
                  $cond: {
                    if: {
                      $regexMatch: {
                        input: {
                          $toLower: {
                            $arrayElemAt: [
                              '$transaction_detail.payload.incoming.channel_id',
                              0,
                            ],
                          },
                        },
                        regex: 'sms',
                      },
                    },
                    then: '1',
                    else: '0',
                  },
                },
              },
            },
            UMB: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.incoming' }, 0],
                },
                then: '0',
                else: {
                  $cond: {
                    if: {
                      $regexMatch: {
                        input: {
                          $toLower: {
                            $arrayElemAt: [
                              '$transaction_detail.payload.incoming.channel_id',
                              0,
                            ],
                          },
                        },
                        regex: 'umb',
                      },
                    },
                    then: '1',
                    else: '0',
                  },
                },
              },
            },
            point: {
              // biar panggil fungsi validationKeywordPointValueRule
              $cond: {
                if: { $eq: [{ $size: '$transaction_detail.payload' }, 0] },
                then: '',
                else: { $arrayElemAt: ['$transaction_detail.payload', 0] },
              },
            },
            // subscriber_brand: {
            //   $cond: {
            //     if: {
            //       $or: [
            //         { $eq: [{ $size: '$transaction_detail.payload.customer.brand' }, 0] },
            //         { $eq: ['$transaction_detail.payload.customer.brand', null] },
            //         { $eq: ['$transaction_detail.payload.customer.brand', []] },
            //       ],
            //     },
            //     then: {
            //       $switch: {
            //         branches: [
            //           { case: { $eq: [{ $substr: ['$msisdn', 2, 3] }, '811'] }, then: 'HALLO' },
            //           { case: { $eq: [{ $substr: ['$msisdn', 2, 3] }, '812'] }, then: 'SIMPATI' },
            //           { case: { $eq: [{ $substr: ['$msisdn', 2, 3] }, '813'] }, then: 'SIMPATI' },
            //           { case: { $eq: [{ $substr: ['$msisdn', 2, 3] }, '821'] }, then: 'SIMPATI' },
            //           { case: { $eq: [{ $substr: ['$msisdn', 2, 3] }, '822'] }, then: 'SIMPATI' },
            //           { case: { $eq: [{ $substr: ['$msisdn', 2, 3] }, '851'] }, then: 'AS' },
            //           { case: { $eq: [{ $substr: ['$msisdn', 2, 3] }, '852'] }, then: 'AS' },
            //           { case: { $eq: [{ $substr: ['$msisdn', 2, 3] }, '853'] }, then: 'AS' },
            //         ],
            //         default: '',
            //       },
            //     },
            //     else: {
            //       $arrayElemAt: ['$transaction_detail.payload.customer.brand', 0]
            //     },
            //   },
            // },
            subscriber_brand: {
              $arrayElemAt: ['$transaction_detail.payload.customer.brand', 0],
            },
            program_regional: { $substr: ['$msisdn', 2, 6] },
            cust_value: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.keyword' }, 0],
                },
                then: '',
                else: {
                  $arrayElemAt: [
                    '$transaction_detail.payload.keyword.eligibility.customer_value',
                    0,
                  ],
                },
              },
            },
            start_date: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.keyword' }, 0],
                },
                then: '',
                else: {
                  $arrayElemAt: [
                    '$transaction_detail.payload.keyword.eligibility.start_period',
                    0,
                  ],
                },
              },
            },
            end_date: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.keyword' }, 0],
                },
                then: '',
                else: {
                  $arrayElemAt: [
                    '$transaction_detail.payload.keyword.eligibility.end_period',
                    0,
                  ],
                },
              },
            },
            merchant_name: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.keyword' }, 0],
                },
                then: '',
                else: {
                  $convert: {
                    input: {
                      $arrayElemAt: [
                        '$transaction_detail.payload.keyword.eligibility.merchant',
                        0,
                      ],
                    },
                    to: 'objectId',
                    onError: 'null',
                  },
                },
              },
            },
            subscriber_region: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.customer' }, 0],
                },
                then: 'OTHERS',
                else: {
                  $arrayElemAt: [
                    '$transaction_detail.payload.customer.region',
                    0,
                  ],
                },
              },
            },
            subscriber_branch: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.customer' }, 0],
                },
                then: 'OTHERS',
                else: {
                  $arrayElemAt: [
                    '$transaction_detail.payload.customer.city',
                    0,
                  ],
                },
              },
            },
            channel_code: {
              $cond: {
                if: { $eq: [{ $ifNull: ['$channel_id', null] }, null] },
                then: '',
                else: '$channel_id',
              },
            },
            subsidy: {
              $cond: {
                if: {
                  $eq: [
                    {
                      $arrayElemAt: [
                        '$transaction_detail.payload.keyword.eligibility.program_bersubsidi',
                        0,
                      ],
                    },
                    true,
                  ],
                },
                then: 'Y',
                else: 'N',
              },
            },
            subscriber_tier: {
              $cond: {
                if: {
                  $eq: [{ $size: '$transaction_detail.payload.customer' }, 0],
                },
                then: '',
                else: {
                  $arrayElemAt: [
                    {
                      $arrayElemAt: [
                        '$transaction_detail.payload.customer.loyalty_tier.name',
                        0,
                      ],
                    },
                    0,
                  ],
                },
              },
            },
            voucher_code: {
              $cond: {
                if: {
                  $eq: [
                    {
                      $size: '$transaction_detail.payload.payload.voucher.core',
                    },
                    0,
                  ],
                },
                then: '',
                else: {
                  $arrayElemAt: [
                    '$transaction_detail.payload.payload.voucher.core.voucher_code',
                    0,
                  ],
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'accounts',
            localField: 'created_by',
            foreignField: '_id',
            as: 'created_by',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            localField: 'program_owner',
            foreignField: '_id',
            as: 'program_owner',
          },
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'detail_program_owner',
            foreignField: '_id',
            as: 'detail_program_owner',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            localField: 'lifestyle',
            foreignField: '_id',
            as: 'lifestyle',
          },
        },
        {
          $lookup: {
            from: 'locationprefixes',
            localField: 'program_regional',
            foreignField: 'prefix',
            as: 'program_regional',
          },
        },
        {
          $lookup: {
            from: 'merchantv2',
            localField: 'merchant_name',
            foreignField: '_id',
            as: 'merchant_name',
          },
        },
        {
          $project: {
            transaction_date: 1,
            msisdn: 1,
            keyword: 1,
            program_name: 1,
            program_owner: {
              $cond: {
                if: { $eq: [{ $size: '$program_owner' }, 0] },
                then: '',
                else: { $arrayElemAt: ['$program_owner.set_value', 0] },
              },
            },
            detail_program_owner: {
              $cond: {
                if: { $eq: [{ $size: '$detail_program_owner' }, 0] },
                then: '',
                else: { $arrayElemAt: ['$detail_program_owner.name', 0] },
              },
            },
            created_by: {
              $cond: {
                if: { $eq: [{ $size: '$created_by' }, 0] },
                then: '',
                else: { $arrayElemAt: ['$created_by.user_name', 0] },
              },
            },
            lifestyle: {
              $cond: {
                if: { $eq: [{ $size: '$lifestyle' }, 0] },
                then: '',
                else: { $arrayElemAt: ['$lifestyle.set_value', 0] },
              },
            },
            category: {
              $cond: {
                if: { $eq: [{ $size: '$lifestyle' }, 0] },
                then: '',
                else: { $arrayElemAt: ['$lifestyle.set_value', 0] },
              },
            },
            keyword_title: 1,
            SMS: 1,
            UMB: 1,
            point: 1,
            subscriber_brand: 1,
            program_regional: {
              $toUpper: { $arrayElemAt: ['$program_regional.area', 0] },
            },
            cust_value: 1,
            start_date: 1,
            end_date: 1,
            merchant_name: {
              $cond: {
                if: { $eq: [{ $size: '$merchant_name' }, 0] },
                then: '',
                else: { $arrayElemAt: ['$merchant_name.merchant_name', 0] },
              },
            },
            subscriber_region: 1,
            subscriber_branch: 1,
            channel_code: 1,
            subsidy: 1,
            subscriber_tier: 1,
            voucher_code: 1,
          },
        },
      ])
      .allowDiskUse(true);
    // console.log('RESULT', JSON.stringify(factDetail));
    // console.log('RESULT', factDetail);

    return factDetail;
  }

  async sftp_outgoing(payload, trxName?): Promise<ReportingServiceResult> {
    try {
      await this.sftpClient.emit('sftp-outgoing', payload);

      return new ReportingServiceResult({
        is_error: false,
        message: `Success emit to sftp outgoing for ${trxName ?? ''}`,
      });
    } catch (error) {
      return new ReportingServiceResult({
        is_error: true,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  private convertDateTime(datetime: Date): Date {
    const now = new Date(datetime);
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * -60000);

    return utc;
  }

  private formattedTrxDate(datetime: string): string {
    const [datePart, timePart] = datetime.split('T');

    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');

    return `${day}/${month}/${year} ${hour}:${minute}`;
  }

  private formatDateToDDMMMYY(datetime: string): string {
    const monthsShort = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    let [day, month, year] = datetime.split('/');
    month = monthsShort[parseInt(month) - 1];
    year = year.split(' ')[0].slice(-2);
    day = day;

    return `${day}-${month}-${year}`;
  }

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

  async proceedAll(reportPeriod, payload) {
    // mapping HTML Parse template Solusi
    let htmlParse;
    if (payload.parameter.is_fmc) {
      htmlParse = {
        point_owner: reportPeriod.point_owner,
        gross_revenue: reportPeriod.gross_revenue,
        poin_earned: reportPeriod.poin_earned,
        redeemer_existing: reportPeriod.redeemer_existing,
        reward_live_system: reportPeriod.reward_live_system,
        reward_trx: reportPeriod.reward_trx,
        program: reportPeriod.program,
        redeemer: reportPeriod.redeemer,
        gross_revenue_redeemer: reportPeriod.gross_revenue_redeemer,
        poin_earned_redeemer: reportPeriod.poin_earned_redeemer,
        point_burning: reportPeriod.point_burning,
        trx_burn: reportPeriod.trx_burn,
        redeemer_mytelkomsel: reportPeriod.redeemer_mytelkomsel,
        gross_revenue_redeemer_mytelkomsel:
          reportPeriod.gross_revenue_redeemer_mytelkomsel,
        poin_earned_redeemer_mytelkomsel:
          reportPeriod.poin_earned_redeemer_mytelkomsel,
        poin_burning_mytelkomsel: reportPeriod.poin_burning_mytelkomsel,
        trx_burn_mytelkomsel: reportPeriod.trx_burn_mytelkomsel,
        redeemer_fixed: reportPeriod.redeemer_indihome,
        gross_revenue_redeemer_fixed:
          reportPeriod.gross_revenue_redeemer_indihome,
        poin_earned_redeemer_fixed: reportPeriod.poin_earned_redeemer_indihome,
        point_burning_fixed: reportPeriod.point_burning_indihome,
        trx_burn_fixed: reportPeriod.trx_burn_indihome,
        redeemer_mobile: reportPeriod.redeemer_telco,
        gross_revenue_redeemer_mobile:
          reportPeriod.gross_revenue_redeemer_telco,
        poin_earned_redeemer_mobile: reportPeriod.poin_earned_redeemer_telco,
        point_burning_mobile: reportPeriod.point_burningtelco,
        trx_burn_mobile: reportPeriod.trx_burn_telco,
      };
    } else {
      htmlParse = {
        point_owner: reportPeriod.point_owner,
        gross_revenue: reportPeriod.gross_revenue,
        poin_earned: reportPeriod.poin_earned,
        redeemer_existing: reportPeriod.redeemer_existing,
        reward_live_system: reportPeriod.reward_live_system,
        reward_trx: reportPeriod.reward_trx,
        program: reportPeriod.program,
        redeemer: reportPeriod.redeemer,
        gross_revenue_redeemer: reportPeriod.gross_revenue_redeemer,
        poin_earned_redeemer: reportPeriod.poin_earned_redeemer,
        point_burning: reportPeriod.point_burning,
        trx_burn: reportPeriod.trx_burn,
        redeemer_mytelkomsel: reportPeriod.redeemer_mytelkomsel,
        gross_revenue_redeemer_mytelkomsel:
          reportPeriod.gross_revenue_redeemer_mytelkomsel,
        poin_earned_redeemer_mytelkomsel:
          reportPeriod.poin_earned_redeemer_mytelkomsel,
        poin_burning_mytelkomsel: reportPeriod.poin_burning_mytelkomsel,
        trx_burn_mytelkomsel: reportPeriod.trx_burn_mytelkomsel,
      };
    }

    return await this.sendReportDaily(htmlParse, payload);
  }

  async sendReportDaily(htmlParse, payload) {
    // console.log(htmlParse, 'htmlParse reportPeriod ');

    const htmlResult = await formatReport(htmlParse);
    // console.log(htmlResult, 'log summary htmlResult ');

    await this.reportingNotificationService.sendNotificationDailySummaryPoint(
      payload.parameter,
      payload.period,
      htmlResult,
    );
  }
}
