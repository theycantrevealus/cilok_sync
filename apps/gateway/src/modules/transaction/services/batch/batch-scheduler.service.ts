import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Error, Model } from 'mongoose';

import { Account } from '@/account/models/account.model';
import {
  BatchScheduler,
  BatchSchedulerDocument,
} from '@/application/models/batch-scheduler.model';
import { BatchSchedulerResponse } from '@/transaction/dtos/batch/batch-scheduler-response.dto';

const moment = require('moment-timezone');

@Injectable()
export class BatchSchedulerService {
  constructor(
    @InjectModel(BatchScheduler.name)
    private batchSchedulerModel: Model<BatchSchedulerDocument>,
  ) {
    //
  }

  async all(param): Promise<unknown> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
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
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}`, 'i'),
          };
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
          autoColumn[a] = {
            $eq: filterSet[a].value,
          };
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

    const allNoFilter = query.length
      ? await this.batchSchedulerModel.aggregate(query, (err, result) => {
          return result;
        })
      : [];

    query.push({ $project: { created_by: 0 } }); // exclude created_by

    query.push({ $skip: first });

    query.push({ $limit: rows });

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    const data = await this.batchSchedulerModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };
  }

  async add(
    request: BatchScheduler,
    account: Account,
  ): Promise<BatchSchedulerResponse> {
    console.log('request', request);
    const response = new BatchSchedulerResponse();
    response.transaction_classify = 'ADD_EXAMPLE';
    const newData = new this.batchSchedulerModel({
      batch_id: request.batch_id,
      filename: request.filename,
      running_at: moment.utc(request.running_at),
      created_by: account,
    });
    return await newData
      .save()
      .catch((e: Error) => {
        // throw new Error(e.message);
        console.log(e);
      })
      .then((result) => {
        console.log(result);
        response.statusCode = HttpStatus.CREATED;
        response.message = 'Data add success';
        response.payload = newData;
        return response;
      });
  }

  async edit(
    _id: string,
    request: BatchScheduler,
  ): Promise<BatchSchedulerResponse> {
    const response = new BatchSchedulerResponse();
    response.transaction_classify = 'EDIT_EXAMPLE';

    await this.batchSchedulerModel
      .findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(_id),
        },
        {
          ...request,
          running_at: moment.utc(request.running_at),
          updated_at: new Date(),
        },
      )
      .catch((e) => {
        // throw new Error(e.message);
        console.log(e);
      })
      .then(() => {
        response.statusCode = HttpStatus.OK;
        response.message = 'Data edit success';
      });
    return response;
  }

  async delete(_id: string, soft = true): Promise<BatchSchedulerResponse> {
    const response = new BatchSchedulerResponse();
    response.transaction_classify = 'DELETE_EXAMPLE';
    const oid = new mongoose.Types.ObjectId(_id);
    if (soft) {
      await this.batchSchedulerModel
        .findOneAndUpdate(
          {
            _id: oid,
          },
          {
            deleted_at: new Date(),
          },
        )
        .catch((e) => {
          // throw new Error(e.message);
          console.log(e);
        })
        .then(() => {
          response.statusCode = HttpStatus.OK;
          response.message = 'Data delete success';
        });
    } else {
      await this.batchSchedulerModel
        .findOneAndDelete({
          _id: oid,
        })
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(() => {
          response.statusCode = HttpStatus.OK;
          response.message = 'Data delete success';
        });
    }

    return response;
  }

  async deleteScheduleByBatchId(
    batch_id: string,
    soft = true,
  ): Promise<BatchSchedulerResponse> {
    const response = new BatchSchedulerResponse();
    response.transaction_classify = 'DELETE_EXAMPLE';
    const oid = new mongoose.Types.ObjectId(batch_id);
    if (soft) {
      await this.batchSchedulerModel
        .findOneAndUpdate(
          {
            batch_id: oid,
            deleted_at: null,
          },
          {
            deleted_at: new Date(),
          },
        )
        .catch((e) => {
          // throw new Error(e.message);
          console.log(e);
        })
        .then(() => {
          response.statusCode = HttpStatus.OK;
          response.message = 'Data delete success';
        });
    } else {
      await this.batchSchedulerModel
        .deleteMany({
          batch_id: oid,
        })
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(() => {
          response.statusCode = HttpStatus.OK;
          response.message = 'Data delete success';
        });
    }

    return response;
  }

  public async cronBatchScheduler(
    transactionType: string,
  ): Promise<BatchScheduler[]> {
    try {
      const transaction = transactionType.toLowerCase();
      const currentDate = moment().utc().add(7, 'hours');

      const filter = {
        deleted_at: null,
        running_at: { $lte: currentDate.toDate() },
      };

      console.log(`filter : ${JSON.stringify(filter)}`);

      const activeBatch = await this.batchSchedulerModel.aggregate([
        {
          $match: filter,
        },
        {
          $lookup: {
            from: 'batchprocesslogs',
            localField: 'batch_id',
            foreignField: '_id',
            as: 'batchprocess',
          },
        },
        {
          $match: {
            'batchprocess.transaction': transaction,
            'batchprocess.status': 'uploaded',
          },
        },
        {
          $project: {
            _id: 1,
            batch_id: 1,
            filename: 1,
            'created_by._id': 1,
            'created_by.user_name': 1,
            deleted_at: 1,
            created_at: 1,
            identifier: '$batchprocess.identifier'
          },
        },
      ]);

      console.log('activeBatch', activeBatch);

      return activeBatch;
    } catch (error) {
      throw new Error(`ERROR: ${error.message}`);
    }
  }
}
