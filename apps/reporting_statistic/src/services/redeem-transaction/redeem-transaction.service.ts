import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import * as moment from 'moment';
import { Model } from 'mongoose';

import {
  CustomerBrand,
  CustomerBrandDocument,
} from '@/customer/models/customer.brand.model';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';
import {
  ReportRedeemTransaction,
  ReportRedeemTransactionDocument,
} from '../../model/redeem-transaction/redeem-transaction.model';
import { CronConfig, CronConfigDocument } from '../../../../cron/src/models/cron.config.model';
import { ConfigService } from '@nestjs/config';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';

@Injectable()
export class ReportRedeemTransactionService {
  constructor(
    @Inject('SFTP_SERVICE_PRODUCER') private readonly sftpClient: ClientKafka,

    @InjectModel(ReportRedeemTransaction.name, 'reporting')
    private reportRedeemTransactionModel: Model<ReportRedeemTransactionDocument>,

    @InjectModel(CustomerBrand.name)
    private customerBrandModel: Model<CustomerBrandDocument>,

    @InjectModel(CronConfig.name)
    private cronConfigModel: Model<CronConfigDocument>,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
  ) {}

  async generateReportData(payload: any) {
    const serviceResult = new ReportingServiceResult({
      is_error: false,
      message: '',
      stack: '',
    });

    try {
      const currenTime = moment().utc();
      const { _id: cronConfigId, last_running_time } = await this.cronConfigModel.findOne({ 'payload.service_name': payload.service_name });
      console.log('currenTime', currenTime);
      console.log('last_running_time', last_running_time);

      if (last_running_time !== null) {
        const currentDate = currenTime.add(7, 'hours').startOf('days');
        const lastRunning = moment(last_running_time).utc().add(7, 'hours').startOf('days');
        const isAlreadyRunToday = currentDate.isSame(lastRunning);

        console.log('currentDate', currentDate);
        console.log('lastRunning', lastRunning);

        if (isAlreadyRunToday) {
          console.log('isAlreadyRunToday', isAlreadyRunToday);
          serviceResult.message = `Report redeem transanction already run today`;
          await this.checkAndSetLog(
            'Report Redeem Transaction',
            serviceResult,
            payload,
            new Date(),
          );
          return;
        }
      }

      // update status last running time in cron config
      await this.cronConfigModel.updateOne({ _id: cronConfigId }, { last_running_time: currenTime });
      console.log('=== success update last running time ===');

      if (payload.parameter) {
        const data = await this.getDataByDate(payload);
        const totalRecords = data.length;
        console.log('ttoal factDetail data :  ', totalRecords);

        if (totalRecords > 0) {
          // Prepare for generate file
          const fileName = `fact_atp_redeem_${moment(payload.period).format(
            'YYYYMMDD',
          )}.dat`;
          const dir = payload.parameter.generate_dir;
          const dirFile = `${dir}/${fileName}`;

          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // const content = this.buildReportContent(data);
          const batchSize = 20000;
          let content = ``;

          for (
            let batchStart = 0;
            batchStart < totalRecords;
            batchStart += batchSize
          ) {
            const batchEnd = Math.min(batchStart + batchSize, totalRecords);
            console.log(`pengolahan data report redeem transaction: ${batchEnd} of ${totalRecords}`);
            for (let index = batchStart; index < batchEnd; index++) {
              const temporaryContent = [
                data[index].transaction_id,
                data[index].keyword,
                data[index].keyword_title,
                data[index].execution_type,
                data[index].product_id,
                data[index].period1,
                data[index].period2,
                data[index].subscriber_id,
                data[index].msisdn,
                data[index].return_value,
                moment(data[index].execution_date).format('YYYYMMDDHHmmss'),
                data[index].channel_code,
                data[index].transaction_status,
                data[index].trdm_last_act,
                data[index].trdm_act_status,
                data[index].trdm_evd_id,
                data[index].trdm_flag_kirim,
                data[index].trdm_geneva_exec,
                data[index].trdm_keyword,
                data[index].trdm_tgl_kirim,
                data[index].channel_transaction_id,
                data[index].card_type,
                data[index].brand,
                data[index].subscriber_region,
                data[index].subscriber_branch,
                data[index].lacci,
              ];

              content += `${temporaryContent.join('|')}\n`;
            }
            console.log('batchStart', batchStart);
            fs.appendFileSync(dirFile, content);
            content = ''; // Reset content for the next batch
          }

          console.log('File generate success <--> end');

          // fs.writeFileSync(dirFile, content);

          const payloadSftp = payload.sftp_config;
          payloadSftp.generated_file = dirFile;
          payloadSftp.file_extension = 'dat';
          payloadSftp.server_destination = payload.parameter.server_destination;
          await this.sftpClient.emit('sftp-outgoing', payloadSftp);
        } else {
          console.log('1 cek error');
          console.log('-> Data Not Found !!');
          serviceResult.message = 'Report redeem transanction not found';
        }
      }

      serviceResult.message = 'Success generate report data';
      await this.checkAndSetLog(
        'Report Redeem Transaction',
        serviceResult,
        payload,
        new Date(),
      );
    } catch (error) {
      console.log('1 cek error 11');
      console.log(error.message);
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      await this.checkAndSetLog(
        'Report Redeem Transaction',
        serviceResult,
        payload,
        new Date(),
      );
    }

    // return payload;
  }

  async createReportData(payload: any) {
    const transaction_date = payload.submit_time
      ? moment(payload.submit_time)
      : moment();
    const customer_brand =
      payload.customer && payload.customer.brand
        ? await this.customerBrandModel.findById(payload.customer.brand)
        : null;

    const data = new this.reportRedeemTransactionModel({
      transaction_date,
      transaction_id: payload.redeem ? payload.redeem.master_id : null,
      keyword: payload.redeem ? payload.redeem.keyword : null,
      keyword_title: payload.keyword
        ? payload.keyword.program_title_expose
        : null,
      execution_type: 'IMED',
      product_id: null,
      // period1: null,
      // period2: null,
      subscriber_id: null,
      msisdn: payload.redeem ? payload.redeem.msisdn : null,
      return_value: payload.redeem ? payload.redeem.keyword : null,
      execution_date: transaction_date.format('DDMMYYYY'),
      channel_code: null,
      transaction_status: payload.transaction_status == 'Success' ? 1 : 0,
      trdm_last_act: '',
      trdm_act_status: '',
      trdm_evd_id: payload.redeem ? payload.redeem.master_id : null,
      // trdm_flag_kirim: null,
      // trdm_geneva_exec: null,
      trdm_keyword: payload.redeem ? payload.redeem.keyword : null,
      // trdm_tgl_kirim: null,
      // channel_transaction_id: null,
      card_type:
        payload.customer && payload.customer.pre_pst_flag
          ? 'POSTPAID'
          : 'PREPAID',
      brand: customer_brand ? customer_brand.name : null,
      subscriber_region: payload.customer ? payload.customer.region : null,
      subscriber_branch: payload.customer
        ? payload.customer.core_branch_id
        : null,
      lacci: payload.customer ? payload.customer.region_lacci : null,
    });

    await data.save();
  }

  private async getDataByDate(payload: any): Promise<any> {
    payload.period = moment(payload.period).endOf('day');
    const start_date = moment(payload.period).startOf('days');
    const end_date = moment(payload.period).endOf('days');
    console.log('payload period', payload.period);
    console.log('start', start_date);
    console.log('end', end_date);

    return await this.reportRedeemTransactionModel
      .find({
        transaction_date: {
          $gte: start_date.toDate(),
          $lte: end_date.toDate(),
        },
      })
      .lean();
  }

  private buildReportContent(data: any) {
    let content = ``;

    for (const d of data) {
      const c = [];

      c.push(
        d.transaction_id,
        d.keyword,
        d.keyword_title,
        d.execution_type,
        d.product_id,
        d.period1,
        d.period2,
        d.subscriber_id,
        d.msisdn,
        d.return_value,
        moment(d.execution_date).format('YYYYMMDDHHmmss'),
        d.channel_code,
        d.transaction_status,
        d.trdm_last_act,
        d.trdm_act_status,
        d.trdm_evd_id,
        d.trdm_flag_kirim,
        d.trdm_geneva_exec,
        d.trdm_keyword,
        d.trdm_tgl_kirim,
        d.channel_transaction_id,
        d.card_type,
        d.brand,
        d.subscriber_region,
        d.subscriber_branch,
        d.lacci,
      );

      content += `${c.join('|')}\n`;
    }

    return content;
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
      config: new ConfigService(),
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
