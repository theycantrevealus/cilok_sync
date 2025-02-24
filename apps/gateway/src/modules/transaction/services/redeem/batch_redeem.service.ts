import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  StreamableFile,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Response } from 'express';
import * as fs from 'fs';
import moment from 'moment';
import mongoose, { Model, Types } from 'mongoose';
import * as path from 'path';
import * as util from 'util';

import {
  BatchProcessEnum,
  BatchProcessLog,
  BatchProcessLogDocument,
  IdentifierEnum,
} from '@/application/models/batch.log.model';
import {
  BatchProcessLogRowDocument,
  BatchProcessRowLog,
} from '@/application/models/batch-row.log.model';
import {
  SystemConfig,
  SystemConfigDocument,
} from '@/application/models/system.config.model';
import {
  checkExistingFile,
  scanFilesOndirOnlyCsv,
} from '@/application/utils/File/file-management.service';
import { GlobalResponse } from '@/dtos/response.dto';
import { FileBatchAddDTO } from '@/transaction/dtos/redeem/file_batch.dto';
import { BatchDto } from '@/transaction/models/batch/batch.dto';

import { BatchSchedulerService } from '../batch/batch-scheduler.service';
import { RedeemService } from './redeem.service';

const writeFileAsync = util.promisify(fs.writeFile);
@Injectable()
export class BatchRedeemService {
  constructor(
    @Inject('BATCH_PROCESS_SERVICE_PRODUCER')
    private clientBatch: ClientKafka,

    @Inject(RedeemService)
    private readonly redeemService: RedeemService,

    @InjectModel(BatchProcessLog.name)
    private batchProcessLog: Model<BatchProcessLogDocument>,

    @InjectModel(BatchProcessRowLog.name)
    private batchProcessRowLog: Model<BatchProcessLogRowDocument>,

    @Inject(BatchSchedulerService)
    private readonly batchSchedulerService: BatchSchedulerService,

    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,
  ) {}

  async batchRedeem(body: BatchDto, account, req, isFromApi = true) {
    let identifierLet = null;
    let files,
      isRequestFromApi = isFromApi;
    const response = new GlobalResponse();
    response.transaction_classify = 'REDEEM_BATCH';

    const dirPath = body.dir;
    console.log('BODY', body);

    if (isFromApi === false && body['is_from_dashboard'] === false) {
      isRequestFromApi = true;
    }

    const limitFiles = await this.getFileLimit();
    if (isRequestFromApi) {
      files = scanFilesOndirOnlyCsv(dirPath, []);
    } else {
      const activeBatch = await this.batchSchedulerService.cronBatchScheduler(
        'redeem_batch',
      );
      files = activeBatch.map((data) => data.filename);

      identifierLet = activeBatch.map((data) => data.identifier[0]);
      console.log('FILES of batchRedeem', files);
    }

    files = files.slice(0, limitFiles);

    for (const [index, file] of files.entries()) {
      try {
        let batch;
        const isFileExist = await checkExistingFile(`${dirPath}/${file}`);

        const batchProcessLog =
          await this.redeemService.findExistingBatchProcess(file);
        console.log('BATCH PROCESS LOG', batchProcessLog);

        if (batchProcessLog) {
          batch = batchProcessLog;

          // update status to waiting
          await this.redeemService.updateStatusBatchProcess(
            batch._id,
            BatchProcessEnum.WAITING,
          );
        } else {
          batch = await this.redeemService.save_batch_process_log(
            file,
            'redeem_batch',
            identifierLet ? identifierLet[index] : IdentifierEnum.MSISDN,
          );
        }

        if (!isFileExist) {
          const errorMessage = `${file} doesn't exist`;

          console.log(errorMessage);

          await this.redeemService.updateStatusBatchProcess(
            batch._id,
            BatchProcessEnum.FAIL,
            `${file} doesn't exist`,
          );
          continue;
        }

        const data = {
          origin: 'REDEEM_BATCH',
          file: file,
          dir: dirPath,
          account,
          path: req.url,
          token: req.headers.authorization,
          batch_id: batch._id,
          send_notification: body?.send_notification,
          identifier: identifierLet
            ? identifierLet[index]
            : IdentifierEnum.MSISDN,
        };

        this.clientBatch.emit('batch_process', data);
      } catch (error) {
        throw new Error(error);
      }
    }

    response.payload = files;
    return response;
  }

  async batchRedeemInjectPoint(body: BatchDto, account, req, isFromApi = true) {
    let identifierLet = null;
    let files,
      isRequestFromApi = isFromApi;
    const response = new GlobalResponse();
    response.transaction_classify = 'INJECT_POINT_BATCH';

    const dirPath = body.dir;
    console.log('BODY', body);

    if (isFromApi === false && body['is_from_dashboard'] === false) {
      isRequestFromApi = true;
    }

    console.log('isRequestFromApi', isRequestFromApi);

    const limitFiles = await this.getFileLimit();
    if (isRequestFromApi) {
      files = scanFilesOndirOnlyCsv(dirPath, []);
    } else {
      const activeBatch = await this.batchSchedulerService.cronBatchScheduler(
        'inject_point',
      );

      identifierLet = activeBatch.map((data) => data.identifier[0]);
      files = activeBatch.map((data) => data.filename);
      console.log('FILES of batchRedeemInjectPoint', files);
    }

    files = files.slice(0, limitFiles);
    for (const [index, file] of files.entries()) {
      try {
        let batch;
        const isFileExist = await checkExistingFile(`${dirPath}/${file}`);

        const batchProcessLog =
          await this.redeemService.findExistingBatchProcess(file);
        console.log('BATCH PROCESS LOG', batchProcessLog);

        if (batchProcessLog) {
          batch = batchProcessLog;

          // update status to waiting
          await this.redeemService.updateStatusBatchProcess(
            batch._id,
            BatchProcessEnum.WAITING,
          );
        } else {
          batch = await this.redeemService.save_batch_process_log(
            file,
            'inject_point',
            identifierLet ? identifierLet[index] : IdentifierEnum.MSISDN,
          );
        }

        if (!isFileExist) {
          const errorMessage = `${file} doesn't exist`;

          console.log(errorMessage);

          await this.redeemService.updateStatusBatchProcess(
            batch._id,
            BatchProcessEnum.FAIL,
            `${file} doesn't exist`,
          );
          continue;
        }

        const data = {
          origin: 'INJECT_POINT_BATCH',
          file: file,
          dir: dirPath,
          account,
          path: req.url,
          token: req.headers.authorization,
          batch_id: batch._id,
          send_notification: body?.send_notification,
          identifier: identifierLet
            ? identifierLet[index]
            : IdentifierEnum.MSISDN,
        };

        this.clientBatch.emit('batch_process', data);
      } catch (error) {
        throw new Error(error);
      }
    }

    response.payload = files;
    return response;
  }

  async batchRedeemInjectCoupon(
    body: BatchDto,
    account,
    req,
    isFromApi = true,
  ) {
    let identifierLet = null;
    let files,
      isRequestFromApi = isFromApi;
    const response = new GlobalResponse();
    response.transaction_classify = 'INJECT_COUPON_BATCH';

    const dirPath = body.dir;
    console.log('BODY', body);

    if (isFromApi === false && body['is_from_dashboard'] === false) {
      isRequestFromApi = true;
    }

    const limitFiles = await this.getFileLimit();
    if (isRequestFromApi) {
      files = scanFilesOndirOnlyCsv(dirPath, []);
    } else {
      const activeBatch = await this.batchSchedulerService.cronBatchScheduler(
        'inject_coupon',
      );

      identifierLet = activeBatch.map((data) => data.identifier[0]);
      files = activeBatch.map((data) => data.filename);
      console.log('FILES of batchRedeemInjectCoupon', files);
    }

    files = files.slice(0, limitFiles);
    for (const [index, file] of files.entries()) {
      try {
        let batch;
        const isFileExist = await checkExistingFile(`${dirPath}/${file}`);

        const batchProcessLog =
          await this.redeemService.findExistingBatchProcess(file);
        console.log('BATCH PROCESS LOG', batchProcessLog);

        if (batchProcessLog) {
          batch = batchProcessLog;

          // update status to waiting
          await this.redeemService.updateStatusBatchProcess(
            batch._id,
            BatchProcessEnum.WAITING,
          );
        } else {
          batch = await this.redeemService.save_batch_process_log(
            file,
            'inject_coupon',
            identifierLet ? identifierLet[index] : IdentifierEnum.MSISDN,
          );
        }

        if (!isFileExist) {
          const errorMessage = `${file} doesn't exist`;

          console.log(errorMessage);

          await this.redeemService.updateStatusBatchProcess(
            batch._id,
            BatchProcessEnum.FAIL,
            `${file} doesn't exist`,
          );
          continue;
        }

        const data = {
          origin: 'INJECT_COUPON_BATCH',
          file: file,
          dir: dirPath,
          account,
          path: req.url,
          token: req.headers.authorization,
          batch_id: batch._id,
          send_notification: body?.send_notification,
          identifier: identifierLet
            ? identifierLet[index]
            : IdentifierEnum.MSISDN,
        };

        console.log('BATCH REDEEM INJECT COUPON', data);

        this.clientBatch.emit('batch_process', data);
      } catch (error) {
        console.log('Error in batch inject');
        console.log(error.message);
        throw new Error(error);
      }
    }

    response.payload = files;
    return response;
  }

  async getSummaryPrime(
    param,
    type: string,
    identifier: string,
  ): Promise<unknown> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField =
      param.sortField == 'created_at' ? 'createdAt' : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};

    if (identifier && identifier !== '') {
      query.push({
        $match: {
          $and: [
            {
              transaction: type,
              identifier: identifier,
            },
          ],
        },
      });
    } else {
      query.push({
        $match: {
          $or: [
            {
              identifier: '',
            },
            {
              identifier: 'msisdn',
            },
            {
              identifier: 'indihome',
            },
          ],
          $and: [
            {
              transaction: type,
            },
          ],
        },
      });
    }

    query.push({
      $lookup: {
        from: 'batchscheduler',
        let: { batch_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$batch_id', '$$batch_id'] },
                  { $eq: ['$deleted_at', null] },
                ],
              },
            },
          },
        ],
        as: 'batchscheduler_detail',
      },
    });

    const filter_builder = { $and: [] };
    const filterSet = filters;
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {};
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {};
        }

        if (filterSet[a].matchMode === 'contains') {
          if (a === 'createdAt') {
            const start =
              moment(filterSet[a].start_date)
                .subtract(1, 'days')
                .format('YYYY-MM-DDT') + '17:00:00.000Z';
            const end =
              moment(filterSet[a].end_date).format('YYYY-MM-DDT') +
              '17:00:00.000Z';
            autoColumn[a] = {
              $gte: new Date(start),
              $lt: new Date(end),
            };
          } else if (a === 'origin_name') {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          } else if (a === 'batchscheduler_detail.running_at') {
            autoColumn[a] = {
              $gte: new Date(`${filterSet[a].value}T00:00:00.000Z`),
              $lt: new Date(`${filterSet[a].value}T23:59:59.999Z`),
            };
          } else {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          }
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          if (a === '_id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        }

        // if (a === 'origin_name') {
        //   autoColumn['origin_name'] = autoColumn[a];
        //   delete autoColumn[a];
        // }
        filter_builder.$and.push(autoColumn, { deleted_at: null });
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    }

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    const allNoFilter = await this.batchProcessLog.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    query.push({ $skip: first });

    query.push({ $limit: rows });

    // console.log('=== QUERY ===', JSON.stringify(query));
    const data = await this.batchProcessLog.aggregate(query, (err, result) => {
      return result;
    });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };
  }

  async batchDetailPrime(param, _id: string): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField =
      param.sortField == 'created_at' ? 'createdAt' : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};

    const filter_builder = { $and: [] };
    const filterSet = filters;
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {};
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {};
        }

        if (filterSet[a].matchMode === 'contains') {
          if (a === 'createdAt') {
            const start =
              moment(filterSet[a].start_date)
                .subtract(1, 'days')
                .format('YYYY-MM-DDT') + '17:00:00.000Z';
            const end =
              moment(filterSet[a].end_date).format('YYYY-MM-DDT') +
              '17:00:00.000Z';
            autoColumn[a] = {
              $gte: new Date(start),
              $lt: new Date(end),
            };
          } else if (a === 'line_data.msisdn') {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          } else if (a === 'trace_id') {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          } else if (a === 'line_data.keyword') {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          } else if (a === 'line_data.channel_id') {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          } else if (a === 'transaction_detail.notification_code') {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          } else {
            autoColumn[a] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            };
          }
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          if (a === '_id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'status') {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          } else if (a === 'line_data.keyword') {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          } else {
            autoColumn[a] = {
              $eq: filterSet[a].value,
            };
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        }
        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    }

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    query.push({
      $match: {
        $and: [
          {
            batch_id: new mongoose.Types.ObjectId(_id),
          },
        ],
      },
    });

    query.push({
      $lookup: {
        from: 'transaction_master',
        localField: 'trace_id',
        foreignField: 'transaction_id',
        as: 'transaction_detail',
      },
    });

    const allNoFilter = await this.batchProcessRowLog.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    query.push({ $skip: first });

    query.push({ $limit: rows });

    const data = await this.batchProcessRowLog.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    // console.log('=== QUERY FILTER ===', JSON.stringify(query));
    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };
  }

  async batchDetailSummary(param): Promise<any> {
    const isValidObjectId = Types.ObjectId.isValid(param);
    console.log(`${param} is valid? ${isValidObjectId}`);

    if (isValidObjectId) {
      const aggregationResult = await this.batchProcessRowLog.aggregate([
        {
          $match: {
            $and: [{ batch_id: new Types.ObjectId(param) }],
          },
        },
        {
          $lookup: {
            from: 'transaction_master',
            localField: 'trace_id',
            foreignField: 'transaction_id',
            as: 'transaction_detail',
          },
        },
        {
          $unwind: {
            path: '$transaction_detail',
            preserveNullAndEmptyArrays: true, // Menangani kasus di mana transaction_detail kosong (tidak ada yang cocok)
          },
        },
        {
          $group: {
            _id: null,
            total_success: {
              $sum: {
                $cond: [
                  { $eq: ['$transaction_detail.status', 'Success'] },
                  1,
                  0,
                ],
              },
            },
            total_failed: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$transaction_detail.status', 'Fail'] },
                          { $ifNull: ['$transaction_detail', false] },
                        ],
                      },
                      { $eq: ['$status', 'fail'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      if (aggregationResult.length > 0) {
        const { total_success, total_failed } = aggregationResult[0];
        return {
          total_success,
          total_failed,
        };
      } else {
        throw new BadRequestException([
          { isInvalidDataContent: `Data with ID ${param} is not found` },
        ]);
      }
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: `ID ${param} is not a valid format` },
      ]);
    }
  }

  async batchDetailExport(res: Response, param): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(param)) {
        throw new BadRequestException([
          { isInvalidDataContent: `ID ${param} is not a valid format` },
        ]);
      }

      const query = {
        $or: [
          {
            batch_id: new Types.ObjectId(param),
            status: 'fail',
          },
          {
            batch_id: new Types.ObjectId(param),
            'transaction_detail.status': 'Fail',
          },
        ],
      };

      const aggregationResult = await this.batchProcessRowLog.aggregate([
        {
          $lookup: {
            from: 'transaction_master',
            localField: 'trace_id',
            foreignField: 'transaction_id',
            as: 'transaction_detail',
          },
        },
        {
          $unwind: {
            path: '$transaction_detail',
            preserveNullAndEmptyArrays: true, // Menangani kasus di mana transaction_detail kosong (tidak ada yang cocok)
          },
        },
        { $match: query },
      ]);

      if (aggregationResult.length === 0) {
        throw new BadRequestException([
          { isInvalidDataContent: `Data with ID ${param} is not found` },
        ]);
      }

      const rowCheck = aggregationResult[0];
      if (!rowCheck.line_data) {
        throw new BadRequestException([
          {
            isInvalidDataContent:
              'Invalid data structure: batch-process-row-log line_data is missing or empty',
          },
        ]);
      }

      const csvContent = aggregationResult.map((item) => {
        const msisdn = item?.line_data?.msisdn || '';
        const keyword = item?.line_data?.keyword || '';

        let point = null;
        const totalCoupon = item?.line_data?.['total_coupon']
          ? item?.line_data?.['total_coupon\r']
          : item?.line_data?.['total_coupon\r']?.replace(/\r/g, '') || '';

        const totalPoint = item?.line_data?.['total_point']
          ? item?.line_data?.['total_point']
          : item?.line_data?.['total_point\r']?.replace(/\r/g, '') || '';

        if (totalCoupon !== '') {
          point = totalCoupon;
        } else if (totalPoint !== '') {
          point = totalPoint;
        } else {
          point = item?.line_data?.['total_redeem']
            ? item?.line_data?.['total_redeem']
            : item?.line_data?.['total_redeem\r']?.replace(/\r/g, '') || '';
        }

        const notification_code = item.transaction_detail?.notification_code
          ? item.transaction_detail?.notification_code
          : '';
        const channelId = item?.line_data?.channel_id?.replace(/\r/g, '') || '';
        return `${msisdn}|${keyword}|${point}|${channelId}|${notification_code}`;
      });

      csvContent.unshift('MSISDN|KEYWORD|POINT|CHANNEL_ID|NOTIFICATION_CODE');

      const randomString = Math.random().toString(36).substring(7);
      const fileName = `batch_export_${new Date()
        .toISOString()
        .slice(0, 10)}_${randomString}.csv`;

      return new StreamableFile(Buffer.from(csvContent.join('\n'), 'utf-8'), {
        disposition: 'attachment; filename=' + fileName,
      });
    } catch (error) {
      // Handle errors appropriately
      throw error;
    }
  }
  async batchUpload(request, identifier) {
    const response = new GlobalResponse();
    try {
      const body: FileBatchAddDTO = new FileBatchAddDTO(request.body);
      const files = body.file;
      // console.log('body : ', body);
      // console.log('files : ', files);
      for await (const file of files) {
        const fileName = file.filename;
        // console.log('fileName : ', fileName);
        if (!fileName.match(/^.*\.(csv)$/)) {
          throw new BadRequestException(['File format not support']);
        }
        const fileNameExist = await this.batchProcessLog.findOne({
          origin_name: fileName,
        });
        if (fileNameExist) {
          response.statusCode = HttpStatus.BAD_REQUEST;
          response.message = `Filename Duplicate`;
          return response;
        }
        console.log(`${body.dir}/${fileName}`);
        fs.writeFile(`${body.dir}/${fileName}`, file.data, (err) => {
          if (err) {
            return console.log(err);
          }
        });
        response.statusCode = HttpStatus.CREATED;
        response.message = `Success upload file`;
        file.path = `${body.dir}/${fileName}`;
        response.payload = {
          filename: fileName,
          dir: file.path,
          type_upload: request.body.type_upload,
        };
        // console.log('response : ', response);
        await this.save_batch_process_log_upload(
          fileName,
          request.body.type_upload,
          identifier,
        );
      }
    } catch (error) {
      response.statusCode = HttpStatus.BAD_REQUEST;
      response.message = `File format not support`;
    }
    return response;
  }

  async save_batch_process_log_upload(
    origin_name: string,
    transaction: string,
    identifier: IdentifierEnum,
  ) {
    const newData = new this.batchProcessLog({
      origin_name,
      internal_name: null,
      transaction: transaction,
      status: BatchProcessEnum.UPLOADED,
      identifier: identifier,
    });

    await newData.save().catch((e: Error) => {
      console.log(e);
      console.log(`Error Save Log ${e.message}`);
    });

    return newData;
  }

  async getFileLimit() {
    let limitFiles = 1;
    const systemConfig = await this.systemConfigModel
      .findOne({
        param_key: 'LIMITATION_BATCH_FILES',
      })
      .exec();

    if (systemConfig) {
      limitFiles = Number(systemConfig.param_value);
    }

    return limitFiles;
  }

  async batchDataSyncCoupon(body: BatchDto, account, req, isFromApi = true) {
    let identifierLet;
    let files,
      isRequestFromApi = isFromApi;
    const response = new GlobalResponse();
    response.transaction_classify = 'COUPON_DATA_SYNC_BATCH';

    const dirPath = body.dir;
    console.log('BODY', body);

    if (isFromApi === false && body['is_from_dashboard'] === false) {
      isRequestFromApi = true;
    }

    const limitFiles = await this.getFileLimit();
    if (isRequestFromApi) {
      files = scanFilesOndirOnlyCsv(dirPath, []);
    } else {
      const activeBatch = await this.batchSchedulerService.cronBatchScheduler(
        'coupon_data_sync_batch',
      );
      files = activeBatch.map((data) => data.filename);

      identifierLet = activeBatch.map((data) => data.identifier[0]);
      console.log('FILES of batchCouponDatasync', files);
    }

    files = files.slice(0, limitFiles);

    for (const [index, file] of files.entries()) {
      try {
        let batch;
        const isFileExist = await checkExistingFile(`${dirPath}/${file}`);

        const batchProcessLog =
          await this.redeemService.findExistingBatchProcess(file);
        console.log('BATCH PROCESS LOG', batchProcessLog);

        if (batchProcessLog) {
          batch = batchProcessLog;

          // update status to waiting
          await this.redeemService.updateStatusBatchProcess(
            batch._id,
            BatchProcessEnum.WAITING,
          );
        } else {
          batch = await this.redeemService.save_batch_process_log(
            file,
            'coupon_data_sync_batch',
            identifierLet[index],
          );
        }

        if (!isFileExist) {
          const errorMessage = `${file} doesn't exist`;

          console.log(errorMessage);

          await this.redeemService.updateStatusBatchProcess(
            batch._id,
            BatchProcessEnum.FAIL,
            `${file} doesn't exist`,
          );
          continue;
        }

        const data = {
          origin: 'COUPON_DATA_SYNC_BATCH',
          file: file,
          dir: dirPath,
          account,
          path: req.url,
          token: req.headers.authorization,
          batch_id: batch._id,
          send_notification: body?.send_notification,
          identifier: identifierLet[index],
        };

        this.clientBatch.emit('batch_process', data);
      } catch (error) {
        throw new Error(error);
      }
    }

    response.payload = files;
    return response;
  }
}
