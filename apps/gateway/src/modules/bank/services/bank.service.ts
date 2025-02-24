import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { GlobalResponse } from '@/dtos/response.dto';

import { Bank, BankDocument } from '../models/bank.model';

@Injectable()
export class BankService {
  constructor(@InjectModel(Bank.name) private bankModel: Model<BankDocument>) {
    //
  }

  async repopulateBank(param: string): Promise<Bank> {
    let currentBankSession = await this.bankModel
      .findOne({
        $and: [{ ip: param }],
      })
      .exec();
    if (!currentBankSession) {
      currentBankSession = new this.bankModel({
        code: 'UNDEFINED',
        ip: param,
        name: 'UNDEFINED',
        description: 'UNDEFINED',
      });

      await currentBankSession.save();
    }

    return currentBankSession;
  }

  async all(param: any): Promise<any> {
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

    const allNoFilter = await this.bankModel.aggregate(query, (err, result) => {
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

    const data = await this.bankModel.aggregate(query, (err, result) => {
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

  async add(request: Bank, credential: Account): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'ADD_BANK';
    const newBank = new this.bankModel({
      ...request,
      created_by: credential,
    });
    return await newBank
      .save()
      .catch((e: Error) => {
        // throw new Error(e.message);
        console.log(e);
      })
      .then(() => {
        response.message = 'Bank Created Successfully';
        response.statusCode = HttpStatus.OK;
        response.payload = newBank;
        return response;
      });

    return response;
  }

  async edit(_id: string, data: Bank): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    const oid = new mongoose.Types.ObjectId(_id);
    await this.bankModel
      .findOneAndUpdate({ _id: oid }, data)
      .then(() => {
        response.message = 'Bank Updated Successfully';
        response.statusCode = HttpStatus.OK;
        response.payload = data;
        return response;
      })
      .catch((e: Error) => {
        // throw new Error(e.message);
        console.log(e);
      });
    return response;
  }

  async delete(_id: string, soft = true): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'DELETE_EXAMPLE';
    const oid = new mongoose.Types.ObjectId(_id);
    if (soft) {
      await this.bankModel
        .findOneAndUpdate({ _id: oid }, { deleted_at: new Date() })
        .then(async (res) => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Bank Deleted Successfully';
          response.payload = res;
          return response;
        })
        .catch((e: Error) => {
          // throw new Error(e.message);
          console.log(e);
        });
    } else {
      await this.bankModel
        .findOneAndDelete({ _id: oid })
        .then(async (res) => {
          response.statusCode = HttpStatus.NO_CONTENT;
          response.message = 'Bank Deleted Successfully';
          response.payload = res;
          return response;
        })
        .catch((e: Error) => {
          // throw new Error(e.message);
          console.log(e);
        });
    }
    return response;
  }

  async detail(param: any): Promise<any> {
    const data = await this.bankModel.aggregate(
      [
        {
          $match: {
            $and: [{ _id: new Types.ObjectId(param) }, { deleted_at: null }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
    return data[0];
  }

  async detail_mbp(param: any, parameter: any): Promise<any> {
    // const data = await this.bankModel.aggregate([
    //     {
    //       $match:{
    //         $and:[{bank: param},{deleted_at: null}]
    //       }
    //     }
    // ],(err,result) =>{
    //   return result
    // }
    // )
    // return data
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};

    const filter_builder = { $and: [] };
    const filterSet = filters;

    query.push({
      $match: {
        $and: [{ bank: parameter }],
      },
    });

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
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      });
    }

    const allNoFilter = await this.bankModel.aggregate(query, (err, result) => {
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

    const data = await this.bankModel.aggregate(query, (err, result) => {
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
}
