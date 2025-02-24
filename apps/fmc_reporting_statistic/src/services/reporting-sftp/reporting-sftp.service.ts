import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import {
  TransactionMaster,
  TransactionMasterDocument,
} from '@transaction_master/models/transaction_master.model';
import * as fs from 'fs';
import * as moment from 'moment';
import { Model } from 'mongoose';

import { allowedIndihomeNumber } from '@/application/utils/Msisdn/formatter';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';

@Injectable()
export class ReportingSftpService {
  constructor(
    @Inject('SFTP_SERVICE_PRODUCER')
    private readonly clientSFTP: ClientKafka,
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
    @InjectModel(TransactionMaster.name)
    private transactionMasterModel: Model<TransactionMasterDocument>,
  ) {}

  async executeBatchRedeemer(payload: any) {
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const keywordList = payload.parameter.keyword;
      const customers = await this.getCustomerRedeem(keywordList, payload);

      if (customers.length == 0) {
        console.log(
          `>>>>> Belum ada customer yang redeem ! Periode ${payload.period}`,
        );
        // return false;

        serviceResult.message =
          'ExecutingBatchRedeemer: Data keyword not found';

        serviceResult.stack = 'Data keyword not found: customer.length == 0';
        serviceResult.custom_code = HttpStatus.BAD_REQUEST;
        return serviceResult;
      }

      if (customers.length > 0) {
        // Prepare for generate file

        console.log('customers.length : ', customers.length);

        const curr_date = `${moment(payload.period).format('YYYYMMDD')}`;
        let fileName = 'error.txt';
        if (payload.service_name === 'BATCH_REDEEMER') {
          const time = curr_date[1].split('.')[0].replace(/:/g, '-');
          if (payload.parameter.file_name) {
            fileName = `${payload.parameter.file_name}_${curr_date}.csv`;
          } else {
            fileName = `BATCH_REDEEMER_${curr_date}.csv`;
          }
          console.log('fileName : ', fileName);
        }
        if (payload.service_name === 'daily_checkin_report') {
          fileName = `trx_0POIN_${curr_date}.txt`;
        }
        const dir = payload.parameter.generate_dir;
        const dirFile = `${dir}/${fileName}`;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        console.log('curr_date : ', curr_date);
        console.log(
          'logic 1 : ',
          payload.parameter &&
            payload.parameter.field &&
            payload.parameter.field.name
            ? '|' + payload.parameter.field.name
            : '',
        );
        let content = `MSISDN|KEYWORD${
          payload.parameter &&
          payload.parameter.field &&
          payload.parameter.field.name
            ? '|' + payload.parameter.field.name
            : ''
        }|ISINDIHOMENUMBER\n`;

        console.log('content : ', content);
        console.log(
          'logic 2 : ',
          payload.parameter &&
            payload.parameter.field &&
            payload.parameter.field.name
            ? '|' + payload.parameter.field.value
            : '',
        );
        for (let index = 0; index < customers.length; index++) {
          const targetMSISDN = allowedIndihomeNumber(customers[index].msisdn)
            ? `${customers[index].msisdn}`
            : customers[index].msisdn;
          content += `${targetMSISDN}|${customers[index].keyword}${
            payload.parameter &&
            payload.parameter.field &&
            payload.parameter.field.name
              ? '|' + payload.parameter.field.value
              : ''
          }|${allowedIndihomeNumber(customers[index].msisdn)}\n`;
        }
        console.log('dirFile : ', dirFile);
        fs.writeFileSync(dirFile, content);
        console.log('>>>>> File generate success.');

        const ctlDirFile = dirFile.replace('.csv', '.ctl');
        console.log(`Creating batch redeemer ctl file : ${ctlDirFile}`);
        const stats = fs.statSync(dirFile);
        const fileSizeInBytes = stats.size;

        // fs.appendFileSync(
        //   ctlDirFile,
        //   `${fileName}|${customers.length}|${fileSizeInBytes}\n`,
        // );

        fs.writeFileSync(
          ctlDirFile,
          `${fileName}|${customers.length}|${fileSizeInBytes}\n`,
        );

        console.log('CTL file generate success <--> end');

        const payloadSftp = payload.sftp_config;
        payloadSftp.generated_file = dirFile;
        payloadSftp.server_destination.forEach(function (value, i) {
          payloadSftp.server_destination[i].fileAndPath = './' + fileName;
        });
        console.log(payloadSftp);
        await this.clientSFTP.emit('sftp-outgoing', payloadSftp);
      }

      serviceResult.message = 'Success executing batch redeemer';
      return serviceResult;
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      return serviceResult;
    }
  }

  async executeBatchRedeemerInject(payload: any) {
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      const keywordList = payload.parameter.keyword;
      const customers = await this.getCustomerRedeemInjectCoupon(
        keywordList,
        payload,
        payload.parameter.hourly,
      );

      if (customers.length == 0) {
        console.log('>>>>> Data keyword tidak ditemukan !');
        // return false;

        serviceResult.message =
          'ExecutingBatchRedeemer: Data keyword not found';

        serviceResult.stack = 'Data keyword not found: customer.length == 0';
        serviceResult.custom_code = HttpStatus.BAD_REQUEST;
        return serviceResult;
      }

      if (customers.length > 0) {
        // Prepare for generate file

        console.log('customers.length : ', customers.length);

        const curr_date = `${moment(payload.period).format('YYYYMMDD')}`;
        let fileName = 'error.txt';

        if (payload.service_name === 'BATCH_REDEEMER_INJECT') {
          const time = curr_date[1].split('.')[0].replace(/:/g, '-');
          if (payload.parameter.file_name) {
            if (payload.parameter.hourly) {
              const timeHourly = moment(new Date()).format('HHmm');
              fileName = `${payload.parameter.file_name}_${curr_date}_${timeHourly}.csv`;
            } else {
              fileName = `${payload.parameter.file_name}_${curr_date}.csv`;
            }
          } else {
            if (payload.parameter.hourly) {
              const timeHourly = moment(new Date()).format('HHmm');
              fileName = `BATCH_REDEEMER_INJECT_${curr_date}_${timeHourly}.csv`;
            } else {
              fileName = `BATCH_REDEEMER_INJECT_${curr_date}.csv`;
            }
          }
          console.log('fileName : ', fileName);
        }
        if (payload.service_name === 'daily_checkin_report') {
          fileName = `trx_0POIN_${curr_date}.txt`;
        }
        const dir = payload.parameter.generate_dir;
        const dirFile = `${dir}/${fileName}`;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        console.log('curr_date : ', curr_date);
        let content = `msisdn|keyword${
          payload.parameter &&
          payload.parameter.field &&
          payload.parameter.field.name
            ? '|' + payload.parameter.field.name
            : ''
        }\n`;

        console.log('content : ', content);
        for (let index = 0; index < customers.length; index++) {
          content += `${customers[index].msisdn}|${
            payload.parameter && payload.parameter.field_keyword
              ? payload.parameter.field_keyword
              : customers[index].keyword
          }${
            payload.parameter &&
            payload.parameter.field &&
            payload.parameter.field.name
              ? '|' + payload.parameter.field.value
              : ''
          }\n`;
        }
        console.log('dirFile : ', dirFile);
        fs.writeFileSync(dirFile, content);
        console.log('>>>>> File generate success.');
        const payloadSftp = payload.sftp_config;
        payloadSftp.generated_file = dirFile;
        payloadSftp.server_destination.forEach(function (value, i) {
          payloadSftp.server_destination[i].fileAndPath = './' + fileName;
        });
        console.log(payloadSftp);
        await this.clientSFTP.emit('sftp-outgoing', payloadSftp);
      }

      serviceResult.message = 'Success executing batch redeemer';
      return serviceResult;
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      return serviceResult;
    }
  }

  async getCustomerRedeemInjectCoupon(keyword: any, payload: any, hourly: any) {
    console.log('hourly', hourly);
    console.log('date exec ', new Date());
    let start_date;
    let end_date;
    let query;
    if (hourly) {
      start_date = moment(new Date()).startOf('hour').subtract(1, 'hour');
      end_date = moment(new Date()).endOf('hour').subtract(1, 'hour');
      query = [
        {
          $match: {
            keyword: { $in: keyword },
            transaction_date: {
              $gte: start_date.toDate(),
              $lte: end_date.toDate(),
            },
            status: 'Success',
            $or: [
              { keyword_verification: { $exists: false } }, // Bidang tidak ada dalam dokumen
              { keyword_verification: null }, // Bidang ada tetapi nilai-nya null
            ],
          },
        },
      ];
    } else {
      payload.period = moment(payload.period).endOf('day');
      start_date = moment(payload.period).startOf('days');
      end_date = moment(payload.period).endOf('days');
      query = [
        {
          $match: {
            keyword: { $in: keyword },
            transaction_date: {
              $gte: start_date.toDate(),
              $lte: end_date.toDate(),
            },
            status: 'Success',
            $or: [
              { keyword_verification: { $exists: false } }, // Bidang tidak ada dalam dokumen
              { keyword_verification: null }, // Bidang ada tetapi nilai-nya null
            ],
          },
        },
      ];
    }

    console.log('start_date : ', start_date);
    console.log('end_date : ', end_date);

    console.log('query inject coupon : ', JSON.stringify(query));

    const customers = await this.transactionMasterModel
      .aggregate(query)
      .allowDiskUse(true);

    // console.log('customers :', customers);
    console.log('customers length', customers.length);
    // Mengubah format hasil sesuai dengan kebutuhan
    const formatCustomers = customers.map((customer) => ({
      keyword: customer.keyword,
      msisdn: customer.msisdn,
    }));

    return formatCustomers;
  }

  async getCustomerRedeem(keyword: any, payload: any) {
    payload.period = moment(payload.period).endOf('day');
    const start_date = moment(payload.period).startOf('days');
    const end_date = moment(payload.period).endOf('days');

    const customers = await this.redeemModel
      .aggregate([
        {
          $match: {
            keyword: { $in: keyword },
            transaction_date: {
              $gte: start_date.toDate(),
              $lte: end_date.toDate(),
            },
          },
        },
        {
          $group: {
            _id: {
              keyword: '$keyword',
              msisdn: '$msisdn',
            },
          },
        },
      ])
      .allowDiskUse(true);
    const formatCustomers = [];
    for (let index = 0; index < customers.length; index++) {
      formatCustomers[index] = customers[index]._id;
    }
    return formatCustomers;
  }
}
