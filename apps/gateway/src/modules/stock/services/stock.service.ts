import { CACHE_MANAGER, CacheStore } from '@nestjs/cache-manager';
import {
  BadRequestException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { ReportingServiceResult } from 'apps/reporting_generation/src/model/reporting_service_result';
import { ObjectId } from 'bson';
import { plainToClass, Type } from 'class-transformer';
import mongoose, { ClientSession, Model } from 'mongoose';
import { Types } from 'mongoose';

import { Account, AccountDocument } from '@/account/models/account.model';
import { ApplicationService } from '@/application/services/application.service';
import { getProductID } from '@/application/utils/Product/product';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalResponse } from '@/dtos/response.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { KeywordService } from '@/keyword/services/keyword.service';
import { Location, LocationDocument } from '@/location/models/location.model';

import { StockDTO } from '../dto/stock.dto';
import { StockResponse } from '../dto/stock.reponse';
import { StockReserveDTO } from '../dto/stock-reserve.dto';
import { StockThresholdDTO } from '../dto/stock-thershold.dto';
import { StockThresholdType } from '../enum/stock-threshold-type.enum';
import { Stock, StockDocument } from '../models/stock.model';
import { StockLogDocument, StockLogs } from '../models/stock-logs.model';
import {
  StockReserve,
  StockReserveDocument,
} from '../models/stock-reserve.model';
import {
  StockThreshold,
  StockThresholdDocument,
} from '../models/stock-threshold.model';
import {
  StockSummary,
  StockSummaryDocument,
} from '../models/stocks-summary.model';
const moment = require('moment-timezone');

@Injectable()
export class StockService {
  constructor(
    @InjectModel(Stock.name)
    private stock: Model<StockDocument>,
    @InjectModel(StockLogs.name)
    private stockLogs: Model<StockLogDocument>,
    @InjectModel(Account.name)
    private account: Model<AccountDocument>,
    @InjectModel(StockReserve.name)
    private stockReserve: Model<StockReserveDocument>,
    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,
    @InjectModel(StockSummary.name)
    private stockSummaryModel: Model<StockSummaryDocument>,
    @InjectModel(StockThreshold.name)
    private stockThresholdModel: Model<StockThresholdDocument>,
    private applicationService: ApplicationService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
    @Inject(forwardRef(() => KeywordService))
    private keywordService: KeywordService,
  ) {}

  async findStock(param) {
    const search_param = param.search_param ? `${param.search_param}` : '';

    const filter_set =
      param.filter && param.filter !== undefined && param.filter !== ''
        ? JSON.parse(param.filter)
        : {};
    const sort_set =
      param.sort && param.sort !== '' && param.sort !== '{}'
        ? JSON.parse(param.sort)
        : { created_at: -1 };
    const skip: number =
      param.skip && param.skip !== '' ? parseInt(param.skip) : 0;
    const limit: number =
      param.limit && param.limit !== '' ? parseInt(param.limit) : 10;
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id' && filter_set[a] !== ''
          ? this.toObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const query = [];

    query.push({
      $lookup: {
        from: 'locations',
        localField: 'location',
        foreignField: '_id',
        as: 'location',
      },
    });

    query.push({
      $unwind: {
        path: '$location',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productinventories',
        localField: 'product',
        foreignField: 'core_product_id',
        as: 'product',
      },
    });

    query.push({
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: true,
      },
    });

    if (search_param) {
      query.push({
        $match: {
          $or: [
            { 'product.name': { $regex: new RegExp(`${search_param}`, `i`) } },
            { 'location.name': { $regex: new RegExp(`${search_param}`, `i`) } },
          ],
        },
      });
    }

    query.push({
      $match: filter_builder,
    });

    query.push({ $sort: sort_set });
    query.push({ $skip: skip });
    query.push({ $limit: limit });

    const data = await this.stock.aggregate(query, (err, result) => {
      return result;
    });

    return {
      data: data,
      total: data.length,
    };
  }

  async prime(param) {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : -1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};

    const filter_builder = { $and: [] };

    query.push({
      $match: {
        $and: [{ deleted_at: null }],
      },
    });

    filter_builder.$and.push({
      keyword: null,
    });
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

    query.push({
      $lookup: {
        from: 'locations',
        localField: 'location',
        foreignField: '_id',
        as: 'location',
      },
    });

    query.push({
      $unwind: {
        path: '$location',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productinventories',
        localField: 'product',
        foreignField: '_id',
        as: 'product',
      },
    });

    query.push({
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: false,
      },
    });

    query.push({
      $lookup: {
        from: 'productcategories',
        localField: 'product.category_id',
        foreignField: 'core_product_category_id',
        as: 'product.category',
      },
    });

    query.push({
      $unwind: {
        path: '$product.category',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productsubcategories',
        localField: 'product.sub_category_id',
        foreignField: 'core_product_subcategory_id',
        as: 'product.sub_category',
      },
    });

    query.push({
      $unwind: {
        path: '$product.sub_category',
        preserveNullAndEmptyArrays: true,
      },
    });

    filter_builder.$and.push({
      'product.deleted_at': null,
    });

    filter_builder.$and.push({
      'location.name': 'HQ',
    });
    query.push({
      $match: filter_builder,
    });

    const allNoFilter = await this.stock.aggregate(query, (err, result) => {
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

    // if (search_param) {
    //   query.push({
    //     $match: {
    //       $or: [
    //         { "product.name": { $regex: new RegExp(`${search_param}`, `i`) } },
    //         { "location.name": { $regex: new RegExp(`${search_param}`, `i`) } }
    //       ]
    //     }
    //   })
    // }

    const data = await this.stock.aggregate(query, (err, result) => {
      return result;
    });

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    };

    return {
      data: data,
      total: data.length,
    };
  }

  async getStockDetail(param: {
    location: string;
    product: string;
    keyword: string;
  }): Promise<any> {
    const data = await this.stock.aggregate(
      [
        {
          $match: {
            $and: param.product
              ? [
                  { location: this.toObjectId(param.location) },
                  {
                    product: this.toObjectId(param.product),
                  },
                  { keyword: this.toObjectId(param.keyword) },
                ]
              : [
                  { location: this.toObjectId(param.location) },
                  { keyword: this.toObjectId(param.keyword) },
                ],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return data[0];
  }

  async store(payload: StockDTO, account: Account) {
    return await this.add(payload, account, true);
  }

  async add(payload: StockDTO, account: Account, isAdd: boolean) {
    console.log({ payload });

    let data = await this.stock.findOne({
      location: this.toObjectId(payload.location),
      product: this.toObjectId(payload.product),
      keyword: this.toObjectId(payload?.keyword),
    });

    // handle stock data already exist
    if (data) {
      console.log('Update stock qty.');
      data.balance += payload.qty;
    } else {
      console.log('Create new stock.');
      data = new this.stock({
        location: this.toObjectId(payload.location),
        product: this.toObjectId(payload.product),
        keyword: this.toObjectId(payload?.keyword),
        balance: payload.qty,
        balance_flashsale: 0,
      });
    }

    const res = await data
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(async () => {
        if (isAdd) {
          await this.logged(payload, account, 'add', 0);
        } else {
          await this.logged(payload, account, 'mutation', payload.qty);
        }
        const res = new StockResponse();
        res.code = 'S00000';
        res.transaction_classify = 'TRANSACTION_STOCK';
        res.message = 'Initial Stock Success!';
        (res.statusCode = HttpStatus.OK), (res.payload = data);
        res.transaction_id = data._id;
        return res;
      });

    return res;
  }

  // This function used for rollbackStock in transaction_master to solved problem (medified "x" version)
  async rollbackStockOld(payload: StockDTO, account: Account) {
    // Prepare struct response
    const res = new StockResponse();

    // Checking duplicate trx rollback
    const checkTrxStockLogs = await this.checkTrxStockLogs(
      payload.transaction_id,
      'rollback',
    );
    if (checkTrxStockLogs.status) {
      // Give response fail if data not found in collection stocks
      res.code = HttpStatusTransaction.ERR_NOT_FOUND;
      res.transaction_classify = 'TRANSACTION_STOCK';
      res.message = 'Rollback Stock Fail, trx already exsist to rollback';
      (res.statusCode = HttpStatus.NOT_FOUND), (res.payload = null);
      return res;
    }

    // Find data from collection stocks with "payload" data support
    const data = await this.stock.findOne({
      location: this.toObjectId(payload.location),
      product: this.toObjectId(payload.product),
      keyword: this.toObjectId(payload?.keyword),
    });

    // handle stock data already exist
    if (data) {
      data.balance += payload.qty;

      if (data?.initial_balance) {
        // Checking initial balance, if simulation balance more than inital_balance -> rejected
        const checkInitialBalance = this.checkInitialBalance(
          data.initial_balance,
          data.balance,
        );
        if (checkInitialBalance.status) {
          // Give response fail if data not found in collection stocks
          res.code = HttpStatusTransaction.ERR_NOT_FOUND;
          res.transaction_classify = 'TRANSACTION_STOCK';
          res.message =
            'Rollback Stock Fail, checkInitialBalance not eligibile';
          (res.statusCode = HttpStatus.NOT_FOUND), (res.payload = { ...data });
          return res;
        }
      }

      // set stock_update_id
      // payload = {
      //   ...payload,
      //   // stock_update_id: `rollback_${data._id.toString()}_${data.__v}`,
      // };

      // If rollback stock success, add to collection stock logs
      const loggedStock = await this.loggedV2(
        payload,
        account,
        'rollback',
        data?.balance,
      );

      if (!loggedStock) {
        // Give response fail if data not found in collection stocks
        res.code = HttpStatusTransaction.ERR_NOT_FOUND;
        res.transaction_classify = 'TRANSACTION_STOCK';
        res.message =
          'Rollback Stock Fail, internal error insert to collection stock_logs';
        (res.statusCode = HttpStatus.NOT_FOUND), (res.payload = data);
        return res;
      } else {
        // Mechanisme upsert to collection stocks
        const newData = this.stock.findOneAndUpdate(
          { _id: new ObjectId(data._id) },
          {
            $inc: { balance: 1, __v: 1 },
          },
          {
            upsert: true,
          },
        );

        // Proccesing upsert to collection
        return await newData
          .catch((e) => {
            // Catch all error message while updating to collection stocks
            throw new Error(e.message);
          })
          .then(async (r) => {
            // Give a response success
            res.code = HttpStatusTransaction.CODE_SUCCESS;
            res.transaction_classify = 'TRANSACTION_STOCK';
            res.message = 'Rollback Stock Success!';
            (res.statusCode = HttpStatus.OK), (res.payload = data);
            res.transaction_id = data._id;
            return res;
          });
      }
    }

    // Give response fail if data not found in collection stocks
    res.code = HttpStatusTransaction.ERR_NOT_FOUND;
    res.transaction_classify = 'TRANSACTION_STOCK';
    res.message = 'Rollback Stock Fail, cannot found data stock!';
    (res.statusCode = HttpStatus.NOT_FOUND), (res.payload = data);

    // this field is _id form collection stocks
    res.transaction_id = data._id;
    return res;
  }

  // This function used for rollbackStock in transaction_master to solved problem (medified "x" version)
  async rollbackStock(payload: StockDTO, account: Account) {
    // Prepare struct response
    const res = new StockResponse();

    // Checking duplicate trx rollback
    const checkTrxStockLogs = await this.checkTrxStockLogs(
      payload.transaction_id,
      'rollback',
    );
    if (checkTrxStockLogs.status) {
      // Give response fail if data not found in collection stocks
      res.code = HttpStatusTransaction.ERR_NOT_FOUND;
      res.transaction_classify = 'TRANSACTION_STOCK';
      res.message = 'Rollback Stock Fail, trx already exsist to rollback';
      (res.statusCode = HttpStatus.NOT_FOUND), (res.payload = null);
      return res;
    }

    // Find data from collection stocks with "payload" data support
    const data = await this.stock.findOne({
      location: this.toObjectId(payload.location),
      product: this.toObjectId(payload.product),
      keyword: this.toObjectId(payload?.keyword),
    });

    // handle stock data already exist
    if (data) {
      let balance_field = 'balance';
      let balance = data.balance;

      // Flashsale condition
      if (payload?.is_flashsale) {
        balance = data.balance_flashsale;
        balance_field = 'balance_flashsale';
      }

      balance += payload.qty;

      if (data?.initial_balance) {
        // Checking initial balance, if simulation balance more than inital_balance -> rejected
        const checkInitialBalance = this.checkInitialBalance(
          data.initial_balance,
          balance,
        );
        if (checkInitialBalance.status) {
          // Give response fail if data not found in collection stocks
          res.code = HttpStatusTransaction.ERR_NOT_FOUND;
          res.transaction_classify = 'TRANSACTION_STOCK';
          res.message =
            'Rollback Stock Fail, checkInitialBalance not eligibile';
          (res.statusCode = HttpStatus.NOT_FOUND), (res.payload = { ...data });
          return res;
        }
      }

      // set stock_update_id
      // payload = {
      //   ...payload,
      //   // stock_update_id: `rollback_${data._id.toString()}_${data.__v}`,
      // };

      // If rollback stock success, add to collection stock logs
      const loggedStock = await this.loggedV2(
        payload,
        account,
        'rollback',
        balance,
      );

      if (!loggedStock) {
        // Give response fail if data not found in collection stocks
        res.code = HttpStatusTransaction.ERR_NOT_FOUND;
        res.transaction_classify = 'TRANSACTION_STOCK';
        res.message =
          'Rollback Stock Fail, internal error insert to collection stock_logs';
        (res.statusCode = HttpStatus.NOT_FOUND), (res.payload = data);
        return res;
      } else {
        // Mechanisme upsert to collection stocks
        const newData = this.stock.findOneAndUpdate(
          { _id: new ObjectId(data._id) },
          {
            $inc: { [balance_field]: 1, __v: 1 },
          },
          {
            upsert: true,
          },
        );

        // Proccesing upsert to collection
        return await newData
          .catch((e) => {
            // Catch all error message while updating to collection stocks
            throw new Error(e.message);
          })
          .then(async (r) => {
            //Reset Stock
            this.keywordService.deleteRedisStock(payload.keyword,payload.location)
            
            // Give a response success
            res.code = HttpStatusTransaction.CODE_SUCCESS;
            res.transaction_classify = 'TRANSACTION_STOCK';
            res.message = 'Rollback Stock Success!';
            (res.statusCode = HttpStatus.OK), (res.payload = data);
            res.transaction_id = data._id;
            return res;
          });
      }
    }

    // Give response fail if data not found in collection stocks
    res.code = HttpStatusTransaction.ERR_NOT_FOUND;
    res.transaction_classify = 'TRANSACTION_STOCK';
    res.message = 'Rollback Stock Fail, cannot found data stock!';
    (res.statusCode = HttpStatus.NOT_FOUND), (res.payload = data);

    // this field is _id form collection stocks
    res.transaction_id = data._id;
    return res;
  }

  /**
   * @deprecated move to use deduct function
   * @param payload
   * @param account
   * @param session
   * @returns
   */
  async deduct_old(
    payload: StockDTO,
    account: Account,
    session?: ClientSession,
  ) {
    try {
      const res = new StockResponse();

      // Checking duplicate trx stock logs
      const checkTrxStockLogs = await this.checkTrxStockLogs(
        payload.transaction_id,
      );
      if (!checkTrxStockLogs.status) {
        const stock = await this.getStock(payload);
        const version = stock.__v;
        const newBalance = stock.balance - payload.qty;

        // Set update_stock_id
        payload = {
          ...payload,
          stock_update_id: `${stock._id.toString()}_${version}`,
        };

        // Checking last balance stock_logs
        // const checkLastBalance = await this.checkLastBalance(payload, newBalance);
        // if (!checkLastBalance.status) {
        //   res.code = HttpStatusTransaction.ERR_NOT_FOUND;
        //   res.message = checkLastBalance.message;
        //   res.transaction_classify = 'TRANSACTION_STOCK';
        //   (res.statusCode = HttpStatus.NOT_FOUND), (res.payload = { string_code: "BOOKED_STOCK" });

        //   return res;
        // }

        if (stock.balance < 1) {
          res.code = HttpStatusTransaction.ERR_NOT_FOUND;
          res.message = 'No Stock';
          res.transaction_classify = 'TRANSACTION_STOCK';
          (res.statusCode = HttpStatus.NOT_FOUND),
            (res.payload = { string_code: 'NO_STOCK' });

          return res;
        }

        //latest
        const loggedStock = await this.loggedV2(
          payload,
          account,
          'deduct',
          newBalance,
          session,
        );
        if (loggedStock) {
          const resultUpdateStock = await this.update_stock(
            stock,
            null,
            version,
            session,
            payload,
          );
          if (resultUpdateStock.status) {
            stock.balance = resultUpdateStock.newBalance;
            res.code = HttpStatusTransaction.CODE_SUCCESS;
            res.message = 'Deduct Stock Success!';
            res.transaction_classify = 'TRANSACTION_STOCK';
            (res.statusCode = HttpStatus.OK),
              (res.payload = {
                ...stock,
                string_code: resultUpdateStock?.string_code,
              });
            return res;
          } else {
            res.code = HttpStatusTransaction.ERR_NOT_FOUND;
            res.message = 'Deduct Stock Failed!';
            res.transaction_classify = 'TRANSACTION_STOCK';
            (res.statusCode = HttpStatus.NOT_FOUND),
              (res.payload = { ...resultUpdateStock });
            return res;
          }
        } else {
          res.code = HttpStatusTransaction.ERR_NOT_FOUND;
          res.message = 'Deduct Stock Failed!';
          res.transaction_classify = 'TRANSACTION_STOCK';
          (res.statusCode = HttpStatus.NOT_FOUND),
            (res.payload = { string_code: 'BOOKED_STOCK' });
          return res;
        }
      } else {
        res.code = HttpStatusTransaction.ERR_NOT_FOUND;
        res.message =
          checkTrxStockLogs.message ||
          'Trx already exists in collection stocks_logs - Booked Stock!';
        res.transaction_classify = 'TRANSACTION_STOCK';
        (res.statusCode = HttpStatus.NOT_FOUND),
          (res.payload = { string_code: 'BOOKED_STOCK' });
        return res;
      }
    } catch (e) {
      const res = new StockResponse();
      res.code = HttpStatusTransaction.CODE_INTERNAL_ERROR;
      res.message = e?.message || 'Deduct Stock Failed! - Internal system';
      res.transaction_classify = 'TRANSACTION_STOCK';
      (res.statusCode = HttpStatus.INTERNAL_SERVER_ERROR),
        (res.payload = { string_code: 'BOOKED_STOCK' });
      return res;
    }
  }

  /**
   * Deduct Function
   * @param payload
   * @param account
   * @param session
   * @returns
   */
  async deduct(payload: StockDTO, account: Account, session?: ClientSession) {
    try {
      const res = new StockResponse();
      console.log("X_STOCK_PAYLOAD :",payload)
      const stock = await this.getStock(payload);

      console.log(`X_STOCK_BEFORE_DEDUCT :`, stock)
      const resultUpdateStock = await this.update_stock(
        stock,
        null,
        account,
        session,
        payload,
      );

      if (resultUpdateStock.status) {
        stock.balance = resultUpdateStock.newBalance;
        res.code = HttpStatusTransaction.CODE_SUCCESS;
        res.message = 'Deduct Stock Success!';
        res.transaction_classify = 'TRANSACTION_STOCK';
        (res.statusCode = HttpStatus.OK),
          (res.payload = {
            ...stock,
            string_code: resultUpdateStock?.string_code,
          });
        return res;
      } else {
        res.code = HttpStatusTransaction.ERR_NOT_FOUND;
        res.message = 'Deduct Stock Failed!';
        res.transaction_classify = 'TRANSACTION_STOCK';
        (res.statusCode = HttpStatus.NOT_FOUND),
          (res.payload = { ...resultUpdateStock });
        return res;
      }
    } catch (e) {
      console.log('X_GENERAL_CATCH : ', JSON.stringify(e));

      const res = new StockResponse();
      res.code = HttpStatusTransaction.CODE_INTERNAL_ERROR;
      res.message = e?.message || 'Deduct Stock Failed! - Internal system';
      res.transaction_classify = 'TRANSACTION_STOCK';
      (res.statusCode = HttpStatus.INTERNAL_SERVER_ERROR),
        (res.payload = { string_code: 'BOOKED_STOCK' });
      return res;
    }
  }

  async update_stock(
    stock,
    newBalance: number = null,
    account: Account,
    session?: ClientSession,
    payloadStockCompare?: StockDTO,
    modeRetry = false,
  ): Promise<any> {
    const rsp = {
      msg: 'Failed to compare new stock with old stock',
      status: false,
      string_code: 'GENERAL_ERROR',
      newBalance: null,
    };

    try {
      const checkAndUpdateStock = await this.check_and_update_stock(
        stock._id,
        payloadStockCompare,
        'deduct',
        account,
      );

      rsp.msg = checkAndUpdateStock.msg;
      rsp.status = checkAndUpdateStock.status;
      rsp.string_code = checkAndUpdateStock.string_code;

      return rsp;
    } catch (error) {
      rsp.msg = error?.message;
      return rsp;
    }
  }

  async update_stock_old(
    stock,
    newBalance: number = null,
    version: number,
    session?: ClientSession,
    payloadStockCompare?: StockDTO,
    modeRetry = false,
  ): Promise<any> {
    const rsp = {
      msg: 'Failed to compare new stock with old stock',
      status: false,
      string_code: 'GENERAL_ERROR',
      newBalance: null,
    };

    try {
      // Compare new stock with old stock
      const getNewStock = await this.getStock(payloadStockCompare);
      if (version === getNewStock.__v) {
        if (newBalance == null) {
          console.log('mechanism - new stock balance from oldStock');
          const getNewStockSecond = await this.getStock(payloadStockCompare);
          newBalance = getNewStockSecond.balance - payloadStockCompare.qty;
        }

        if (stock?.balance < 1) {
          rsp.msg = `The stock can't be below 0, stock now is ${stock.balance}`;
          rsp.string_code = 'NO_STOCK';
          return rsp;
        } else {
          stock.balance = newBalance;
          stock.__v = version;

          await this.delay(350);

          const checkAndUpdateStock = await this.check_and_update_stock(
            stock._id,
            payloadStockCompare,
            'deduct',
            version,
          );
          rsp.msg = checkAndUpdateStock.msg;
          rsp.status = checkAndUpdateStock.status;
          rsp.string_code = checkAndUpdateStock.string_code;
          return rsp;
        }
      } else {
        // if(!modeRetry){
        //   // Retry
        //   const objRetryUpdateStocj = {
        //     stock,
        //     newBalance,
        //     version,
        //     payloadStockCompare
        //   }

        //   const retryUpdateStock = await this.retry_update_stock(objRetryUpdateStocj)
        //   if (!retryUpdateStock.status) {
        // rsp.msg = "Failed update stock, compare new version with old version is not eligible"
        //   }else{
        //     rsp.msg = "Successfully update stock with retry condition";
        //     rsp.status = true
        //   }

        //   console.log("Update Stock - Retry : ", retryUpdateStock)
        // }

        rsp.string_code = 'BOOKED_STOCK';
        rsp.msg =
          'Failed update stock, compare new version with old version is not eligible';
        console.log(
          '-> version deduct stock not match : ',
          payloadStockCompare.transaction_id,
        );
        return rsp;
      }
    } catch (error) {
      rsp.msg = error?.message;
      return rsp;
    }
  }

  async check_and_update_stock_old(
    id: string,
    payloadStockCompare: any,
    action = 'deduct',
    version,
  ) {
    const rsp = {
      msg: 'Failed to update stock',
      status: false,
      string_code: 'GENERAL_ERROR',
    };

    if (action == 'deduct') {
      await this.stock
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          {
            $inc: { balance: -1, __v: 1 },
          },
        )
        .then(async (result) => {
          console.log('#X_RESULT_DEDUCT_STOCK : ', result);
          const validationCheckStock = await this.getStock(payloadStockCompare);
          if (validationCheckStock.balance < 0) {
            rsp.status = true;
            rsp.string_code = 'SUCCESS_DEDUCT_AND_ROLLBACK';
            await this.check_and_update_stock(
              id,
              payloadStockCompare,
              (action = 'rollback'),
              version,
            );
          } else {
            rsp.status = true;
            rsp.string_code = 'SUCCESS_DEDUCT_STOCK';
            rsp.msg = 'Successfully deduct stock';
          }
        })
        .catch((result) => {
          rsp.string_code = 'FAILED_DEDUCT_STOCK';
          rsp.msg = 'Failed deduct stock';
        });
    } else if (action == 'rollback') {
      await this.stock
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          {
            $inc: { balance: 1, __v: 1 },
          },
        )
        .then(async (result) => {
          rsp.status = true;
          rsp.string_code = 'SUCCESS_ROLLBACK_STOCK';
          rsp.msg = 'Successfully rollback stock';
        })
        .catch((result) => {
          rsp.string_code = 'FAILED_ROLLBACK_STOCK';
          rsp.msg = 'Failed deduct stock';
        });
    }

    return rsp;
  }

  async check_and_update_stock(
    id: string,
    payloadStockCompare: any,
    action = 'deduct',
    account,
  ) {
    const rsp = {
      msg: 'Failed to update stock',
      status: false,
      string_code: 'GENERAL_ERROR',
    };

    if (action == 'deduct') {
      const newBalance = payloadStockCompare?.is_flashsale
        ? { balance_flashsale: -1, __v: 1 }
        : { balance: -1, __v: 1 };

      const filterBalance = payloadStockCompare?.is_flashsale
        ? { _id: new ObjectId(id), balance_flashsale: { $gt: 0 } }
        : { _id: new ObjectId(id), balance: { $gt: 0 } };
      await this.stock
        .findOneAndUpdate(
          filterBalance,
          {
            $inc: newBalance,
          },
          {
            new: true,
            upsert: true,
          },
        )
        .then(async (result) => {
          console.log('#X_STOCK_AFTER_DEDUCT : ', result);

          rsp.status = true;
          rsp.string_code = 'SUCCESS_DEDUCT_STOCK';
          rsp.msg = 'Successfully deduct stock';

          // Set to Redis
          try {
            const key = `${RedisDataKey.STOCK_KEY}-${payloadStockCompare.keyword}-${payloadStockCompare.location}`;
            await this.cacheManager.set(key, `${result?.balance || 0}|${result?.balance_flashsale || 0}`,{ ttl: 60 * 60 }); //ttl : 1 hour
          } catch (error) {
            console.log("X_SET_STOCK_REDIS", `Failed, ${payloadStockCompare.transaction_id} - ${error.message}`)
          }
         
          // Set update_stock_id
          // payloadStockCompare = {
          //   ...payloadStockCompare,
          //   // stock_update_id: `${id.toString()}_${result?.__v}`,
          // };

          // console.log('X_PAYLOAD_LOGGEDV2 : ', payloadStockCompare);

          const loggedStock = await this.loggedV2(
            payloadStockCompare,
            account,
            'deduct',
            payloadStockCompare.is_flashsale
              ? result?.balance_flashsale
              : result?.balance,
            null,
            payloadStockCompare.is_flashsale,
          );

          console.log('X_RESULT_LOGGEDV2 : ', loggedStock);
        })
        .catch((result) => {
          console.log('X_CATCH_UPDATE : ', JSON.stringify(result));

          rsp.string_code = 'FAILED_DEDUCT_STOCK';
          rsp.msg = 'Failed deduct stock';
        });
    } else if (action == 'rollback') {
      await this.stock
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          {
            $inc: { balance: 1, __v: 1 },
          },
        )
        .then(async (result) => {
          rsp.status = true;
          rsp.string_code = 'SUCCESS_ROLLBACK_STOCK';
          rsp.msg = 'Successfully rollback stock';
        })
        .catch((result) => {
          rsp.string_code = 'FAILED_ROLLBACK_STOCK';
          rsp.msg = 'Failed deduct stock';
        });
    }

    return rsp;
  }

  async retry_update_stock(payload: any, retry_number = 1, success = false) {
    const modeRetry = true;
    const rsp = {
      msg: 'Failed retry update stock',
      status: false,
    };

    const resultUpdateStock = await this.update_stock(
      payload?.stock,
      payload?.newBalance,
      payload?.version,
      null,
      payload?.payloadStockCompare,
      modeRetry,
    );
    success = resultUpdateStock.status;

    // set point stopper default
    const point_stopper_default = 1;

    // get config default from config
    let point_stopper = await this.applicationService.getConfig(
      'DEFAULT_CONS_RETRY_UPDATE_STOCK',
    );

    point_stopper = point_stopper ? point_stopper : point_stopper_default;

    if (success == true) {
      rsp.msg = `Successfuly update stock with condition retry at number ${retry_number}`;
      rsp.status = true;
      return rsp;
    }

    if (retry_number >= point_stopper) {
      rsp.msg = `Stopped retrying, the counter is exceeds the limit, the limit is ${point_stopper}`;
      return rsp;
    }

    retry_number++;
    this.retry_update_stock(payload, retry_number, success);
  }

  async upsert(payload: StockDTO, newBalance: number, account?: Account) {
    let balance = newBalance;
    const stock = await this.getStock(payload);
    if (stock) {
      balance = balance + stock.balance;
      return await this.stock
        .findOneAndUpdate(
          {
            _id: stock._id,
          },
          {
            location: this.toObjectId(payload.location),
            product: this.toObjectId(payload.product),
            balance: balance,
          },
          {
            upsert: true,
            rawResult: true,
            new: true,
          },
        )
        .catch((e: Error) => {
          throw new Error(e.message);
        });
    } else {
      await this.add(payload, account, true);
    }
  }

  async update_reserve_status(
    id: string,
    status: string,
    status_flashsale: boolean,
    id_keyword_main: string
  ): Promise<any> {
    if(id_keyword_main == null){
      return await this.stockReserve.updateOne(
        {
          _id: this.toObjectId(id),
        },
        {
          status: status,
        },
      );
    }else{
      return await this.stockReserve.updateOne(
        {
          _id: this.toObjectId(id),
          is_flashsale: status_flashsale,
        },
        {
          status: status,
        },
      );
    }
  }

  async logged(
    payload,
    account: Account,
    remark: string,
    balance: number,
    session?: ClientSession,
  ) {
    let userId;

    if ((account as any)._id) {
      userId = (account as any)._id;
    } else {
      userId = (await this.getAccountIdOnCollection(account))._id;
    }

    const subtraction = ['deduct', 'reserve'];
    const add = ['add', 'mutation', 'rollback'];

    const log = new this.stockLogs({
      keyword: payload.keyword ? this.toObjectId(payload.keyword) : null,
      location: this.toObjectId(payload.location),
      product: this.toObjectId(payload.product),
      balance: remark === 'add' ? 0 : balance ? balance : 0,
      in: add.includes(remark) ? payload.qty : 0,
      out: subtraction.includes(remark) ? payload.qty : 0,
      account: userId,
      remark,
      transaction_id: payload?.transaction_id || '',
      notification_code: payload?.notification_code || '',
      logged_at: new Date(),
    });

    log
      .save({
        session,
      })
      .catch((e: Error) => {
        throw e;
      });
  }

  async loggedV2(
    payload,
    account: Account,
    remark: string,
    balance: number,
    session?: ClientSession,
    is_flashsale?: boolean,
  ) {
    let userId;

    if ((account as any)._id) {
      userId = (account as any)._id;
    } else {
      userId = (await this.getAccountIdOnCollection(account))._id;
    }

    const subtraction = ['deduct', 'reserve'];
    const add = ['add', 'mutation', 'rollback'];

    const log = new this.stockLogs({
      keyword: payload.keyword ? this.toObjectId(payload.keyword) : null,
      location: this.toObjectId(payload.location),
      product: this.toObjectId(payload.product),
      balance: remark === 'add' ? 0 : balance ? balance : 0,
      in: add.includes(remark) ? payload.qty : 0,
      out: subtraction.includes(remark) ? payload.qty : 0,
      account: userId,
      remark,
      transaction_id: payload?.transaction_id || null,
      notification_code: payload?.notification_code || null,
      stock_update_id: payload?.stock_update_id || null,
      logged_at: new Date(),
      is_flashsale,
    });

    return await log
      .save({
        session,
      })
      .then((e) => {
        return true;
      })
      .catch((e: Error) => {
        return false;
      });
  }

  /**
   * Function for Checking Transaction In Collection Stock Logs
   * @param remark default "deduct" from "deduct|rollback|add"
   * @param transaction_id
   * @returns
   */
  async checkTrxStockLogs(transaction_id: string, remark = 'deduct') {
    const rsp: any = {
      status: false,
      data: null,
      message: 'Failed checking trx in collection stock_logs',
    };

    try {
      const dataStockLogs = await this.stockLogs.findOne({
        transaction_id: transaction_id,
        remark: remark,
      });
      if (dataStockLogs) {
        rsp.data = dataStockLogs;
        rsp.message = `Trx ${transaction_id} is found`;
        rsp.status = true;
      } else {
        rsp.message = `Trx ${transaction_id} not found`;
      }
      return rsp;
    } catch (error) {
      rsp.message = error?.message || rsp.message;
      return rsp;
    }
  }

  /**
   * Function for Checking Initial Balance In Collection Stocks
   * @param payload
   * @param simualtion_incoming_balance
   * @returns
   */
  checkInitialBalance(
    inital_balance: number,
    simualtion_incoming_balance: number,
  ) {
    const rsp: any = {
      status: false,
      message: 'Failed checking initial balance',
    };

    try {
      if (inital_balance && simualtion_incoming_balance) {
        if (simualtion_incoming_balance > inital_balance) {
          rsp.message = `Failed, not eligibile to update stock`;
        } else {
          rsp.message = `Success, eligible to update stock`;
          rsp.status = true;
        }
      } else {
        rsp.message = `Stock not found`;
      }
      return rsp;
    } catch (error) {
      rsp.message = error?.message || rsp.message;
      return rsp;
    }
  }

  /**
   * Function for checking last balance
   * @param remark default "deduct" from "deduct|rollback|add"
   * @param transaction_id
   * @returns
   */
  async checkLastBalance(
    payload: StockDTO,
    newBalance: number,
    remark = 'deduct',
  ) {
    const rsp: any = {
      status: true,
      message: 'Eligibile checking last balance',
    };

    try {
      const query = {
        location: this.toObjectId(payload.location),
        product: this.toObjectId(payload.product),
        remark: 'deduct',
      };

      if (payload.keyword) {
        query['keyword'] = this.toObjectId(payload.keyword);
      }

      const lastBalance = await this.stockLogs.findOne(
        query,
        { balance: 1, logged_at: 1 },
        { sort: { logged_at: -1 } },
      );

      if (lastBalance) {
        // Ensure lastBalance.logged_at is of type Date
        const lastLoggedAt = new Date(lastBalance?.logged_at);

        // Get the difference in milliseconds
        const delay = new Date().getTime() - lastLoggedAt.getTime();

        console.log('#SRL_DELAY : ', delay);
        // Check the condition for updating stock
        if (lastBalance.balance === newBalance && delay <= 2300) {
          rsp.message = `Not eligible to update stock - last_balance`;
          rsp.status = false;
          return rsp;
        }
      }

      rsp.message = `Eligibile to update stock - last_balance`;
      return rsp;
    } catch (error) {
      rsp.message = error?.message || rsp.message;
      rsp.status = false;
      return rsp;
    }
  }

  async delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  // Reserve Section
  /**
   * Reserve Function
   * @param payload
   * @param account
   * @returns
   */
  async reserve(payload: StockReserveDTO, account: Account) {
    return await this.reserve_process(payload, account);
  }

  async approve_reserve(id: string, account: Account) {
    const reserve = await this.getStockReserveById(id);
    if (reserve) {
      if (reserve.status === 'Actived') {
        throw new BadRequestException(
          `Stock Reserve for id ${id} has been approved!`,
        );
      }

      return await this.update_reserve_status(id, 'Actived', false,null)
        .catch((e: Error) => {
          throw new Error(e.message);
        })
        .then(async (data) => {
          return await this.upsertV2(
            {
              location: reserve.destination_location,
              product: reserve.product,
              keyword: reserve.keyword,
              qty: reserve.balance,
            },
            reserve.balance,
          ).then(async (data) => {
            await this.logged(
              {
                location: reserve.destination_location,
                product: reserve.product,
                qty: reserve.balance,
              },
              account,
              'mutation',
              data.value.balance === reserve.balance ? 0 : data.value.balance,
            );

            const res = new StockResponse();
            res.code = 'S00000';
            res.message = 'Approval Reserve Success!';
            res.transaction_classify = 'TRANSACTION_STOCK';
            (res.statusCode = HttpStatus.OK), (res.payload = data.value);
            return res;
          });
        });
    } else {
      throw new BadRequestException(`Stock Reserve for id ${id} not fond!`);
    }
  }

  async approve_reserve_keyword(
    id_keyword_main: string,
    id_keyword: string,
    account: Account,
    type_threshold: any,
    threshold_balance: any,
  ) {
    const dataKeyword = await this.getStockReserveByIdKeyword(id_keyword);
    await Promise.all(
      dataKeyword.map(async (reserve) => {
        if (reserve) {
          if (reserve.status === 'Actived') {
            throw new BadRequestException(
              `Stock Reserve for id ${id_keyword} has been approved! Please Reject Keyword first`,
            );
          }
          return await this.update_reserve_status(
            reserve._id.toString(),
            'Actived',
            false,
            id_keyword_main
          ).then(async (data) => {
            const origin_stock = await this.getStockForReserveWithoutKeyword({
              product: reserve.product,
              location: reserve.origin_location,
            });
  
            const newBalance = origin_stock.balance - reserve.balance;
            if (newBalance < 0) {
              const keywords = this.toObjectId(id_keyword)
              console.log('=== DISINI ===',keywords);
              await this.stockReserve.updateMany({keyword: keywords },{$set: {status: 'Booked'}})
              throw new BadRequestException(
                `The stock can't be below 0, stock now is ${origin_stock.balance}`,
              );
            }
  
            // if (id_keyword_main) {
            //   // update stock allocated by keyword
            //   await this.stock
            //     .findOneAndUpdate(
            //       {
            //         location: this.toObjectId(reserve.destination_location),
            //         product: this.toObjectId(reserve.product),
            //         keyword: this.toObjectId(id_keyword_main),
            //       },
            //       {$inc: {balance: reserve.balance}}
            //     ).exec()
            // }
            // update stock general
            return await this.stock
              .findOneAndUpdate(
                { _id: origin_stock._id },
                { $inc: { balance: -reserve.balance } },
              )
              .catch((e: Error) => {
                throw new Error(e.message);
              })
              .then(async (data) => {
                if (
                  type_threshold == 'no_threshold' &&
                  (id_keyword_main == null || id_keyword_main !== null)
                ) {
                  await this.upsertV2(
                    {
                      location: reserve.destination_location,
                      product: reserve.product,
                      keyword: id_keyword_main ? id_keyword_main : id_keyword,
                      qty: reserve.balance,
                    },
                    reserve.balance,
                    account,
                  )
                    .then(async (data) => {
                      if (data !== undefined) {
                        await this.logged(
                          {
                            location: reserve.origin_location,
                            product: reserve.product,
                            keyword: id_keyword,
                            qty: reserve.balance,
                          },
                          account,
                          'mutation',
                          data.value.balance === reserve.balance
                            ? 0
                            : data.value.balance,
                        );
                      }
  
                      const res = new StockResponse();
                      res.code = 'S00000';
                      res.message = 'Approval Reserve Success!';
                      res.transaction_classify = 'TRANSACTION_STOCK';
                      res.statusCode = HttpStatus.OK;
                      res.payload = data !== undefined ? data.value : null;
                      return res;
                    })
                    .catch((e: Error) => {
                      throw new Error(e.message);
                    });
                }
  
                if (
                  type_threshold !== 'no_threshold' &&
                  (id_keyword_main == null || id_keyword_main !== null)
                ) {
                  await this.upsertV2(
                    {
                      location: reserve.destination_location,
                      product: reserve.product,
                      keyword: id_keyword_main ? id_keyword_main : id_keyword,
                      qty: threshold_balance,
                    },
                    reserve.balance,
                    account,
                  )
                    .then(async (data) => {
                      if (data !== undefined) {
                        await this.logged(
                          {
                            location: reserve.origin_location,
                            product: reserve.product,
                            keyword: id_keyword,
                            qty: threshold_balance,
                          },
                          account,
                          'mutation_threshold',
                          data.value.balance === threshold_balance
                            ? 0
                            : data.value.balance,
                        );
                      }
  
                      const res = new StockResponse();
                      res.code = 'S00000';
                      res.message = 'Approval Reserve Success!';
                      res.transaction_classify = 'TRANSACTION_STOCK';
                      res.statusCode = HttpStatus.OK;
                      res.payload = data !== undefined ? data.value : null;
                      return res;
                    })
                    .catch((e: Error) => {
                      throw new Error(e.message);
                    });
                }
              })
              .catch((e: Error) => {
                throw new Error(e.message);
              });
          });
        }
      })
    );
  }

  /**
   * Process Add reserve data to DB
   * @param payload
   * @param account
   * @returns
   */
  async add_reserve(payload: StockReserveDTO, account: Account) {
    if (payload.origin_location === null) {
      const location = await this.getLocationHQ();
      payload.origin_location = location._id.toString();
    }

    const data = new this.stockReserve({
      keyword: this.toObjectId(payload.keyword),
      origin_location: this.toObjectId(payload.origin_location),
      destination_location: this.toObjectId(payload.destination_location),
      product: this.toObjectId(payload.product),
      balance: payload.qty,
      status: 'Booked',
      is_flashsale: payload.is_flashsale,
    });

    return await data.save().catch((e: Error) => {
      throw new Error(e.message);
    });
  }

  /**
   * Bussines Process reserve without keyword
   * @param payload
   * @param account
   */
  async reserve_process_without_keyword(
    payload: StockReserveDTO,
    account: Account,
  ) {
    if (payload.origin_location === null) {
      const location = await this.getLocationHQ();
      payload.origin_location = location._id.toString();
    }

    const origin_stock = await this.getStockForReserveWithoutKeyword({
      product: payload.product,
      location: payload.origin_location,
    });

    const newBalance = origin_stock.balance - payload.qty;
    if (newBalance < 0) {
      throw new Error(
        `The stock can't be below 0, stock now is ${origin_stock.balance}`,
      );
    }

    // Create Reserve
    return await this.add_reserve(payload, account).then(async (data) => {
      const res = new StockResponse();
      res.code = 'S00000';
      res.transaction_classify = 'TRANSACTION_STOCK';
      res.message = 'Reserve Stock Success!';
      (res.statusCode = HttpStatus.CREATED), (res.payload = data);
      res.transaction_id;
      return res;
    });
  }

  /**
   * Bussines Process reserve without keyword
   * @param payload
   * @param account
   */
  async reserve_process_with_keyword(
    payload: StockReserveDTO,
    account: Account,
  ) {
    if (payload.destination_location === null) {
      const location = await this.getLocationHQ();
      payload.destination_location = location._id.toString();
    }

    const origin_stock = await this.getStockForReserveWithoutKeyword({
      product: payload.product,
      location: payload.origin_location,
    });
    console.log('=== ORIGIN STOCK ===', origin_stock);
    const newBalance = origin_stock.balance - payload.qty;
    if (newBalance < 0) {
      throw new Error(
        `The stock can't be below 0, stock now is ${origin_stock.balance}`,
      );
    }

    // Create Reserve
    return await this.add_reserve(payload, account).then(async (data) => {
      const res = new StockResponse();
      res.code = 'S00000';
      res.transaction_classify = 'TRANSACTION_STOCK';
      res.message = 'Allocated Stock By Keyword Success!';
      (res.statusCode = HttpStatus.CREATED), (res.payload = data);
      res.transaction_id;
      return res;
    });
  }

  /**
   * Bussines Process reserve without keyword
   * @param keywordIdMain
   * @param payload
   * @param account
   */
  async reserve_process_with_keyword_edit(
    keywordIdMain: string,
    payload: StockReserveDTO,
    account: Account,
  ) {
    if (payload.destination_location === null) {
      const location = await this.getLocationHQ();
      payload.destination_location = location._id.toString();
    }

    const origin_stock = await this.getStockForReserveWithoutKeyword({
      product: payload.product,
      location: payload.origin_location,
    });

    const newBalance = origin_stock.balance - payload.qty;
    if (newBalance < 0) {
      throw new Error(
        `The stock can't be below 0, stock now is ${origin_stock.balance}`,
      );
    }

    // Create Reserve
    return await this.add_reserve(payload, account).then(async (data) => {
      const res = new StockResponse();
      res.code = 'S00000';
      res.transaction_classify = 'TRANSACTION_STOCK';
      res.message = 'Allocated Stock By Keyword Success!';
      (res.statusCode = HttpStatus.CREATED), (res.payload = data);
      res.transaction_id;
      return res;
    });
  }

  /**
   * Bussines Process reserve
   * @param payload
   * @param account
   */
  async reserve_process(payload: StockReserveDTO, account: Account) {
    const origin_stock = await this.getStockForReserve({
      product: payload.product,
      keyword: payload.keyword,
      location: payload.origin_location,
    });

    const newBalance = origin_stock.balance - payload.qty;
    if (newBalance < 0) {
      throw new Error(
        `The stock can't be below 0, stock now is ${origin_stock.balance}`,
      );
    }

    // Create Reserve
    return await this.add_reserve(payload, account).then(async (data) => {
      // Prepare payload compare stock
      const payloadCompareStock: StockDTO = {
        product: payload.product,
        keyword: payload.keyword,
        location: payload.origin_location,
      };

      // Update Stock
      await this.update_stock(
        origin_stock,
        newBalance,
        origin_stock.__v,
        null,
        payloadCompareStock,
      )
        .catch((e: Error) => {
          throw new Error(e.message);
        })
        .then(async (data) => {
          // Add logged Reserve
          await this.logged(payload, account, 'reserve', newBalance);
        });

      const res = new StockResponse();
      res.code = 'S00000';
      res.transaction_classify = 'TRANSACTION_STOCK';
      res.message = 'Reserve Stock Success!';
      (res.statusCode = HttpStatus.CREATED), (res.payload = data);
      res.transaction_id;
      return res;
    });
  }

  // additional Service to another service
  async getAccountIdOnCollection(account: Account) {
    const data = this.account.findOne({ user_id: account.user_id }).lean();
    return data;
  }

  async getStock(payload: StockDTO) {
    const query = {
      location: this.toObjectId(payload.location),
    };
    
    if (payload.product) {
      query['product'] = this.toObjectId(payload.product);
    }

    if (payload.keyword) {
      query['keyword'] = this.toObjectId(payload.keyword);
    }

    return await this.stock.findOne(query);
  }

  async getStockForReserveWithoutKeyword(payload: {
    location: string;
    product: string;
  }) {
    return await this.stock.findOne({
      location: this.toObjectId(payload.location),
      product: this.toObjectId(payload.product),
      keyword: null,
    });
  }

  async getStockForReserve(payload: {
    location: string;
    product: string;
    keyword: string;
  }) {
    return await this.stock.findOne({
      location: this.toObjectId(payload.location),
      product: this.toObjectId(payload.product),
      keyword: this.toObjectId(payload.keyword),
    });
  }

  async getStockReserveById(id: string) {
    return await this.stockReserve.findOne({
      _id: this.toObjectId(id),
    });
  }

  async getStockReserveByIdKeyword(id: string) {
    return await this.stockReserve.find({
      keyword: this.toObjectId(id),
    });
  }

  async getTotalStockByKeyword(param: { keyword: string }): Promise<any> {
    const data = await this.stock.aggregate(
      [
        {
          $match: {
            $and: [{ keyword: this.toObjectId(param.keyword) }],
          },
        },
        { $group: { _id: '$keyword', sum: { $sum: '$balance' } } },
      ],
      (err, result) => {
        return result;
      },
    );

    return data?.[0]?.sum ?? 0;
  }

  toObjectId(value?: string): ObjectId | string | null {
    if (!value) return null;

    try {
      return new ObjectId(value);
    } catch (err) {
      return value;
    }
  }

  // get location
  async getLocationHQ() {
    return await this.locationModel.findOne({ name: 'HQ' }).lean();
  }

  async getStockFromKeywordId(keywordId: string) {
    const query = [];
    const filter_builder = { $and: [] };

    /*
    query.push({
      $lookup: {
        from: 'locations',
        localField: 'location',
        foreignField: '_id',
        as: 'location',
      },
    });

    query.push({
      $unwind: {
        path: '$location',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productinventories',
        localField: 'product',
        foreignField: '_id',
        as: 'product',
      },
    });

    query.push({
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productcategories',
        localField: 'product.category_id',
        foreignField: 'core_product_category_id',
        as: 'product.category',
      },
    });

    query.push({
      $unwind: {
        path: '$product.category',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productsubcategories',
        localField: 'product.sub_category_id',
        foreignField: 'core_product_subcategory_id',
        as: 'product.sub_category',
      },
    });

    query.push({
      $unwind: {
        path: '$product.sub_category',
        preserveNullAndEmptyArrays: true,
      },
    });

    filter_builder.$and.push({
      'product.deleted_at': null,
    });

    filter_builder.$and.push({
      'location.name': 'HQ',
    });
    */

    filter_builder.$and.push({
      keyword: this.toObjectId(keywordId),
    });

    query.push({
      $match: filter_builder,
    });

    const data = await this.stock.aggregate(query, (err, result) => {
      return result;
    });

    return data;
  }

  async update(payload: StockDTO, account: Account, isAdd: boolean) {
    console.log({ payload });

    let data = await this.stock.findOne({
      location: this.toObjectId(payload.location),
      product: this.toObjectId(payload.product),
      keyword: this.toObjectId(payload?.keyword),
    });

    // handle stock data already exist
    if (data) {
      console.log('Update stock qty.');
      data.balance = payload.qty;
    } else {
      console.log('Create new stock.');
      data = new this.stock({
        location: this.toObjectId(payload.location),
        product: this.toObjectId(payload.product),
        keyword: this.toObjectId(payload?.keyword),
        balance: payload.qty,
      });
    }

    const res = await data
      .save()
      .catch((e: Error) => {
        throw new BadRequestException(e.message);
      })
      .then(async () => {
        if (isAdd) {
          await this.logged(payload, account, 'add', 0);
        } else {
          await this.logged(payload, account, 'mutation', payload.qty);
        }
        const res = new StockResponse();
        res.code = 'S00000';
        res.transaction_classify = 'TRANSACTION_STOCK';
        res.message = 'Initial Stock Success!';
        (res.statusCode = HttpStatus.OK), (res.payload = data);
        res.transaction_id = data._id;
        return res;
      });

    return res;
  }
  async getStockDetailGlobal(param: {
    location: string;
    product: string;
    keyword: string;
  }): Promise<any> {
    const data = await this.stock.aggregate(
      [
        {
          $match: {
            $and: param.product
              ? [
                  { location: this.toObjectId(param.location) },
                  {
                    product: param.product,
                  },
                  { keyword: this.toObjectId(param.keyword) },
                ]
              : [
                  { location: this.toObjectId(param.location) },
                  { keyword: this.toObjectId(param.keyword) },
                ],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return data[0];
  }

  public async cronStockThreshold(): Promise<ReportingServiceResult> {
    try {
      let newStock: number, newMaxThreshold: number;

      const currentDateTime = moment().utc();
      const currentHour: string = moment().utc().add(7, 'hours').format('HH'); // untuk filter time menggunakan format UTC+7
      const currentDate: string = currentDateTime.format('YYYY-MM-DD'); // untuk filter start_date & end_date menggunakan format UTC+0

      const query = {
        $match: {
          deleted_at: null,
          start_from: { $lte: currentDate },
          end_at: { $gte: currentDate },
          schedule: { $in: [currentHour] },
        },
      };
      console.log('query', JSON.stringify(query));

      const result = {
        exist_stock: [],
        flash_sale_running: [],
        not_exist_stock: [],
        achieve_maximum_threshold: [],
        query: JSON.stringify(query),
      };

      const stockThresholds = await this.stockThresholdModel.aggregate([query]);

      for (const stockThershold of stockThresholds) {
        const {
          _id,
          keyword_id,
          location,
          type: stockThresholdType,
          bonus_type,
          product_id,
          maximum_threshold,
          stock_threshold,
        } = stockThershold;

        const bonusType = bonus_type ?? '';
        const productId = product_id ?? '';

        const queryFilter = {
          keyword: bonusType === 'merchandise' ? null : keyword_id,
          location,
          product: Types.ObjectId.isValid(productId)
            ? new mongoose.Types.ObjectId(productId)
            : productId,
        };
        console.log('queryFilter', JSON.stringify(queryFilter));

        const [stock] = await this.stock.aggregate([
          { $match: queryFilter },
          {
            $lookup: {
              from: 'keywords',
              localField: 'keyword',
              foreignField: '_id',
              as: 'keyword',
            },
          },
        ]);

        if (!stock) {
          result.not_exist_stock.push(JSON.stringify(stockThershold));
          continue;
        }

        const isActiveFlashSale = this.checkActiveFlashSale(
          stock.keyword[0],
          currentDateTime,
        );
        console.log('isActiveFlashSale', isActiveFlashSale);
        delete stock.keyword;

        if (isActiveFlashSale) {
          result.flash_sale_running.push(JSON.stringify(stockThershold));
          continue;
        }

        const remaining = stock.balance;
        const actualStock =
          (await this.actualStock(keyword_id))[0]?.actual_stock ??
          (0 as number);
        console.log('actualStock', actualStock);

        if (stockThresholdType === StockThresholdType.CARRY_OVER) {
          const tobeRemaining = remaining + stock_threshold;
          newStock = tobeRemaining > actualStock ? actualStock : tobeRemaining;
          newMaxThreshold = actualStock - newStock;
        } else {
          newStock =
            actualStock < stock_threshold ? actualStock : stock_threshold;
          newMaxThreshold =
            actualStock < stock_threshold ? 0 : actualStock - newStock;
        }

        if (actualStock === 0 && maximum_threshold == 0) {
          console.log(`keyword_id ${keyword_id} has achieve maximum threshold`);
          result.achieve_maximum_threshold.push(JSON.stringify(stockThershold));
          continue;
        }

        console.log('updated payload', {
          keyword: stockThershold.keyword ?? null,
          keyword_id,
          newStock,
          newMaxThreshold,
        });

        // inser stock_log
        const stockLog = await new this.stockLogs({
          keyword: this.toObjectId(keyword_id),
          location: this.toObjectId(stock.location),
          product: this.toObjectId(stock.product),
          balance: newStock,
          in: newStock,
          remaining: remaining,
          out: 0,
          account: 'account',
          remark: 'reset stock threshold by system',
          logged_at: new Date(),
        })
          .save()
          .catch((e: Error) => {
            throw e;
          });

        // udpate balance in stock collection
        const updatedStock = await this.stock.findByIdAndUpdate(
          stock._id,
          { balance: newStock, __v: stock.__v },
          { new: true },
        );

        // update maximum_threshold
        await this.stockThresholdModel.updateOne(
          { _id },
          { maximum_threshold: newMaxThreshold },
        );

        // reset redis stock
        await this.keywordService.deleteRedisStock(
          keyword_id.toString(),
          stock.location.toString(),
        );

        result.exist_stock.push(
          JSON.stringify({ old_stock: stock, stockLog, updatedStock }),
        );
      }

      return {
        is_error: false,
        message:
          result.not_exist_stock.length === 0
            ? 'success'
            : 'there is undefined stock threshold in stocks collection',
        stack: null,
        custom_code: HttpStatus.OK,
        result: result,
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

  async getStockReserveByIdProduct(
    id: string,
    status: string,
    initialStock: number,
  ): Promise<any> {
    let isStatus = false;

    const result = await this.stockReserve.findOne({
      product: this.toObjectId(id),
      status: status,
    });

    const location_hq = await this.getLocationHQ();

    const origin_stock = await this.getStockForReserveWithoutKeyword({
      product: result?.product,
      location: location_hq._id.toString(),
    });

    if (result) {
      if (origin_stock) {
        const stockAvalaibleOrigin = origin_stock?.balance - result?.balance;
        console.log('stockAvalaibleOrigin:', stockAvalaibleOrigin);

        const stockLast = stockAvalaibleOrigin - initialStock;
        console.log('stockLast:', stockLast);

        if (stockLast < 0) {
          isStatus = true;
        }
      }
    }

    //Check Jika Status definisikan Actived <= untuk remove from draft
    if (status == 'Actived') {
      const origin_stockDraft = await this.getStockForReserveWithoutKeyword({
        product: id,
        location: location_hq._id.toString(),
      });

      if (origin_stockDraft) {
        const stockLastAvalaible = origin_stockDraft?.balance - initialStock;
        if (stockLastAvalaible <= 0) {
          isStatus = true;
        }
      }
    }

    if (status == 'Created') {
      const origin_stockDraft = await this.getStockForReserveWithoutKeyword({
        product: id,
        location: location_hq._id.toString(),
      });

      if (origin_stockDraft) {
        const stockLastAvalaible = origin_stockDraft?.balance - initialStock;
        if (stockLastAvalaible < 0) {
          isStatus = true;
        }
      }
    }

    return isStatus; // Mengembalikan nilai isStatus
  }

  async delete_reserve_rejectByProduct(id: any, product: any): Promise<any> {
    const dataReserve = await this.stockReserve.deleteMany({
      keyword: this.toObjectId(id),
      product: this.toObjectId(product),
    });
    return dataReserve;
  }

  async stocksTresholdsCreate(data: StockThreshold): Promise<any> {
    try {
      let enumType;
      let balance = 0;
      if (data?.type === 'daily_carry_over') {
        enumType = StockThresholdType.CARRY_OVER;
      }
      if (data?.type === 'daily_threshold') {
        enumType = StockThresholdType.DAILY;
      }
      const checkStocksTreshold = await this.stocksThresholdsFindWithProduct(
        data?.keyword_id,
        data?.keyword,
        data?.location,
        data?.product_id,
      );
      console.log(
        '=== DATA DI FUNCTION CREATE STOCK THRES ===',
        checkStocksTreshold,
      );
      if (data?.bonus_type == 'direct_redeem') {
        const checkStocksRemaining = await this.getStockDetail({
          location: data?.location,
          product: data?.product_id,
          keyword: data?.keyword_id,
        });

        if (!checkStocksTreshold && checkStocksRemaining) {
          balance = data?.maximum_threshold;
        } else if (checkStocksTreshold && checkStocksRemaining) {
          balance = data?.maximum_threshold + checkStocksRemaining?.balance;
        } else {
          balance = data?.maximum_threshold;
        }
      } else {
        const checkStocksRemaining = await this.getStockDetail({
          location: data?.location,
          product: '',
          keyword: data?.keyword_id,
        });
        if (!checkStocksTreshold && checkStocksRemaining) {
          balance = data?.maximum_threshold;
        } else if (checkStocksTreshold && checkStocksRemaining) {
          balance = data?.maximum_threshold + checkStocksRemaining?.balance;
        } else {
          balance = data?.maximum_threshold;
        }
      }
      console.log('=== BALANCE INSERT KE COLL ===', balance);
      const total_stock_reset = balance;
      const newStocksThreshold = new this.stockThresholdModel({
        ...data,
        location: new mongoose.Types.ObjectId(data?.location),
        maximum_threshold: total_stock_reset,
        type: enumType,
        created_at: new Date(), // Set created_at to the current date/time
        updated_at: new Date(), // Set updated_at to the current date/time
        deleted_at: null, // Assuming deleted_at should be initially set to null
      });

      const result = await newStocksThreshold.save();
      console.log('=== CHECK STOCKS THRESHOLD RESULT ===', result);
      return result;
    } catch (error) {
      // Handle error, for example, log it or throw a custom exception
      console.error('Error creating Stock Threshold:', error);
      throw new Error('Failed to create Stock Threshold');
    }
  }

  async stocksThresholdsFind(
    keyword_id: string,
    keyword: string,
    location: string,
  ): Promise<StockThreshold | null> {
    try {
      const result = await this.stockThresholdModel.findOne({
        keyword_id: new mongoose.Types.ObjectId(keyword_id),
        keyword: keyword,
        location: new mongoose.Types.ObjectId(location),
      });
      console.log(keyword_id, keyword, location);
      console.log('=== CHECK STOCKS THRESHOLD FIND ===', result);
      return result;
    } catch (error) {
      // Handle error, for example, log it or throw a custom exception
      console.error('Error finding Stock Threshold:', error);
      throw new Error('Failed to find Stock Threshold');
    }
  }

  async stocksThresholdsUpdate(
    keyword_id: string,
    keyword: string,
    location: string,
    data: Partial<StockThreshold>,
    deleted: boolean,
  ): Promise<StockThreshold | null> {
    try {
      let enumType;
      let result;
      if (data?.type === 'daily_carry_over') {
        enumType = StockThresholdType.CARRY_OVER;
      }
      if (data?.type === 'daily_threshold') {
        enumType = StockThresholdType.DAILY;
      }
      const filter = {
        keyword_id: new mongoose.Types.ObjectId(keyword_id),
        keyword: keyword,
        location: new mongoose.Types.ObjectId(location),
      };
      if (deleted) {
        const setUpdate = {
          location: new Types.ObjectId(data?.location),
          type: enumType,
          schedule: data?.schedule,
          product_id: data?.product_id,
          stock_threshold: data?.stock_threshold,
          maximum_threshold: data?.maximum_threshold,
          start_from: data?.start_from,
          end_at: data?.end_at,
          updated_at: new Date(),
          deleted_at: null,
        };
        result = await this.stockThresholdModel
          .findOneAndUpdate(filter, { $set: setUpdate })
          .exec();
      } else {
        const maximum_threshold = data?.maximum_threshold;

        const setUpdate = {
          location: new Types.ObjectId(data?.location),
          type: enumType,
          schedule: data?.schedule,
          product_id: data?.product_id,
          stock_threshold: data?.stock_threshold,
          start_from: data?.start_from,
          end_at: data?.end_at,
          updated_at: new Date(),
          deleted_at: null,
        };

        const incUpdate = {
          maximum_threshold: maximum_threshold,
        };

        const options = {
          new: true,
        };

        result = await this.stockThresholdModel
          .findOneAndUpdate(
            filter,
            { $set: setUpdate, $inc: incUpdate },
            options,
          )
          .exec();
      }

      console.log('=== CHECK STOCKS THRESHOLD UPDATE ===', result);

      if (!result) {
        throw new NotFoundException('Stock Threshold not found');
      }

      return result;
    } catch (error) {
      console.error('Error updating Stock Threshold:', error);
      throw new Error('Failed to update Stock Threshold');
    }
  }

  async stocksThresholdsDelete(
    keyword_id: string,
    keyword: string,
    location: string,
    maximum_threshold: number,
  ): Promise<any> {
    try {
      const find = {
        keyword_id: new mongoose.Types.ObjectId(keyword_id),
        keyword: keyword,
        location: new mongoose.Types.ObjectId(location),
      };
      const update = {
        $inc: { maximum_threshold: -maximum_threshold },
        deleted_at: new Date(),
      };
      const result = await this.stockThresholdModel
        .findOneAndUpdate(find, update, { upsert: true, new: true })
        .exec();

      if (!result) {
        throw new NotFoundException('Stock Threshold not found');
      }
    } catch (error) {
      // Handle error, for example, log it or throw a custom exception
      console.error('Error deleting Stock Threshold:', error);
      throw new Error('Failed to delete Stock Threshold');
    }
  }

  async stocksThresholdsFindWithProduct(
    keyword_id: string,
    keyword: string,
    location: string,
    product_id: string,
  ): Promise<StockThreshold | null> {
    try {
      const result = await this.stockThresholdModel
        .findOne({
          keyword_id: new mongoose.Types.ObjectId(keyword_id),
          keyword: keyword,
          product_id: product_id,
          location: new mongoose.Types.ObjectId(location),
        })
        .exec();
      console.log('=== CHECK STOCKS THRESHOLD FIND WITH PRODUCT ===', result);
      return result;
    } catch (error) {
      // Handle error, for example, log it or throw a custom exception
      console.error('Error finding Stock Threshold:', error);
      throw new Error('Failed to find Stock Threshold');
    }
  }

  async actualStock(keyword_id: string): Promise<any> {
    const id_key = new Types.ObjectId(keyword_id);
    const keyword: any = await this.keywordModel.findOne(
      { _id: id_key },
      { _id: 0, bonus: 1 },
    );

    const responseArray = []; // Array to store the results

    if (keyword && keyword.bonus && Array.isArray(keyword.bonus)) {
      for (let i = 0; i < keyword.bonus.length; i++) {
        let product_id = null;
        let location_id = null;
        const totalStocInitialkPerLocation = 0;
        const bonus = keyword.bonus[i];
        if (bonus?.bonus_type == 'direct_redeem') {
          product_id = new Types.ObjectId(bonus?.merchandise);
        } else {
          product_id = getProductID(bonus.bonus_type, this.configService);
        }

        for (let j = 0; j < bonus?.stock_location.length; j++) {
          const stock_perlocation = bonus?.stock_location[j];

          if (stock_perlocation && stock_perlocation.stock) {
            location_id = new Types.ObjectId(stock_perlocation?.location_id);
            const stock_initial = stock_perlocation?.stock; // Initial stock value

            const stocks = await this.stockLogs.aggregate([
              {
                $match: {
                  $and: [
                    { keyword: id_key },
                    { location: location_id },
                    { product: product_id },
                    { remark: 'deduct' },
                  ],
                },
              },
            ]);

            const stock_logs = await this.stockLogs.aggregate([
              {
                $match: {
                  $and: [
                    { keyword: id_key },
                    { location: location_id },
                    { product: product_id },
                  ],
                },
              },
              {
                $group: {
                  _id: {
                    location: '$location',
                    keyword: '$keyword',
                    product: '$product',
                  },
                  stock_deduct: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ['$remark', 'deduct'] },
                            { $eq: ['$in', 0] },
                            { $eq: ['$out', 1] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  stock_refund: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ['$remark', 'rollback'] },
                            { $eq: ['$in', 1] },
                            { $eq: ['$out', 0] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  location: '$_id.location',
                  keyword: '$_id.keyword',
                  stock_all: { $subtract: ['$stock_deduct', '$stock_refund'] },
                },
              },
            ]);

            if (stocks.length < 0) {
              for (const log of stock_logs) {
                log.actual_stock = stock_initial;
              }
            } else {
              // Adjust the actual_stock value by subtracting stock_initial
              for (const log of stock_logs) {
                log.actual_stock = stock_initial - log.stock_all;
              }
            }
            // Push elements from stock_logs directly into responseArray
            responseArray.push(...stock_logs);
          }
        }
      }
    }

    // Return the responseArray
    return responseArray;
  }

  async stocksThresholdsFindDeleted(
    keyword_id: string,
    keyword: string,
    location: string,
  ): Promise<StockThreshold | null> {
    try {
      const result = await this.stockThresholdModel
        .findOne({
          keyword_id: new mongoose.Types.ObjectId(keyword_id),
          keyword: keyword,
          location: new mongoose.Types.ObjectId(location),
          deleted_at: { $ne: null }, // Menambahkan kondisi deleted tidak sama dengan null
        })
        .exec();
      console.log('=== CHECK STOCKS THRESHOLD FIND ===', result);
      return result;
    } catch (error) {
      // Handle error, for example, log it or throw a custom exception
      console.error('Error finding Stock Threshold:', error);
      throw new Error('Failed to find Stock Threshold');
    }
  }

  async getStockRC(param: { product: string; keyword: string }): Promise<any> {
    const data = await this.stock.aggregate(
      [
        {
          $match: {
            $and: param.product
              ? [
                  {
                    product: param.product,
                  },
                  { keyword: this.toObjectId(param.keyword) },
                ]
              : [{ keyword: this.toObjectId(param.keyword) }],
          },
        },
        {
          $group: {
            _id: null, // Mengelompokkan semua dokumen
            totalBalance: { $sum: '$balance' }, // Menjumlahkan field balance
            totalBalanceFlashsale: { $sum: '$balance_flashsale' }, // Menjumlahkan field balance
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return data[0];
  }

  async loggedV3FS(
    payload,
    account: Account,
    remark: string,
    balance: number,
    session?: ClientSession,
    is_flashsale?: boolean,
  ) {
    let userId;

    if ((account as any)._id) {
      userId = (account as any)._id;
    } else {
      userId = (await this.getAccountIdOnCollection(account))._id;
    }

    const subtraction = ['deduct', 'reserve'];
    const add = ['add', 'mutation', 'rollback'];

    const log = new this.stockLogs({
      keyword: payload.keyword ? this.toObjectId(payload.keyword) : null,
      location: this.toObjectId(payload.location),
      product: this.toObjectId(payload.product),
      balance: remark === 'add' ? 0 : balance ? balance : 0,
      in: add.includes(remark) ? payload.qty_flashsale : 0,
      out: subtraction.includes(remark) ? payload.qty_flashsale : 0,
      account: userId,
      remark,
      transaction_id: payload?.transaction_id || null,
      notification_code: payload?.notification_code || null,
      stock_update_id: payload?.stock_update_id || null,
      logged_at: new Date(),
      is_flashsale,
    });

    return await log
      .save({
        session,
      })
      .then((e) => {
        return true;
      })
      .catch((e: Error) => {
        return false;
      });
  }

  async updateStockFlashSale(
    payload: StockDTO,
    account: Account,
    isAdd: boolean,
    thershold: string,
  ) {
    try{
      console.log({ payload });
      let updateStock = {};
      const findStock = {
        location: this.toObjectId(payload.location),
        product: this.toObjectId(payload.product),
        keyword: this.toObjectId(payload?.keyword),
      };
      const origin_stock = await this.stock.findOne(findStock);
      const balanceNowFS = origin_stock?.balance - payload?.qty_flashsale
      if(balanceNowFS < 0){
        throw new BadRequestException(
          `Flash sale stock ${payload?.qty_flashsale} cannot be greater than regular stock ${origin_stock?.balance}`,
        );
      }

      if (isAdd) {
        updateStock = {
          $inc: {
            balance: payload.qty,
            balance_flashsale: payload.qty_flashsale,
          },
        };
      } else {
        updateStock = {
          $inc: {
            balance: -payload.qty_flashsale + payload.qty,
            balance_flashsale: payload.qty_flashsale,
          },
        };
      }
      const res = await this.stock
        .findOneAndUpdate(findStock, updateStock)
        .catch((e: Error) => {
          throw new BadRequestException(e.message);
        })
        .then(async (data) => {
            console.log('== THERSHOD ===',thershold)
            if(thershold !== 'no_threshold'){
              console.log('=== BERHASIL EKSEKUSI REFUND THERSHOLD ===')

              let findStockThershold = {
                location: this.toObjectId(payload.location),
                product_id: this.toObjectId(payload.product),
                keyword_id: this.toObjectId(payload?.keyword),
                deleted_at: null
              };
              const updateStockThershold = {
                deleted_at : new Date()
              }
              await this.stockThresholdModel.findOneAndUpdate(findStockThershold,updateStockThershold)
                .catch((e: Error) => {
                  throw new BadRequestException(e.message);
                }).then(async(data) => {
                  await this.stock.findOneAndUpdate(findStock,{$inc:{balance: data?.maximum_threshold}})
                })
          }
          if (isAdd) {
            await this.loggedV3FS(
              payload,
              account,
              'mutation',
              payload.qty_flashsale,
              null,
              true,
            );
          } else {
            await this.loggedV3FS(
              payload,
              account,
              'mutation',
              payload.qty_flashsale,
              null,
              true,
            );
          }
          const res = new StockResponse();
          res.code = 'S00000';
          res.transaction_classify = 'TRANSACTION_STOCK';
          res.message = 'Initial Stock Success!';
          (res.statusCode = HttpStatus.OK), (res.payload = data);
          res.transaction_id = data._id;
          return res;
        });

      return res;
    }catch(error){
      throw new Error(`Failed to update flash sale stock: ${error.message}`);

    }
  }

  async upsert_flashsale(
    payload: StockDTO,
    newBalance: number,
    account?: Account,
  ): Promise<any> {
    const balance = newBalance;
    const updateStock = {
      $inc: { balance_flashsale: balance },
    };

    const findStock = {
      location: this.toObjectId(payload?.location),
      product: this.toObjectId(payload.product),
      keyword: this.toObjectId(payload?.keyword),
    };

    try {
      return await this.stock.findOneAndUpdate(findStock, updateStock);
    } catch (e) {
      throw new Error(`Error updating flash sale: ${e.message}`);
    }
  }

  async approve_reserve_keyword_flashsale(
    id_keyword_main: string,
    id_keyword: string,
    account: Account,
    type_threshold: any,
    threshold_balance: any,
    status: boolean,
    refund: boolean
  ) {
    const dataKeyword = await this.getStockReserveByIdKeyword(id_keyword);
    await Promise.all(
      dataKeyword.map(async (reserve) => {
        try {
          if (reserve && reserve.is_flashsale == true) {
            console.log('=== IF FS TRUE ===');
            if (reserve.status === 'Actived') {
              throw new BadRequestException(
                `Stock Reserve for id ${id_keyword} has been approved! Please Reject Keyword first`,
              );
            }

            await this.update_reserve_status(
              reserve._id.toString(),
              'Actived',
              true,
              id_keyword_main
            );

            const origin_stock = await this.getStock({
              product: reserve.product,
              location: reserve.destination_location,
              keyword: id_keyword_main ? id_keyword_main : id_keyword
            });

            const newBalance = origin_stock.balance - reserve.balance;
            if (newBalance < 0) {
              const keywords = this.toObjectId(id_keyword)
              console.log('=== DISINI ===',keywords);
              await this.stockReserve.updateMany({keyword: keywords },{$set: {status: 'Booked'}})
              throw new BadRequestException(
                `Flash sale stock ${reserve?.balance} cannot be greater than regular stock ${origin_stock?.balance}`,
              );
            }

            if (type_threshold == 'no_threshold' && (status == true || status == false)) {
              await this.updateFSStock(reserve, id_keyword_main, account);
            } else if (type_threshold !== 'no_threshold' && status == true) {
              await this.updateThresholdStock(reserve, id_keyword_main, account);
            }

          } else {
            console.log('=== ELSE FS FALSE ===');
            if (reserve.status === 'Actived') {
              throw new BadRequestException(
                `Stock Reserve for id ${id_keyword} has been approved!`,
              );
            }

            await this.update_reserve_status(
              reserve._id.toString(),
              'Actived',
              false,
              id_keyword_main
            ).then(async(data) =>{
              const origin_stock = await this.getStockForReserveWithoutKeyword({
                product: reserve.product,
                location: reserve.origin_location,
              });
    
              const newBalance = origin_stock.balance - reserve.balance;
              if (newBalance < 0) {
                const keywords = this.toObjectId(id_keyword)
              console.log('=== DISINI ===',keywords);
              await this.stockReserve.updateMany({keyword: keywords },{$set: {status: 'Booked'}})
                throw new BadRequestException(
                  `The stock can't be below 0, stock now is ${origin_stock.balance}`,
                );
              }
              return await this.stock
                .findOneAndUpdate(
                  { _id: origin_stock._id },
                  { $inc: { balance: -reserve.balance } },
                )
                .catch((e: Error) => {
                  throw new Error(e.message);
                })
                .then(async (data) => {
                  if(refund && status == false){
                    await this.stock.findOne(
                      {
                        product: reserve.product,
                        location: reserve.destination_location,
                        keyword: id_keyword_main ? id_keyword_main : id_keyword
                      }
                    ).catch((e: Error) => {
                      throw new Error(e.message);
                    }).then(async(data) =>{
                      await this.stock.findOneAndUpdate(
                        {
                          _id: data?._id
                        },
                        {
                          $inc: {balance: data?.balance_flashsale,balance_flashsale: -data?.balance_flashsale}
                        }
                      )
                    })
                  }
                  if (
                    type_threshold == 'no_threshold' &&
                    (id_keyword_main == null || id_keyword_main !== null)
                  ) {
                    await this.upsertV2(
                      {
                        location: reserve.destination_location,
                        product: reserve.product,
                        keyword: id_keyword_main ? id_keyword_main : id_keyword,
                        qty: reserve.balance,
                      },
                      reserve.balance,
                      account,
                    )
                      .then(async (data) => {
                        if (data !== undefined) {
                          await this.logged(
                            {
                              location: reserve.origin_location,
                              product: reserve.product,
                              keyword: id_keyword,
                              qty: reserve.balance,
                            },
                            account,
                            'mutation',
                            data.value.balance === reserve.balance
                              ? 0
                              : data.value.balance,
                          );
                        }
    
                        const res = new StockResponse();
                        res.code = 'S00000';
                        res.message = 'Approval Reserve Success!';
                        res.transaction_classify = 'TRANSACTION_STOCK';
                        res.statusCode = HttpStatus.OK;
                        res.payload = data !== undefined ? data.value : null;
                        return res;
                      })
                      .catch((e: Error) => {
                        throw new Error(e.message);
                      });
                  }
    
                  if (
                    type_threshold !== 'no_threshold' &&
                    (id_keyword_main == null || id_keyword_main !== null)
                  ) {
                    await this.upsertV2(
                      {
                        location: reserve.destination_location,
                        product: reserve.product,
                        keyword: id_keyword_main ? id_keyword_main : id_keyword,
                        qty: threshold_balance,
                      },
                      reserve.balance,
                      account,
                    )
                      .then(async (data) => {
                        if (data !== undefined) {
                          await this.logged(
                            {
                              location: reserve.origin_location,
                              product: reserve.product,
                              keyword: id_keyword,
                              qty: threshold_balance,
                            },
                            account,
                            'mutation_threshold',
                            data.value.balance === threshold_balance
                              ? 0
                              : data.value.balance,
                          );
                        }
    
                        const res = new StockResponse();
                        res.code = 'S00000';
                        res.message = 'Approval Reserve Success!';
                        res.transaction_classify = 'TRANSACTION_STOCK';
                        res.statusCode = HttpStatus.OK;
                        res.payload = data !== undefined ? data.value : null;
                        return res;
                      })
                      .catch((e: Error) => {
                        throw new Error(e.message);
                      });
                  }
                })
            });
          }
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          } else {
            throw new BadRequestException(`Error processing reserve: ${error.message}`);
          }
        }
      })
    );
  }

  async updateStockThersholdFlashSale(
    payload: StockThresholdDTO,
    account: Account,
  ) {
    try{
      console.log({ payload });
      let updateStock = {};
      const findStock = {
        keyword_id: this.toObjectId(payload?.keyword_id),
        location: this.toObjectId(payload.location),
        product_id: this.toObjectId(payload.product_id),
      };
      updateStock = {
        $inc: { maximum_threshold: -payload.qty_flashsale - payload.qty },
      };
      const res = await this.stockThresholdModel
        .findOneAndUpdate(findStock, updateStock)
        .catch((e: Error) => {
          throw new BadRequestException(e.message);
        })
        .then(async (data) => {
          const res = new StockResponse();
          res.code = 'S00000';
          res.transaction_classify = 'TRANSACTION_STOCK';
          res.message = 'Initial Stock Success!';
          (res.statusCode = HttpStatus.OK), (res.payload = data);
          res.transaction_id = data._id;
          return res;
        });
  
      return res;
    }catch(error){
      throw new BadRequestException(`Failed to update threshold flashsale stock: ${error.message}`);
    }
  }

  private checkActiveFlashSale(
    keyword: KeywordDocument,
    currentDateTime: any,
  ): boolean {
    const isActiveKeywordFlashSale =
      keyword.eligibility?.flashsale?.status ?? false;
    const keywordName = keyword.eligibility.name;

    if (!isActiveKeywordFlashSale) {
      console.log(`${keywordName}  is not flash sale keyword`);
      return false;
    }

    const flashSaleStartDate = moment(keyword.eligibility.flashsale.start_date);
    const flashSaleEndDate = moment(keyword.eligibility.flashsale.end_date);
    const isExpiredFlashSale = currentDateTime.isAfter(flashSaleEndDate);
    const flashSaleNotStartedYet = currentDateTime.isBefore(flashSaleStartDate);

    if (isExpiredFlashSale || flashSaleNotStartedYet) {
      const message = isExpiredFlashSale
        ? 'flash sale keyword is expired'
        : `flash sale hasn't started yet`;

      console.log(`${keywordName} ${message}`);

      return false;
    }

    console.log(`${keywordName} flash sale keyword is running`);

    return true;
  }

  async cronResetStockFlashSale(
    delayTime = 0,
  ): Promise<ReportingServiceResult> {
    try {
      const currentDateTime = moment().utc();
      console.log('delayTime', delayTime);
      console.log('currentDateTime', currentDateTime);

      const projection = {
        _id: 1,
        'eligibility.name': 1,
        'eligibility.flashsale': 1,
        bonus: 1,
        process_time: {
          $add: ['$eligibility.flashsale.end_date', delayTime * 60 * 1000], // Add delayTime (satuan menit)
        },
      };

      const queryFilter = {
        'eligibility.name': { $not: { $regex: '-EDIT' } },
        'eligibility.flashsale.status': true,
        'eligibility.flashsale.end_date': { $lte: currentDateTime.toDate() },
      };

      const pipeline: any = [
        { $match: queryFilter },
        { $project: projection },
        { $unwind: '$bonus' },
        { $unwind: '$bonus.stock_location' },
        {
          $lookup: {
            from: 'stocks',
            let: {
              keywordId: '$_id',
              locationId: { $toObjectId: '$bonus.stock_location.location_id' },
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$keyword', '$$keywordId'] },
                      { $eq: ['$location', '$$locationId'] },
                      { $gt: ['$balance_flashsale', 0] },
                    ],
                  },
                },
              },
            ],
            as: 'stocks',
          },
        },
        {
          $match: {
            stocks: { $exists: true, $ne: [] },
          },
        },
        {
          $project: {
            _id: 1,
            'eligibility.name': 1,
            'eligibility.flashsale': 1,
            bonus: 1,
            process_time: 1,
            stock: { $arrayElemAt: ['$stocks', 0] },
          },
        },
      ];

      if (delayTime > 0) {
        // filter expired flash sale keywords that will be processed after a specified delay time
        const keywordToBeProcess = {
          process_time: { $lte: currentDateTime.toDate() },
        };

        pipeline.splice(2, 0, { $match: keywordToBeProcess });
      }

      const expiredFlashSales = await this.keywordModel.aggregate(pipeline);
      console.log('pipeline', JSON.stringify(pipeline));
      console.log('expiredFlashSale', expiredFlashSales);

      const result = {
        expired_flash_sale: JSON.stringify(expiredFlashSales),
        updated_stocks: [],
        pipeline: JSON.stringify(pipeline),
      };

      for (const expiredFlashSale of expiredFlashSales) {
        const keywordId = expiredFlashSale._id;
        const stock = expiredFlashSale.stock;
        const flashSaleBalance = stock.balance_flashsale;

        // reset initial stock fs to 0 in collection keywords
        await this.keywordModel.findByIdAndUpdate(keywordId, {
          $set: {
            'bonus.0.stock_location.0.stock_flashsale': 0,
          },
        });

        // revert balance_flash sale to balance
        const updatedStock = await this.stock.findByIdAndUpdate(
          expiredFlashSale.stock._id,
          {
            $inc: {
              balance: flashSaleBalance,
              balance_flashsale: -flashSaleBalance,
            },
          },
          { new: true },
        );

        await this.stockLogs.create({
          keyword: this.toObjectId(keywordId),
          location: this.toObjectId(stock.location),
          product: this.toObjectId(stock.product),
          balance: updatedStock.balance,
          in: flashSaleBalance,
          remaining: stock.balance,
          out: 0,
          account: 'account',
          remark: 'reset stock flash sale by system',
          logged_at: new Date(),
        });

        // reset redis stock
        await this.keywordService.deleteRedisStock(
          keywordId.toString(),
          stock.location.toString(),
        );

        result.updated_stocks.push(JSON.stringify(updatedStock));
      }

      return {
        is_error: false,
        message:
          result.expired_flash_sale.length === 0
            ? 'there is no expired flash sale keyword'
            : 'success',
        stack: null,
        custom_code: HttpStatus.OK,
        result: result,
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

  //Function Di gunakan di keyword.service kebutuhan, flashsale
  async updateV2(payload: StockDTO, account: Account, isAdd: boolean,refund_flashsale: boolean) {
    try{
      console.log({ payload });
      let updateStock = {};
      const findStock = {
        location: this.toObjectId(payload.location),
        product: this.toObjectId(payload.product),
        keyword: this.toObjectId(payload?.keyword),
      };

      if (isAdd) {
        updateStock = {
          $inc: {
            balance: payload.qty,
            balance_flashsale: payload.qty_flashsale,
          },
        };
      } else {
        updateStock = {
          $inc: {
            balance: payload.qty,
            balance_flashsale: payload.qty_flashsale,
          },
        };
      }
      const res = await this.stock
        .findOneAndUpdate(findStock, updateStock)
        .catch((e: Error) => {
          throw new BadRequestException(e.message);
        })
        .then(async (data) => {
          if(!refund_flashsale){
            console.log('=== RUNNING REFUND FS ===')
            await this.stock.findOneAndUpdate({_id: data?._id},{$inc: {balance: data?.balance_flashsale, balance_flashsale: -data?.balance_flashsale}})
          }
          if (isAdd) {
            await this.loggedV3FS(
              payload,
              account,
              'mutation',
              payload.qty_flashsale,
              null,
              payload?.is_flashsale,
            );
          } else {
            await this.loggedV3FS(
              payload,
              account,
              'mutation',
              payload.qty_flashsale,
              null,
              payload?.is_flashsale,
            );
          }
          const res = new StockResponse();
          res.code = 'S00000';
          res.transaction_classify = 'TRANSACTION_STOCK';
          res.message = 'Initial Stock Success!';
          (res.statusCode = HttpStatus.OK), (res.payload = data);
          res.transaction_id = data._id;
          return res;
        });

      return res;
    }catch(error){
      throw new Error(`Failed to update stock: ${error.message}`);

    }
  }

  async getStockSummaryFromRedis(_id: string): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.STOCK_SUMMARY_KEY}-${_id}`;
    const redisProgram: any = await this.cacheManager.get(key);
    let result = null;

    if (redisProgram) {
      result = redisProgram;

      console.log(
        `REDIS|Load stock summary ${_id} from Redis|${Date.now() - now}`,
      );
    } else {
      const data = await this.stockSummaryModel.findOne({
        keyword: new mongoose.Types.ObjectId(_id),
      });

      console.log(
        `REDIS|Load stock summary ${_id} from DB|${Date.now() - now}`,
      );

      if (data) {
        await this.cacheManager.set(key, data, { ttl: 60 * 15 });
        result = data;
      }
    }
    return result?.balance;
  }

  async getTotalStockFlashSaleByKeyword(param: {
    keyword: string;
  }): Promise<any> {
    const data = await this.stock.aggregate(
      [
        {
          $match: {
            $and: [{ keyword: this.toObjectId(param.keyword) }],
          },
        },
        { $group: { _id: '$keyword', sum: { $sum: '$balance_flashsale' } } },
      ],
      (err, result) => {
        return result;
      },
    );
    console.log('== Get FlashSale Stock ==');
    return data?.[0]?.sum ?? 0;
  }

  async deleteRedisStockSummary(param: string): Promise<any> {
    const key = `stock-summary-${param}`;
    console.log(`== DELETE REDIS STOCK SUMMARY ${key} ==`);

    await this.applicationService.redis_delete(null, {
      key: `${key}`,
    });
  }

  async reserve_process_with_keyword_flashsale(
    payload: StockReserveDTO,
    account: Account,
  ) {
    if (payload.destination_location === null) {
      const location = await this.getLocationHQ();
      payload.destination_location = location._id.toString();
    }

    // const origin_stock = await this.getStockForReserveWithoutKeyword({
    //   product: payload.product,
    //   location: payload.origin_location,
    // });
    // console.log('=== ORIGIN STOCK ===', origin_stock);
    // const newBalance = origin_stock.balance - payload.qty;
    // if (newBalance < 0) {
    //   throw new Error(
    //     `The stock can't be below 0, stock now is ${origin_stock.balance}`,
    //   );
    // }

    // Create Reserve
    return await this.add_reserve(payload, account).then(async (data) => {
      const res = new StockResponse();
      res.code = 'S00000';
      res.transaction_classify = 'TRANSACTION_STOCK';
      res.message = 'Allocated Stock By Keyword Success!';
      (res.statusCode = HttpStatus.CREATED), (res.payload = data);
      res.transaction_id;
      return res;
    });
  }

  async upsertV2(payload: StockDTO, newBalance: number, account?: Account) {
    let balance = newBalance;
    const stock = await this.getStock(payload);
    if (stock) {
      return await this.stock
        .findOneAndUpdate(
          {
            _id: stock._id,
          },
          {
            location: this.toObjectId(payload.location),
            product: this.toObjectId(payload.product),
            $inc: { balance: balance },
          },
          {
            upsert: true,
            rawResult: true,
            new: true,
          },
        )
        .catch((e: Error) => {
          throw new Error(e.message);
        });
    } else {
      await this.add(payload, account, true);
    }
  }


   // Method untuk memperbarui general stock
  async updateFSStock(reserve, id_keyword_main, account, refund = false, threshold_balance = null, type_threshold = 'no_threshold') {
    try {
      const updateResult = await this.stock
        .findOneAndUpdate(
          {
            location: reserve.destination_location,
            product: reserve.product,
            keyword: id_keyword_main ? id_keyword_main : reserve.keyword,
          },
          { $inc: { balance: -reserve.balance } },
        );

      if (type_threshold == 'no_threshold') {
        await this.upsert_flashsale(
          {
            location: reserve.destination_location,
            product: reserve.product,
            keyword: id_keyword_main ? id_keyword_main : reserve.keyword,
            qty: reserve.balance,
          },
          reserve.balance,
          account,
        );

        if (refund) {
          console.log('=== BERHASIL REFUND MERCHANDISE ===');
          await this.stock.findOneAndUpdate(
            { _id: updateResult?._id },
            { $inc: { balance: updateResult?.balance_flashsale, balance_flashsale: -updateResult?.balance_flashsale } }
          );
        }
      } else {
        await this.upsert_flashsale(
          {
            location: reserve.destination_location,
            product: reserve.product,
            keyword: id_keyword_main ? id_keyword_main : reserve.keyword,
            qty: threshold_balance,
          },
          reserve.balance,
          account,
        );
      }

      const res = new StockResponse();
      res.code = 'S00000';
      res.message = 'Approval Reserve Success!';
      res.transaction_classify = 'TRANSACTION_STOCK';
      res.statusCode = HttpStatus.OK;
      res.payload = updateResult !== undefined ? updateResult : null;
      return res;

    } catch (error) {
      throw new Error(`Failed to update general stock: ${error.message}`);
    }
  }

  async updateGeneralStock(stock,reserve, id_keyword_main, account, refund, threshold_balance = null, type_threshold = 'no_threshold') {
    try {
      const updateResult = await this.stock
        .findOneAndUpdate(
          {
            _id: stock._id,
          },
          { $inc: { balance: -reserve.balance } },
        );

      if (type_threshold == 'no_threshold') {
        await this.upsertV2(
          {
            location: reserve.destination_location,
            product: reserve.product,
            keyword: id_keyword_main ? id_keyword_main : reserve.keyword,
            qty: reserve.balance,
          },
          reserve.balance,
          account,
        );

        if (refund) {
          console.log('=== BERHASIL REFUND MERCHANDISE ===');
          await this.stock.findOneAndUpdate(
            { _id: updateResult?._id },
            { $inc: { balance: updateResult?.balance_flashsale, balance_flashsale: -updateResult?.balance_flashsale } }
          );
        }
      } else {
        await this.upsertV2(
          {
            location: reserve.destination_location,
            product: reserve.product,
            keyword: id_keyword_main ? id_keyword_main : reserve.keyword,
            qty: threshold_balance,
          },
          reserve.balance,
          account,
        );
      }

      const res = new StockResponse();
      res.code = 'S00000';
      res.message = 'Approval Reserve Success!';
      res.transaction_classify = 'TRANSACTION_STOCK';
      res.statusCode = HttpStatus.OK;
      res.payload = updateResult !== undefined ? updateResult : null;
      return res;

    } catch (error) {
      throw new Error(`Failed to update general stock: ${error.message}`);
    }
  }

  // Method untuk memperbarui threshold stock
  async updateThresholdStock(reserve, id_keyword_main, account) {
    try {
      const findStock = {
        keyword_id: this.toObjectId(
          id_keyword_main ? id_keyword_main : reserve.keyword,
        ),
        location: this.toObjectId(reserve.destination_location),
        product_id: reserve.product.toString(),
      };

      const updateStock = {
        $inc: { maximum_threshold: -reserve?.balance },
      };

      const updatedStock = await this.stockThresholdModel.findOneAndUpdate(
        findStock,
        updateStock,
      );

      await this.upsert_flashsale(
        {
          location: reserve.destination_location,
          product: reserve.product,
          keyword: id_keyword_main ? id_keyword_main : reserve.keyword,
          qty: reserve.balance,
        },
        reserve.balance,
        account,
      );

      const response = new StockResponse();
      response.code = 'S00000';
      response.transaction_classify = 'TRANSACTION_STOCK';
      response.message = 'Initial Stock Success!';
      response.statusCode = HttpStatus.OK;
      response.payload = updatedStock;
      response.transaction_id = updatedStock._id;

      return response;

    } catch (error) {
      throw new BadRequestException(`Failed to update threshold stock: ${error.message}`);
    }
  }

  async getStockRCFlashsale(param: { product: string; keyword: string }): Promise<any> {
    const data = await this.stock.aggregate(
      [
        {
          $match: {
            $and: param.product
              ? [
                  {
                    product: param.product,
                  },
                  { keyword: this.toObjectId(param.keyword) },
                ]
              : [{ keyword: this.toObjectId(param.keyword) }],
          },
        },
        {
          $group: {
            _id: null, // Mengelompokkan semua dokumen
            totalBalance: { $sum: '$balance_flashsale' }, // Menjumlahkan field balance
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return data[0];
  }

  async set_thershold(
    payload: StockDTO,
    newBalance: number,
    account?: Account,
  ): Promise<any> {
    const balance = newBalance;
    const updateStock = {
      $set: { balance: balance },
    };

    const findStock = {
      location: this.toObjectId(payload?.location),
      product: this.toObjectId(payload.product),
      keyword: this.toObjectId(payload?.keyword),
    };

    try {
      return await this.stock.findOneAndUpdate(findStock, updateStock);
    } catch (e) {
      throw new Error(`Error updating thershold: ${e.message}`);
    }
  }

  async decrementStock(
    payload: StockDTO,
    decrementAmount: number,
    account?: any,
  ): Promise<any> {
    // Destructure payload for cleaner code
    const { location, product, keyword } = payload;
  
    // Build query and update objects
    const findStock = {
      location: this.toObjectId(location),
      product: this.toObjectId(product),
      keyword: this.toObjectId(keyword),
    };
  
    const updateStock = {
      $inc: { balance: -decrementAmount },
    };
  
    try {
      // Perform stock update
      const updatedStock = await this.stock.findOneAndUpdate(findStock, updateStock, { new: true });
      if (!updatedStock) {
        throw new Error("Stock not found or update failed");
      }
      // console.log('=== CREATED BY ===',account)
      // Create log entry
      await this.stockLogs.create({
        keyword: this.toObjectId(updatedStock.keyword),
        location: this.toObjectId(updatedStock.location),
        product: this.toObjectId(updatedStock.product),
        balance: updatedStock.balance,
        in: 0,
        remaining: updatedStock.balance,
        out: decrementAmount,
        account: this.toObjectId(account?._id), // Use provided account or fallback
        remark: "Decrement stock keywords thershold",
        logged_at: new Date(),
      });
  
      return updatedStock;
    } catch (error) {
      // Handle and rethrow the error with additional context
      throw new Error(`Error updating stock: ${error.message}`);
    }
  }  

}
