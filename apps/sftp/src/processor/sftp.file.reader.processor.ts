import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueProgress,
  Process,
  Processor,
} from '@nestjs/bull';
import { HttpStatus, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import * as fs from 'fs';
import mongoose, { Model } from 'mongoose';
import { basename } from 'path';

import {
  BatchProcessEnum,
  BatchProcessLog,
  BatchProcessLogDocument,
} from '@/application/models/batch.log.model';
import {
  copyFileToInternalAndCompress,
  scanFilesOndirOnlyCsv,
} from '@/application/utils/File/file-management.service';

import { ExceptionHandler } from '../../../utils/logger/handler';
import { IAccount, LoggingData } from '../../../utils/logger/transport';
import { SftpConfig, SftpConfigDocument } from '../models/sftp.config.model';
import { SftpIncomingConfig } from '../models/sftp.incoming.config';
import {
  SftpIncomingLog,
  SftpIncomingLogDocument,
} from '../models/sftp.incoming.log.model';
import { SftpOutgoingConfig } from '../models/sftp.outgoing.config';
import { SftpResult, SftpResultDocument } from '../models/sftp.result.model';
import { firstValueFrom } from 'rxjs';

@Processor('sftp')
export class SftpFileReaderProcessor {
  private readonly sftpIncomingLogModel: Model<SftpIncomingLogDocument>;
  private readonly sftpResultModel: Model<SftpResultDocument>;

  constructor(
    @InjectModel(SftpConfig.name)
    sftpConfigModel: Model<SftpConfigDocument>,

    @InjectModel(SftpIncomingLog.name)
    sftpIncomingLogModel: Model<SftpIncomingLogDocument>,

    @InjectModel(SftpResult.name)
    sftpResultModel: Model<SftpResultDocument>,

    @InjectModel(BatchProcessLog.name)
    private batchProcessLogModel: Model<BatchProcessLogDocument>,

    @Inject('SFTP_SERVICE_PRODUCER')
    private readonly clientSFTP: ClientKafka,

    private readonly exceptionHandler: ExceptionHandler,
  ) {
    this.sftpIncomingLogModel = sftpIncomingLogModel;
    this.sftpResultModel = sftpResultModel;
    //
  }

  @OnQueueActive()
  async onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name}...`);
  }

  @OnQueueProgress()
  onProgress(job: Job) {
    console.log(`Job ${job.id} of type ${job.name} is in progress now...`);
  }

  @OnQueueCompleted()
  async onCompleted(job: Job) {
    console.log(`Job ${job.id} of type ${job.name} is completed now...`);
  }

  @OnQueueFailed()
  async onFailed(job: Job) {
    console.log(
      `Job ${job.id} of type ${job.name} is failed...`,
      `Reason: ${job.failedReason}`,
      `Stacktrace:`,
    );
    console.log(job.stacktrace);
  }

  /**
   * Function for handle extract one file
   * @param config
   * @param filePath
   */
  async handleExtractFile(
    config: SftpIncomingConfig,
    filePath: string,
  ): Promise<void> {
    console.log('Try to read file...');
    let logId = '';
    let rowSuccess = 0;
    let reason = '';

    const sftpInLog = new this.sftpIncomingLogModel({
      type: 'IN',
      sftp_config: config,
      file_path: filePath,
      row_success: 0,
      row_fail: 0,
      status: 'proccessed',
      reason: '',
    });

    await sftpInLog.save();
    logId = sftpInLog._id.toString();

    // expected column explode
    const expectedHeaders = config.expect_column.split('|');

    // load entire file
    const content = fs.readFileSync(filePath, 'utf-8');
    const arrFile = content.split('\n');
    let rowCount = arrFile.length - 1;

    // get headers and expected headers
    const headers = arrFile[0].split(config.column_delimiter);

    const indexHeader = [];
    expectedHeaders.map(function (item) {
      const index = headers.indexOf(item);
      if (index > -1) {
        indexHeader.push({ index: index, header: item });
      }
    });

    if (expectedHeaders.length != indexHeader.length) {
      reason = `Header not match. Required: ${expectedHeaders.join(
        ',',
      )} | Found: ${headers.join(',')}`;
    } else {
      // start from index 1, cause index 0 is header
      for (let i = 1; i < arrFile.length; i++) {
        const row = arrFile[i].split(config.column_delimiter);

        //check if row is empty
        if (arrFile[i].length == 0) {
          rowCount--;
          continue;
        }

        // map index header to row
        const mapData = indexHeader.map(function (item, index) {
          const value = row[item.index] != undefined ? row[item.index] : '';
          return { header: item.header, value: value };
        });

        // arrange object to json set
        const finalResult = {};
        mapData.map(function (item) {
          finalResult[item.header] = item.value;
        });

        const data = new this.sftpResultModel({
          sftp_log_id: logId,
          topic: config.topic,
          data_result: finalResult,
          process_status: 'N',
        });

        const payload = {
          topic: config.topic,
          data_result: finalResult,
        };

        // send data to kafka
        await this.clientSFTP.emit(config.topic, payload);
        await data.save();
        rowSuccess++;
      }
    }

    // check different between success and all row for fail
    const diffSuccessFail = Math.abs(rowSuccess - rowCount);
    let status = 'success';
    if (diffSuccessFail == rowCount) {
      status = 'failed';
    } else if (diffSuccessFail > 0) {
      status = 'partial';
    }

    // update incoming log after process finished
    await this.sftpIncomingLogModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(logId),
      },
      {
        row_success: rowSuccess,
        row_fail: diffSuccessFail,
        status: status,
        reason: reason,
      },
    );
  }

  /**
   *
   * @param payload
   * {
   *   transaction: 'manual_redeem',
   *   topic: 'manual-redeem-google',
   *   parameters: {
   *     service: 'MR_GOOGLE_01',
   *     account: 'adadasd123',
   *     keyword: 'INJCOU1',
   *     token: '12312312',
   *   },
   *   origin: 'cron_file_monitoring_batch_process',
   *   files: [ 'test.csv' ]
   * }
   * @param filePath
   * @param topic
   * @param batchId
   */
  async handleExtractForBatchProcess(
    payload: any,
    filePath: string,
    topic: string,
    batchId: string,
  ) {
    console.log('Try to read batch process file...');

    const fileConfig = payload.file_config;

    payload['parameters'] = {
      ...payload.parameters,
      filename: basename(filePath),
      batch_id: batchId,
    };

    let logId = '';
    let rowSuccess = 0;
    const reason = '';

    const sftpInLog = new this.sftpIncomingLogModel({
      type: 'IN',
      sftp_config: payload,
      file_path: filePath,
      row_success: 0,
      row_fail: 0,
      status: 'proccessed',
      reason: '',
    });

    await sftpInLog.save();
    logId = sftpInLog._id.toString();

    // load entire file
    const content = fs.readFileSync(filePath, 'utf-8');
    const arrFile = content.split('\n');
    let rowCount = arrFile.length; // - 1; // TODO MAS @Felix, ini kalo tanpa header jadinya selalu fail kalau dikurangi 1

    // check if using header
    let indexStart = 0;
    if (fileConfig.has_header) {
      indexStart = 1;
      rowCount -= 1;
    }

    // get custom column index if exists
    const columnIndexes = fileConfig.column_customs;

    // check if exists need to send data per-row
    let data = {};
    if (payload.hasOwnProperty('data')) {
      data = payload.data;
    }

    // start from index 1, cause index 0 is header
    for (let i = indexStart; i < arrFile.length; i++) {
      const row = arrFile[i].split(fileConfig.column_delimiter);

      //check if row is empty
      if (arrFile[i].length == 0) {
        rowCount--;
        continue;
      }

      let final;
      if (columnIndexes.length > 0) {
        final = {
          ...data,
        };
      } else {
        final = row;
      }
      for (let j = 0; j < columnIndexes.length; j++) {
        final[columnIndexes[j].key] = row[columnIndexes[j].index];
      }

      const newPayload = {
        data: final,
        parameters: payload.parameters,
        payload: payload.parameters,
        id_process: batchId,
        transaction: payload.transaction,
      };

      await firstValueFrom(this.clientSFTP.emit(topic, newPayload));
      console.log(newPayload);
      rowSuccess++;
    }

    // check different between success and all row for fail
    const diffSuccessFail = Math.abs(rowSuccess - rowCount);
    let status = 'success';
    if (diffSuccessFail == rowCount) {
      status = 'failed';
    } else if (diffSuccessFail > 0) {
      status = 'partial';
    }

    // update incoming log after process finished
    await this.sftpIncomingLogModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(logId),
      },
      {
        row_success: rowSuccess,
        row_fail: diffSuccessFail,
        status: status,
        reason: reason,
      },
    );

    return status;
  }

  /**
   * Use bull / queue for load big file
   * @param job
   */
  @Process('sftp-file-read')
  async readFiles(job: Job): Promise<void> {
    const startTime = new Date();

    try {
      const config = job.data as SftpIncomingConfig;

      if (config.read_type == 'file') {
        await this.handleExtractFile(config, config.file_path);
      } else if (config.read_type == 'dir') {
        const listOfFile = scanFilesOndirOnlyCsv(config.dir_path, []);
        let dirPath = config.dir_path;
        if (!dirPath.endsWith('/')) {
          dirPath = dirPath + '/';
        }

        for (let i = 0; i < listOfFile.length; i++) {
          await this.handleExtractFile(config, dirPath + listOfFile[i]);
        }
      }
    } catch (e) {
      // insert log
      await this.loggerSftpProcessor(
        job?.data,
        true,
        'SFTPFileReaderProcessor - readFiles',
        {
          user_id: 'sftp',
          message: e.message,
          stack: e.stack,
        },
        startTime,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Use bull / queue for load big file
   * @param job
   */
  @Process('sftp-batch-process-file-read')
  async readFilesForBatchProcess(job: Job): Promise<void> {
    const startTime = new Date();

    try {
      const payload = job.data as any;
      const fileDir = payload.file_config.dir;
      const files = payload.files;
      const topic = payload.topic;
      payload.dir = fileDir;

      for (let i = 0; i < files.length; i++) {
        const fileName = files[i];
        payload.file = fileName;

        const batchLog = new this.batchProcessLogModel({
          origin_name: fileName,
          internal_name: null,
          transaction: payload.transaction,
          status: BatchProcessEnum.WAITING,
        });

        const result = await batchLog.save();
        const processResult = await this.handleExtractForBatchProcess(
          payload,
          fileDir + fileName,
          topic,
          result._id.toString(),
        );

        console.log(processResult);

        let processStatus = BatchProcessEnum.DONE;
        if (processResult === 'failed') {
          processStatus = BatchProcessEnum.FAIL;
        }

        // compress file and move to archived and processed directory
        const copyFile = await copyFileToInternalAndCompress(
          fileDir,
          fileName,
          payload.transaction.toUpperCase(),
        );

        await this.batchProcessLogModel.findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(result._id.toString()),
          },
          {
            internal_name: copyFile.destination_file,
            status: processStatus,
          },
        );
      }

      // insert log
      await this.loggerSftpProcessor(
        job?.data,
        false,
        'SFTPFileReaderProcessor - readFilesForBatchProcess',
        {
          user_id: 'sftp',
          message: 'Success handle read file for batch process',
        },
        startTime,
      );
    } catch (e) {
      // insert log
      await this.loggerSftpProcessor(
        job?.data,
        true,
        'SFTPFileReaderProcessor - readFilesForBatchProcess',
        {
          user_id: 'sftp',
          message: e.message,
          stack: e.stack,
        },
        startTime,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async loggerSftpProcessor(
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
      taken_time: takenTime,
      statusCode: statusCode,
      payload: {
        transaction_id: payload?.tracing_id ?? '-',
        statusCode: statusCode,
        method: 'kafka',
        url: 'cron',
        service: SftpFileReaderProcessor.name,
        step: step,
        taken_time: takenTime,
        result: result,
        param: payload,
        payload: {
          service: SftpOutgoingConfig.name,
          user_id: new IAccount(payload.account),
          step: step,
          result: result,
          param: payload,
        },
      } satisfies LoggingData,
    });
  }
}
