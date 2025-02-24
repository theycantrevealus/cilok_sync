import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Error, Model, Types } from 'mongoose';
import { Command } from 'nestjs-command';

import { Account } from '@/account/models/account.model';
import { ExampleResponse } from '@/example/dtos/response.dto';
import { Example, ExampleDocument } from '@/example/models/example.model';

import { duplicateField } from '../../../helper';
import { PICResponse } from '../dtos/response.dto';
import { PIC, PICDocument } from '../models/pic.model';

@Injectable()
export class PICService {
  constructor(@InjectModel(PIC.name) private piceModel: Model<PICDocument>) {
    //
  }

  @Command({
    command: 'create:example',
    describe: 'seed data example',
  })
  async seed() {
    //
  }

  async all(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== undefined && param.filter !== ''
        ? JSON.parse(param.filter)
        : {};
    const sort_set = param.sort === '{}' ? { _id: 1 } : JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {
      deleted_at: null,
    };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.piceModel.aggregate(
      [
        {
          $match: filter_builder,
        },
        { $skip: skip },
        { $limit: limit },
        { $sort: sort_set },
      ],
      (err, result) => {
        return result;
      },
    );

    return {
      data: data,
      total: data.length,
    };
  }

  async pic_prime(param): Promise<unknown> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};

    query.push({
      $match: {
        $and: [{ deleted_at: null }],
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

        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      });
    }

    const allNoFilter = await this.piceModel.aggregate(query, (err, result) => {
      return result;
    });

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

    const data = await this.piceModel.aggregate(query, (err, result) => {
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

  async add(request: PIC, account: Account): Promise<PICResponse> {
    const response = new PICResponse();
    response.transaction_classify = 'ADD_PIC';
    const newData = new this.piceModel({
      ...request,
      created_by: account,
    });
    return await newData
      .save()
      .catch((e: Error) => {
        if (e.message.split(' ')[0] === 'E11000') {
          throw new Error(duplicateField(e.message.split(' ')[11].split(':')));
        } else {
          throw new Error(e.message);
        }
      })
      .then(() => {
        response.statusCode = HttpStatus.CREATED;
        response.message = 'Data PIC add success';
        response.payload = newData;
        return response;
      });
  }

  async edit(_id: string, request: PIC): Promise<PICResponse> {
    const response = new PICResponse();
    response.transaction_classify = 'EDIT_PIC';

    return await this.piceModel
      .findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(_id),
        },
        {
          ...request,
          updated_at: new Date(),
        },
      )
      .catch((e) => {
        if (e.message.split(' ')[0] === 'E11000') {
          throw new Error(duplicateField(e.message.split(' ')[11].split(':')));
        } else {
          throw new Error(e.message);
        }
      })
      .then((res) => {
        response.statusCode = HttpStatus.OK;
        response.message = 'Data edit success';
        response.payload = res;
        return response;
      });
  }

  async delete(_id: string, soft = true): Promise<PICResponse> {
    const response = new PICResponse();
    response.transaction_classify = 'DELETE_PIC';
    const oid = new mongoose.Types.ObjectId(_id);
    if (soft) {
      return await this.piceModel
        .findOneAndUpdate(
          {
            _id: oid,
          },
          {
            deleted_at: new Date(),
          },
        )
        .catch((e) => {
          throw new Error(e.message);
        })
        .then((res) => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
          response.payload = res;
          return response;
        });
    } else {
      return await this.piceModel
        .findOneAndDelete({
          _id: oid,
        })
        .catch((e) => {
          throw new Error(e.message);
        })
        .then((res) => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
          response.payload = res;
          return response;
        });
    }
  }

  async get_pic_detail(param: any): Promise<any> {
    const data = await this.piceModel.aggregate(
      [
        {
          $match: {
            $and: [
              { _id: new mongoose.Types.ObjectId(param) },
              { deleted_at: null },
            ],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return {
      data: data,
      total: data.length,
    };
  }
}
