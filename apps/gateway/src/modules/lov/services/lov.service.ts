import {
  CACHE_MANAGER,
  CacheStore,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { SlRedisService } from '@slredis/slredis.service';
import { Cache } from 'cache-manager';
import mongoose, { Model } from 'mongoose';

import {
  LovAddBulkDTO,
  LovAddDTO,
  LovAddDTOResponse,
} from '../dto/lov.add.dto';
import { LovDeleteDTOResponse } from '../dto/lov.delete.dto';
import { LovEditDTO, LovEditDTOResponse } from '../dto/lov.edit.dto';
import { Lov, LovDocument } from '../models/lov.model';

@Injectable()
export class LovService {
  constructor(
    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,

    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,

    @Inject(SlRedisService) private readonly slRedisService: SlRedisService,
  ) {
    //
  }

  async findCaseSensitive(parameter: string) {
    const regex = new RegExp(['^', parameter, '$'].join(''), 'igm');
    return await this.lovModel
      .findOne({
        $and: [{ set_value: regex }, { deleted_at: null }],
      })
      .exec();
  }

  async checkAvailLov(parameter: string, parameter2: string): Promise<any> {
    const regex = new RegExp(['^', parameter2, '$'].join(''), 'igm');
    return await this.lovModel
      .findOne({
        $and: [
          { group_name: parameter },
          { set_value: regex },
          { deleted_at: null },
        ],
      })
      .exec();
  }

  async getLovDetail(param: string): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.LOV_KEY}-${param.toString()}`;
    const lovRedis = await this.cacheManager.get(key);
    let result = null;

    if (lovRedis) {
      console.log(`REDIS|Load lov ${param} from Redis|${Date.now() - now}`);

      result = lovRedis;
    } else {
      const lov = await this.lovModel.findOne({
        _id: new mongoose.Types.ObjectId(param),
      });

      console.log(`REDIS|Load lov ${param} from Database|${Date.now() - now}`);

      if (lov) {
        await this.cacheManager.set(key, lov);
        result = lov;
      }
    }

    return result;
    // return await this.lovModel
    //   .findOne({
    //     _id: new mongoose.Types.ObjectId(param),
    //   })
    //   .exec();
  }

  async getLovDetailByGroupAndValue(
    group_name: string,
    set_value: string,
  ): Promise<any> {
    const now = Date.now();

    const key = `${
      RedisDataKey.LOV_KEY
    }-${group_name.toString()}-${set_value.toString()}`;
    const lovRedis = await this.cacheManager.get(key);
    let result = null;

    if (lovRedis) {
      console.log(
        `REDIS|Load lov group name ${group_name} and set_value ${set_value} from Redis|${
          Date.now() - now
        }`,
      );

      result = lovRedis;
    } else {
      const lov = await this.lovModel
        .findOne({
          group_name,
          set_value,
        })
        .exec();

      console.log(
        `REDIS|Load lov group name ${group_name} and set_value ${set_value} from Database|${
          Date.now() - now
        }`,
      );

      if (lov) {
        await this.cacheManager.set(key, lov);
        result = lov;
      }
    }

    return result;
  }

  async getLovDetailByValue(group_name: string, set_value): Promise<any> {
    return await this.lovModel
      .findOne({
        group_name,
        set_value,
      })
      .exec();
  }

  async getLovData(id: string): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.LOV_KEY}-${id?.toString()}`;
    const lovRedis = await this.cacheManager.get(key);
    let result = null;

    if (lovRedis) {
      console.log(`REDIS|Load lov ${id} from Redis|${Date.now() - now}`);

      result = lovRedis;
    } else {
      const lov = await this.lovModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
      });

      console.log(`REDIS|Load lov ${id} from Database|${Date.now() - now}`);

      if (lov) {
        await this.cacheManager.set(key, lov);
        result = lov;
      }
    }

    return result;

    // return await this.lovModel.findOne({
    //   _id: new mongoose.Types.ObjectId(id),
    // });
  }

  async getLovDetailByGroupName(group_name: string): Promise<any> {
    return await this.lovModel
      .find({
        group_name,
      })
      .exec();
  }

  async getLov(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== '' ? JSON.parse(param.filter) : {};
    const sort_set =
      param.sort && param.sort !== ''
        ? JSON.parse(param.sort)
        : { created_at: -1 };
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
    }
    const data = this.lovModel
      .find(filter_builder)
      .find({ deleted_at: null })
      .skip(skip)
      .sort(sort_set)
      .exec()
      .then((results) => {
        if (results.length > 0) {
          return {
            total: results.length,
            data: results,
          };
        } else {
          return {
            total: 0,
            data: [],
          };
        }
      });

    return data;
  }

  async getLovRelation(type: string) {
    const data = await this.lovModel.aggregate([
      {
        $match: {
          group_name: type,
          deleted_at: null,
        },
      },
      {
        $lookup: {
          from: 'lovs',
          localField: 'set_value',
          foreignField: '_id',
          as: 'lov_detail',
        },
      },
      {
        $unwind: '$lov_detail',
      },
      {
        $replaceRoot: {
          newRoot: '$lov_detail',
        },
      },
    ]);

    if (!data?.length) {
      return {
        total: 0,
        data: [],
      };
    }

    return {
      total: data.length,
      data: data,
    };
  }

  async getLovPrime(param): Promise<any> {
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

    const allNoFilter = await this.lovModel.aggregate(query, (err, result) => {
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

    const data = await this.lovModel.aggregate(query, (err, result) => {
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

  async addLov(
    lovData: LovAddDTO,
    created_by: any = null,
  ): Promise<LovAddDTOResponse> {
    const checksetValue = await this.checkAvailLov(
      lovData.group_name,
      lovData.set_value,
    );

    const response = new LovAddDTOResponse();
    response.transaction_classify = 'ADD_LOV';
    if (checksetValue) {
      response.status = HttpStatus.BAD_REQUEST;
      response.message = 'Duplicate names are not allowed';
      response.payload = { duplicate: true };
    } else {
      const newData = new this.lovModel({
        ...lovData,
        description: lovData.description,
        additional: lovData.additional,
        created_by: created_by._id,
      });
      return await newData
        .save()
        .catch((e: Error) => {
          // throw new Error(e.message);
          console.log(e);
        })
        .then(async (data: any) => {
          await this.slRedisService.reloadLov({});

          response.status = HttpStatus.OK;
          response.message = 'Data add success';
          response.payload = newData;

          return response;
        });
    }
    return response;
  }

  async addLovBulk(
    lovData: LovAddBulkDTO,
    created_by: any = null,
  ): Promise<LovAddDTOResponse> {
    const modifiedWithAccount = [];
    lovData.lov_datas.map((e) => {
      modifiedWithAccount.push({
        ...e,
        created_by: created_by._id._id,
      });
    });
    const newLov = await this.lovModel.insertMany(modifiedWithAccount);

    const response = new LovAddDTOResponse();
    if (newLov) {
      await this.slRedisService.reloadLov({});

      response.message = 'LOV Imported Successfully';
      response.status = HttpStatus.OK;
      response.payload = lovData;
    } else {
      response.message = 'LOV Failed to Created';
      response.status = 400;
      response.payload = lovData;
    }
    return response;
  }

  async editLov(data: LovEditDTO, param: string): Promise<LovEditDTOResponse> {
    const process = this.lovModel
      .findOneAndUpdate(
        { _id: param },
        {
          group_name: data.group_name,
          set_value: data.set_value,
          description: data.description,
          additional: data.additional,
        },
      )
      .then((results) => {
        return results;
      });

    const response = new LovEditDTOResponse();
    if (process) {
      await this.slRedisService.reloadLov({});

      response.message = 'LOV Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'LOV Failed to Updated';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async findLov(param: any) {
    return await this.lovModel.find(param);
  }

  async deleteLov(param: string): Promise<LovDeleteDTOResponse> {
    const process = this.lovModel
      .findOneAndDelete({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new LovDeleteDTOResponse();
    if (process) {
      await this.slRedisService.deleteLov(param);
      await this.slRedisService.reloadLov({});

      response.status = HttpStatus.OK;
      response.message = 'LOV Deleted Successfully';
    } else {
      response.status = 400;
      response.message = 'LOV Failed to Deleted';
    }
    response.payload = process;
    return response;
  }
}
