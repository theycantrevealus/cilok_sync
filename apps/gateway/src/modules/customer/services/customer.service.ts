import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { CacheStore } from '@nestjs/cache-manager';
import { CACHE_MANAGER, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { Queue } from 'bull';
import mongoose, { Model, Types } from 'mongoose';
import * as querystring from 'querystring';
import { catchError, lastValueFrom, map } from 'rxjs';
import { Logger } from 'winston';

import { LocalFileDto } from '@/application/utils/FilterDT/file.dto';
import {
  FMC_allowedMSISDN,
  FMC_reformatMsisdnCore,
} from '@/application/utils/Msisdn/formatter';
import {
  CustomerAddDTO,
  CustomerAddDTOResponse,
} from '@/customer/dto/customer.add.dto';
import {
  CustomerBadgeAssignDTO,
  CustomerBadgeAssignDTOResponse,
} from '@/customer/dto/customer.assign.badge.dto';
import {
  CustomerBadgeAddDTO,
  CustomerBadgeAddDTOResponse,
} from '@/customer/dto/customer.badge.add.dto';
import { CustomerBadgeDeleteDTOResponse } from '@/customer/dto/customer.badge.delete.dto';
import {
  CustomerBadgeEditDTO,
  CustomerBadgeEditDTOResponse,
} from '@/customer/dto/customer.badge.edit.dto';
import {
  CustomerBrandAddDTO,
  CustomerBrandAddDTOResponse,
} from '@/customer/dto/customer.brand.add.dto';
import { CustomerBrandDeleteDTOResponse } from '@/customer/dto/customer.brand.delete.dto';
import {
  CustomerBrandEditDTO,
  CustomerBrandEditDTOResponse,
} from '@/customer/dto/customer.brand.edit.dto';
import { CustomerDeleteDTOResponse } from '@/customer/dto/customer.delete.dto';
import {
  CustomerEditDTO,
  CustomerEditDTOResponse,
} from '@/customer/dto/customer.edit.dto';
import {
  CustomerMemberAddDTOResponse,
  CustomerMemberDto,
} from '@/customer/dto/customer.member.dto';
import {
  CustomerTierAddDTO,
  CustomerTierAddDTOResponse,
} from '@/customer/dto/customer.tier.add.dto';
import { CustomerTierDeleteDTOResponse } from '@/customer/dto/customer.tier.delete.dto';
import {
  CustomerTierEditDTO,
  CustomerTierEditDTOResponse,
} from '@/customer/dto/customer.tier.edit.dto';
import { CustomerBadgeUnAssignDTOResponse } from '@/customer/dto/customer.unassign.badge.dto';
import {
  CustomerBadge,
  CustomerBadgeDocument,
} from '@/customer/models/customer.badge.model';
import {
  CustomerBrand,
  CustomerBrandDocument,
} from '@/customer/models/customer.brand.model';
import { Customer, CustomerDocument } from '@/customer/models/customer.model';
import {
  CustomerTier,
  CustomerTierDocument,
} from '@/customer/models/customer.tier.model';
import {
  CustomerXBadge,
  CustomerXBadgeDocument,
} from '@/customer/models/customer.x.badge.model';
// import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
// import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
// const http =
// process.env.CORE_BACK_END_HTTP_MODE === 'https'
//   ? require('https')
//   : require('http');

const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');

@Injectable()
export class CustomerService {
  // private httpService: HttpService;
  private core_url: string;
  protected importCustomerQueue: Queue;
  private raw_port: number;
  private branch: string;
  private realm: string;
  private merchant: string;
  private raw_core: string;
  private url: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(HttpService) private readonly httpService: HttpService,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(CustomerTier.name)
    private customerTierModel: Model<CustomerTierDocument>,
    @InjectModel(CustomerBadge.name)
    private customerBadgeModel: Model<CustomerBadgeDocument>,
    @InjectModel(CustomerBrand.name)
    private customerBrandModel: Model<CustomerBrandDocument>,
    @InjectModel(CustomerXBadge.name)
    private customerXBadgeModel: Model<CustomerXBadgeDocument>,
    @InjectQueue('customer') customerQueue: Queue,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
  ) {
    this.core_url = `${configService.get<string>(
      'core-backend.raw_core_port',
    )}`;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.httpService = httpService;
    this.importCustomerQueue = customerQueue;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
  }

  async add_customer(param: CustomerAddDTO): Promise<CustomerAddDTOResponse> {
    const response = new CustomerAddDTOResponse();
    const newCustomer = new this.customerModel(param);
    const process = await this.customerModel
      .findOne({
        msisdn: param.msisdn,
      })
      .then(async (customerExist) => {
        if (customerExist) {
          return customerExist;
        } else {
          return await newCustomer.save().then(async (returning) => {
            return await returning;
          });
        }
      })
      .catch((e) => {
        response.message = e.message;
        response.status = HttpStatus.INTERNAL_SERVER_ERROR;
        response.payload = e;
      });

    if (process) {
      response.message = 'Customer Created Successfully';
      response.status = HttpStatus.OK;
      response.payload = newCustomer;
    } else {
      response.message = 'Customer Failed to Created';
      response.status = 400;
    }
    return response;
  }

  async edit_customer(
    data: CustomerEditDTO,
    param: string,
  ): Promise<CustomerEditDTOResponse> {
    const process = this.customerModel
      .findOneAndUpdate(
        { _id: param },
        {
          msisdn: data.msisdn,
          activation_date: data.activation_date,
          expire_date: data.expire_date,
          los: data.los,
          rev_m1: data.rev_m1,
          loyalty_tier: data.loyalty_tier,
          brand: data.brand,
          arpu: data.arpu,
          nik_dob: data.nik_dob,
          nik_rgn_name: data.nik_rgn_name,
          region_lacci: data.region_lacci,
          cty_nme: data.cty_nme,
          kabupaten: data.kabupaten,
          kecamatan: data.kecamatan,
          cluster_sales: data.cluster_sales,
          pre_pst_flag: data.pre_pst_flag,
          last_redeemed_date: data.last_redeemed_date,
          updated_at: Date.now(),
        },
      )
      .then((results) => {
        return results;
      });

    const response = new CustomerAddDTOResponse();
    if (process) {
      response.message = 'Customer Created Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'Customer Failed to Created';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async delete_customer(param: string): Promise<CustomerDeleteDTOResponse> {
    const process = this.customerModel
      .findOneAndUpdate({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new CustomerDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Customer Deleted Successfully';
    } else {
      response.status = 400;
      response.message = 'Customer Failed to Deleted';
    }
    return response;
  }

  async import_customer(fileData: LocalFileDto) {
    return this.importCustomerQueue
      .add(
        'customer-import',
        {
          list: fileData,
        },
        { removeOnComplete: true },
      )
      .then((job) => {
        return { job: job.id };
      });
  }

  async get_customer(param: any): Promise<any> {
    const filter_set =
      param.filter !== '' && param.filter ? JSON.parse(param.filter) : {};
    const sort_set =
      param.sort && param.sort !== '{}' && param.sort !== ''
        ? JSON.parse(param.sort)
        : { _id: 1 };
    const skip: number =
      param.skip && param.skip !== '' ? parseInt(param.skip) : 0;
    const limit: number =
      param.limit && param.limit !== '' ? parseInt(param.limit) : 10;
    const filter_builder: any = {
      deleted_at: null,
      $expr: {
        //$and: [],
        $or: [],
      },
    };

    const special_join = ['loyalty_tier', 'brand'];
    for (const av in special_join) {
      if (filter_set[special_join[av]]) {
        for (const abz in filter_set[special_join[av]]) {
          filter_builder['$expr']['$or'].push({
            $eq: [
              filter_set[special_join[av]][abz],
              {
                $reduce: {
                  input: `$${special_join[av]}`,
                  initialValue: '',
                  in: {
                    $concat: ['$$value', '$$this.name'],
                  },
                },
              },
            ],
          });
        }

        delete filter_set[special_join[av]];
      }
    }

    if (filter_builder['$expr']['$or'].length === 0) {
      delete filter_builder['$expr']['$or'];
    }

    for (const a in filter_set) {
      if (a !== '$expr') {
        if (filter_builder[a] === undefined) {
          filter_builder[a] = { $regex: `${filter_set[a]}` };
        }
        filter_builder[a] = { $regex: `${filter_set[a]}` };
      }
    }

    const data = await this.customerModel.aggregate(
      [
        {
          $lookup: {
            from: 'customerbrands',
            localField: 'brand',
            foreignField: '_id',
            as: 'brand',
          },
        },
        {
          $lookup: {
            from: 'customertiers',
            localField: 'loyalty_tier',
            foreignField: '_id',
            as: 'loyalty_tier',
          },
        },
        {
          $lookup: {
            from: 'customerxbadges',
            let: {
              customer_id: '$_id',
              badge_name: '$name',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$customer', '$$customer_id'] }],
                  },
                },
              },
              {
                $lookup: {
                  from: 'customerbadges',
                  localField: 'badge',
                  foreignField: '_id',
                  as: 'badges_detail',
                },
              },
              {
                $project: {
                  customer: false,
                  badge: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'customer_badges',
          },
        },
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

  async get_customer_2(param: any): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    query.push({
      $lookup: {
        from: 'customerbrands',
        localField: 'brand',
        foreignField: '_id',
        as: 'brand',
      },
    });

    query.push({
      $lookup: {
        from: 'customertiers',
        localField: 'loyalty_tier',
        foreignField: '_id',
        as: 'loyalty_tier',
      },
    });

    query.push({
      $lookup: {
        from: 'customerxbadges',
        let: {
          customer_id: '$_id',
          badge_name: '$name',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$customer', '$$customer_id'] }],
              },
            },
          },
          {
            $lookup: {
              from: 'customerbadges',
              localField: 'badge',
              foreignField: '_id',
              as: 'badges_detail',
            },
          },
          {
            $project: {
              customer: false,
              badge: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'customer_badges',
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
    }

    const allNoFilter = await this.customerModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

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

    const data = await this.customerModel.aggregate(query, (err, result) => {
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

  async getCustomerByMSISDN(msisdn: string, token = '') {
    const data = await this.customerModel.aggregate(
      [
        {
          $lookup: {
            from: 'customerbrands',
            localField: 'brand',
            foreignField: '_id',
            as: 'brand',
          },
        },
        {
          $lookup: {
            from: 'customertiers',
            localField: 'loyalty_tier',
            foreignField: '_id',
            as: 'loyalty_tier',
          },
        },
        {
          $lookup: {
            from: 'customerxbadges',
            let: {
              customer_id: '$_id',
              badge_name: '$name',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$customer', '$$customer_id'] }],
                  },
                },
              },
              {
                $lookup: {
                  from: 'customerbadges',
                  localField: 'badge',
                  foreignField: '_id',
                  as: 'badges_detail',
                },
              },
              {
                $project: {
                  customer: false,
                  badge: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'customer_badges',
          },
        },
        {
          $match: {
            $and: [{ msisdn: msisdn }, { deleted_at: null }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
    const now = Date.now();
    return await this.getCoreMemberByMsisdn(msisdn, token).then(
      async (coreDetail) => {
        if (coreDetail) {
          const core_tier = coreDetail[0].tier.current;
          let localTier = await this.get_tier_detail({
            core_id: core_tier.id,
          });

          if (!localTier) {
            const newTier = new CustomerTierAddDTO({
              name: core_tier.name,
              description: 'Sync with core',
              core_id: core_tier.id,
            });

            localTier = await this.add_tier(newTier).then((tierResponse) => {
              return tierResponse.payload;
            });
          }

          if (data.length) {
            return data[0] ?? null;
          } else {
            const customerDTO = new CustomerAddDTO({
              msisdn: msisdn,
              core_id: coreDetail[0].id,
              last_redeemed_date: '',
              loyalty_tier: localTier._id,
              // los: 0,
              // rev_m1: 'TBC',
              // brand: '',
              // arpu: 0,
              // nik_dob: '',
              // nik_rgn_name: '',
              // region_lacci: '',
              // cty_nme: '',
              // kabupaten: '',
              // kecamatan: '',
              // cluster_sales: '',
              // pre_pst_flag: '1',
            });

            return await this.add_customer(customerDTO)
              .then(async (responseNewCustomer) => {
                return responseNewCustomer.payload;
              })
              .catch((e: Error) => {
                return undefined;
              });
          }
        } else {
          this.logger.error({
            method: 'GET',
            statusCode: HttpStatus.OK,
            transaction_id: '',
            notif_customer: false,
            notif_operation: true,
            taken_time: Date.now() - now,
            param: msisdn,
            step: `Failed to get customer data, but success from core`,
            service: 'Customer Service',
            result: {
              msisdn: msisdn,
              url: 'customer__function',
              user_id: null,
              result: coreDetail,
            },
          });
          return undefined;
        }
      },
    );
    // if (!data[0]) {
    //   return await this.getCoreMemberByMsisdn(msisdn, token).then(
    //     async (coreDetail) => {
    //       if (coreDetail) {
    //         console.log('=== FROM CORE GET MEMBER ===');
    //         console.log(coreDetail);
    //         const core_tier = coreDetail[0].tier.current;
    //         let localTier = await this.get_tier_detail({
    //           core_id: core_tier.id,
    //         });
    //
    //         if (!localTier) {
    //           const newTier = new CustomerTierAddDTO({
    //             name: core_tier.name,
    //             description: 'Sync with core',
    //             core_id: core_tier.id,
    //           });
    //
    //           localTier = await this.add_tier(newTier).then((tierResponse) => {
    //             return tierResponse.payload;
    //           });
    //         }
    //
    //         const customerDTO = new CustomerAddDTO({
    //           core_id: coreDetail[0].id,
    //           msisdn: msisdn,
    //           los: 0,
    //           rev_m1: 'TBC',
    //           loyalty_tier: localTier._id,
    //           brand: '',
    //           arpu: 0,
    //           nik_dob: '',
    //           nik_rgn_name: '',
    //           region_lacci: '',
    //           cty_nme: '',
    //           kabupaten: '',
    //           kecamatan: '',
    //           cluster_sales: '',
    //           pre_pst_flag: '1',
    //         });
    //
    //         return await this.add_customer(customerDTO)
    //           .then(async (responseNewCustomer) => {
    //             return responseNewCustomer.payload;
    //           })
    //           .catch((e: Error) => {
    //             return undefined;
    //           });
    //       } else {
    //         return undefined;
    //       }
    //     },
    //   );
    // } else {
    //   return data[0];
    // }
  }

  async getCustomerBrandByNameOrID(
    value: any,
    isName: any = false,
  ): Promise<any> {
    try {
      const customerBrand = await this.customerBrandModel.findOne(
        isName ? { name: value } : { _id: value },
      );
      return customerBrand;
    } catch (error) {
      console.log(error);
      // throw new Error(`Error fetching customer brand: ${error.message}`);
    }
  }

  async get_customer_detail(param: any): Promise<any> {
    const data = await this.customerModel.aggregate(
      [
        {
          $lookup: {
            from: 'customerbrands',
            localField: 'brand',
            foreignField: '_id',
            as: 'brand',
          },
        },
        {
          $lookup: {
            from: 'customertiers',
            localField: 'loyalty_tier',
            foreignField: '_id',
            as: 'loyalty_tier',
          },
        },
        {
          $lookup: {
            from: 'customerxbadges',
            let: {
              customer_id: '$_id',
              badge_name: '$name',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$customer', '$$customer_id'] }],
                  },
                },
              },
              {
                $lookup: {
                  from: 'customerbadges',
                  localField: 'badge',
                  foreignField: '_id',
                  as: 'badges_detail',
                },
              },
              {
                $project: {
                  customer: false,
                  badge: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'customer_badges',
          },
        },
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

  //========================================================================TIER
  async get_tier_detail(param: any): Promise<any> {
    const now = Date.now();

    const params = JSON.stringify(param);

    const key = `${RedisDataKey.CUSTOMER_KEY}-tier-${params}`;

    const tierRedis = await this.cacheManager.get(key);
    let result = null;

    if (tierRedis) {
      console.log(
        `REDIS|Load customer_tier ${params} from Redis|${Date.now() - now}`,
      );

      result = tierRedis;
    } else {
      const tier = await this.customerTierModel.findOne(param).exec();

      console.log(
        `REDIS|Load customer_tier ${params} from Database|${Date.now() - now}`,
      );

      if (tier) {
        await this.cacheManager.set(key, tier);
        result = tier;
      }
    }

    return result;
  }

  async getCustomerTiersByNameOrID(
    value: any,
    isCoreID: any = false,
  ): Promise<any> {
    try {
      let customerTiers = null;
      if (isCoreID) {
        customerTiers = await this.get_tier_detail({ core_id: value });
      } else {
        customerTiers = await this.get_tier_detail({ _id: value });
      }

      return customerTiers;
    } catch (error) {
      console.log(error);
      // throw new Error(`Error fetching customer tiers : ${error.message}`);
    }
  }

  async get_tier(param: any): Promise<any> {
    const filter_set = param.filter;
    const sort_set = param.sort;
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = { deleted_at: null };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
    }
    //populate('table_name', ['column1', 'column2'])
    const data = this.customerTierModel
      .find(filter_builder)
      .skip(skip)
      .limit(limit)
      .lean()
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

  async get_tier_prime(param: any): Promise<any> {
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

    const allNoFilter = await this.customerTierModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

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

    const data = await this.customerTierModel.aggregate(
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

  async add_tier(param: CustomerTierAddDTO): Promise<CustomerAddDTOResponse> {
    const newTier = new this.customerTierModel(param);
    const process = newTier.save().then(async (returning) => {
      return await returning;
    });

    const response = new CustomerTierAddDTOResponse();
    if (process) {
      response.message = 'Customer Tier Created Successfully';
      response.status = HttpStatus.OK;
      response.payload = newTier;
    } else {
      response.message = 'Customer Tier Failed to Created';
      response.status = 400;
    }
    return response;
  }

  async edit_tier(
    data: CustomerTierEditDTO,
    param: string,
  ): Promise<CustomerTierEditDTOResponse> {
    const process = this.customerTierModel
      .findOneAndUpdate(
        { _id: param },
        {
          name: data.name,
          description: data.description,
          updated_at: Date.now(),
        },
      )
      .then((results) => {
        return results;
      });

    const response = new CustomerTierEditDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Customer Tier Updated Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Customer Tier Failed to Updated';
      response.payload = process;
    }
    return response;
  }

  async delete_tier(param: string): Promise<CustomerTierDeleteDTOResponse> {
    const process = this.customerTierModel
      .findOneAndUpdate({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new CustomerTierDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Customer Tier Deleted Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Customer Tier Failed to Deleted';
      response.payload = process;
    }
    return response;
  }

  //========================================================================BADGE
  async get_badge_detail(param: any): Promise<any> {
    return this.customerBadgeModel.findOne(param).exec();
  }

  async get_badge(param: any): Promise<any> {
    const filter_set = param.filter;
    const sort_set = param.sort;
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = { deleted_at: null };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
    }
    //populate('table_name', ['column1', 'column2'])
    const data = this.customerBadgeModel
      .find(filter_builder)
      .skip(skip)
      .limit(limit)
      .lean()
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

  async get_badge_prime(param: any): Promise<any> {
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

    const allNoFilter = await this.customerBadgeModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

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

    const data = await this.customerBadgeModel.aggregate(
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

  async add_badge(
    param: CustomerBadgeAddDTO,
  ): Promise<CustomerBadgeAddDTOResponse> {
    const newBadge = new this.customerBadgeModel(param);
    const process = newBadge.save().then(async (returning) => {
      return await returning;
    });

    const response = new CustomerBadgeAddDTOResponse();
    if (process) {
      response.message = 'Customer Badge Created Successfully';
      response.status = HttpStatus.OK;
      response.payload = newBadge;
    } else {
      response.message = 'Customer Badge Failed to Created';
      response.status = 400;
    }
    return response;
  }

  async edit_badge(
    data: CustomerBadgeEditDTO,
    param: string,
  ): Promise<CustomerBadgeEditDTOResponse> {
    const process = this.customerBadgeModel
      .findOneAndUpdate(
        { _id: param },
        {
          name: data.name,
          description: data.description,
          updated_at: Date.now(),
        },
      )
      .then((results) => {
        return results;
      });

    const response = new CustomerBadgeEditDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Customer Badge Updated Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Customer Badge Failed to Updated';
      response.payload = process;
    }
    return response;
  }

  async unassign_badge(
    param: string,
  ): Promise<CustomerBadgeUnAssignDTOResponse> {
    const process = this.customerXBadgeModel
      .findOneAndUpdate({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new CustomerBadgeUnAssignDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Customer Unassigned Badge Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Customer Failed to Unassign Badge';
      response.payload = process;
    }
    return response;
  }

  async assign_badge(
    param: CustomerBadgeAssignDTO,
  ): Promise<CustomerBadgeAssignDTOResponse> {
    let process, newBadgeAssign;
    newBadgeAssign = this.customerXBadgeModel
      .find({
        $and: [{ customer: param.customer }, { badge: param.badge }],
      })
      .exec();
    if ((await newBadgeAssign).length > 0) {
      process = this.customerXBadgeModel
        .findOneAndUpdate(
          { customer: param.customer, badge: param.badge },
          {
            updated_at: Date.now(),
            deleted_at: null,
          },
        )
        .then((results) => {
          return results;
        });
    } else {
      newBadgeAssign = new this.customerXBadgeModel(param);
      process = newBadgeAssign.save().then(async (returning) => {
        return await returning;
      });
    }

    const response = new CustomerBadgeAssignDTOResponse();
    if (process) {
      response.message = 'Customer Badge Assigned Successfully';
      response.status = HttpStatus.OK;
      response.payload = newBadgeAssign;
    } else {
      response.message = 'Customer Badge Failed to Assigned';
      response.status = 400;
    }
    return response;
  }

  async delete_badge(param: string): Promise<CustomerBadgeDeleteDTOResponse> {
    const process = this.customerBadgeModel
      .findOneAndUpdate({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new CustomerBadgeDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Customer Tier Deleted Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Customer Tier Failed to Deleted';
      response.payload = process;
    }
    return response;
  }

  //========================================================================BRAND

  async checkAvailCustomerBrand(parameter: any): Promise<boolean> {
    return (
      (await this.customerBrandModel
        .findOne({
          $and: [parameter, { deleted_at: null }],
        })
        .exec()) === null
    );
  }

  async get_brand_detail(parameter: any) {
    return this.customerBrandModel.findOne(parameter).exec();
  }

  async get_brand(param: any): Promise<any> {
    const filter_set = param.filter;
    const sort_set = param.sort;
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = { deleted_at: null };
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
    }
    //populate('table_name', ['column1', 'column2'])
    const data = this.customerBrandModel
      .find(filter_builder)
      .skip(skip)
      .limit(limit)
      .lean()
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

  async get_brand_prime(param: any): Promise<any> {
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

    const allNoFilter = await this.customerBrandModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

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

    const data = await this.customerBrandModel.aggregate(
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

  async edit_brand(
    data: CustomerBrandEditDTO,
    param: string,
  ): Promise<CustomerBrandEditDTOResponse> {
    const checksetValue = await this.checkAvailCustomerBrand({
      name: data.name,
    });

    const response = new CustomerBrandAddDTOResponse();
    response.transaction_classify = 'EDIT_CUSTOMER_BRAND';
    if (checksetValue) {
      await this.customerBrandModel
        .findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(param),
          },
          {
            name: data.name,
            description: data.description,
            updated_at: Date.now(),
          },
        )
        .catch((e) => {
          // throw new Error(e.message);
          console.log(e);
        })
        .then(async (res) => {
          response.status = HttpStatus.OK;
          response.message = 'Data edit success';
          response.payload = res;
          return response;
        });
    } else {
      response.status = 400;
      response.message = 'Duplicate names are not allowed';
      response.payload = { duplicate: true };
      return response;
    }
    return response;
  }

  async delete_brand(param: string): Promise<CustomerBrandDeleteDTOResponse> {
    const process = this.customerBrandModel
      .findOneAndUpdate({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new CustomerBrandDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Customer Brand Deleted Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Customer Brand Failed to Deleted';
      response.payload = process;
    }
    return response;
  }

  async add_brand(
    param: CustomerBrandAddDTO,
  ): Promise<CustomerBrandAddDTOResponse> {
    const checksetValue = await this.checkAvailCustomerBrand({
      name: param.name,
    });

    const response = new CustomerBrandAddDTOResponse();
    response.transaction_classify = 'ADD_CUSTOMER_BRAND';
    if (checksetValue) {
      const newData = new this.customerBrandModel({
        ...param,
      });
      return await newData
        .save()
        .catch((e: Error) => {
          // throw new Error(e.message);
          console.log(e);
        })
        .then(() => {
          response.status = HttpStatus.OK;
          response.message = 'Data add success';
          response.payload = newData;
          return response;
        });
    } else {
      response.status = 400;
      response.message = 'Duplicate names are not allowed';
      response.payload = { duplicate: true };
    }
    return response;
  }

  async msisdnCheck(param: any): Promise<any> {
    const params = {
      limit: 1,
      filter: `{"phone":"${param.msisdn}"}`,
    };
    return await lastValueFrom(
      await this.httpService
        .get(`${this.core_url}/members`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: param.auth,
          },
          params: params,
        })
        .pipe(
          map(async (res) => {
            const response = res.data.payload.members[0].total[0].count;
            return response > 0 ?? false;
            return res.data.payload;
          }),
        ),
    );
  }

  async memberAdd(
    param: CustomerMemberDto,
    authToken: any,
    noncore_param: any = {},
  ): Promise<CustomerMemberAddDTOResponse> {
    const response = new CustomerMemberAddDTOResponse();
    console.log(param, 'request create');
    console.log(`${this.core_url}/members`, 'url create');
    return await lastValueFrom(
      this.httpService
        .post(`${this.core_url}/gateway/v3.0/members`, param, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        })
        .pipe(
          map(async (res) => {
            const data = res.data;
            if (data.code === 'S00000') {
              // TODO store to local
              let storeLocalParam = Object.keys(param).reduce(
                (obj, key) =>
                  Object.assign(obj, { ['core_' + key]: param[key] }),
                {},
              );
              if (noncore_param.msisdn) {
                const coreAfterAdd = await this.getCoreMemberByMsisdn(
                  noncore_param.msisdn,
                  authToken,
                  '',
                  false,
                ).then(async (coreDetail) => {
                  if (coreDetail !== null) {
                    console.log(
                      '===================================================================== CORE TIER',
                    );
                    console.log(coreDetail);
                    console.log(
                      '===================================================================== CORE TIER',
                    );
                    const core_tier = coreDetail[0].tier.current;
                    let localTier = await this.get_tier_detail({
                      core_id: core_tier.id,
                    });
                    if (!localTier) {
                      const newTier = new CustomerTierAddDTO({
                        name: core_tier.name,
                        description: 'Sync with core',
                        core_id: core_tier.id,
                      });
                      localTier = await this.add_tier(newTier).then(
                        (tierResponse) => {
                          return tierResponse.payload;
                        },
                      );
                    }
                    console.log(
                      '===================================================================== LOCAL TIER',
                    );
                    console.log(localTier);
                    console.log(
                      '===================================================================== LOCAL TIER',
                    );

                    storeLocalParam = {
                      ...storeLocalParam,
                      ...noncore_param,
                      core_id: data.payload.id,
                      loyalty_tier: localTier._id,
                    };
                    // storeLocalParam['core_id'] = data.payload.id;
                    // (storeLocalParam['loyalty_tier'] = localTier._id),
                    //   (storeLocalParam = {
                    //     ...storeLocalParam,
                    //     ...noncore_param,
                    //   });
                  }
                });
              }

              // TODO : Tambah flag new redeemer

              console.log(
                '===================================================================== STORE LOCAL',
              );
              console.log(storeLocalParam);
              console.log(
                '===================================================================== STORE LOCAL',
              );

              const memberNew = new this.customerModel(storeLocalParam);

              // Check if customer is already exist
              const process = await this.customerModel
                .findOne({
                  msisdn: noncore_param.msisdn,
                })
                .then(async (customerExist) => {
                  if (customerExist) {
                    return customerExist;
                  } else {
                    return await memberNew.save().then(async (returning) => {
                      return returning;
                    });
                  }
                });

              console.log(process, 'member add process');

              if (process) {
                response.message = 'Customer Member Created Successfully';
                response.status = HttpStatus.OK;
                response.payload = memberNew;
                // response.payload = await this.getCoreMemberByMsisdn(
                //   noncore_param.msisdn,
                //   authToken,
                // ).then(async (coreDetail) => {
                //   return {
                //     code_id: coreDetail[0].id,
                //     ...storeLocalParam,
                //     ...coreDetail[0],
                //   };
                // });
                console.log(response, 'response 2');
              } else {
                response.message = 'Customer Member Failed to Created';
                response.status = 400;
                response.payload = param;
                console.log(response, 'response 3');
              }
            } else {
              response.message = 'Customer Member Failed to Created';
              response.status = 400;
              response.payload = param;
              console.log(response, 'response 4');
            }
            return response;
          }),
          catchError(async (err: any) => {
            console.log(err, 'err catcth create');
            const responseDataError = err.response.data;
            response.message = 'Customer Member Failed to Created';
            response.status = 400;
            response.payload = responseDataError.message;
            return response;
          }),
        ),
    );
  }

  async memberEdit(
    param: any,
    authToken: any,
    noncore_param: any = {},
    id: string,
  ): Promise<CustomerMemberAddDTOResponse> {
    const response = new CustomerMemberAddDTOResponse();
    return await lastValueFrom(
      this.httpService
        .patch(`${this.core_url}/gateway/v3.0/members/${id}`, param, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        })
        .pipe(
          map(async (res) => {
            const data = res.data;
            if (data.code === 'S00000') {
              // TODO store to local
              let storeLocalParam = Object.keys(param).reduce(
                (obj, key) =>
                  Object.assign(obj, { ['core_' + key]: param[key] }),
                {},
              );
              if (noncore_param.msisdn) {
                const coreAfterAdd = await this.getCoreMemberByMsisdn(
                  noncore_param.msisdn,
                  authToken,
                ).then(async (coreDetail) => {
                  if (coreDetail !== null) {
                    console.log(
                      '===================================================================== CORE TIER',
                    );
                    console.log(coreDetail);
                    console.log(
                      '===================================================================== CORE TIER',
                    );
                    const core_tier = coreDetail[0].tier.current;
                    let localTier = await this.get_tier_detail({
                      core_id: core_tier.id,
                    });
                    if (!localTier) {
                      const newTier = new CustomerTierAddDTO({
                        name: core_tier.name,
                        description: 'Sync with core',
                        core_id: core_tier.id,
                      });
                      localTier = await this.add_tier(newTier).then(
                        (tierResponse) => {
                          return tierResponse.payload;
                        },
                      );
                    }
                    console.log(
                      '===================================================================== LOCAL TIER',
                    );
                    console.log(localTier);
                    console.log(
                      '===================================================================== LOCAL TIER',
                    );

                    storeLocalParam = {
                      ...storeLocalParam,
                      ...noncore_param,
                      // core_id: data.payload.id,
                      core_id: core_tier?.id,
                      loyalty_tier: localTier?._id,
                    };
                  }
                });
              }

              // TODO : Tambah flag new redeemer
              console.log(
                '===================================================================== STORE LOCAL',
              );
              console.log(storeLocalParam);
              console.log(
                '===================================================================== STORE LOCAL',
              );

              const memberNew = new this.customerModel(storeLocalParam);

              // Check if customer is already exist
              const process = await this.customerModel
                .findOne({
                  msisdn: noncore_param.msisdn,
                })
                .then(async (customerExist) => {
                  if (customerExist) {
                    return customerExist;
                  } else {
                    return await memberNew.save().then(async (returning) => {
                      return returning;
                    });
                  }
                });

              console.log(process, 'member edit process');

              if (process) {
                response.message = 'Customer Member Updated Successfully';
                response.status = HttpStatus.OK;
                response.payload = memberNew;
                console.log(response, 'response 2');
              } else {
                response.message = 'Customer Member Failed to Updated';
                response.status = 400;
                response.payload = param;
                console.log(response, 'response 3');
              }
            } else {
              response.message = 'Customer Member Failed to Updated';
              response.status = 400;
              response.payload = param;
              console.log(response, 'response 4');
            }
            return response;
          }),
          catchError(async (err: any) => {
            console.log(err, 'err catcth create');
            const responseDataError = err.response.data;
            response.message = 'Customer Member Failed to Updated';
            response.status = 400;
            response.payload = responseDataError.message;
            return response;
          }),
        ),
    );
  }

  getUrl(): string {
    return this.core_url;
  }

  async getCoreMemberByMsisdn(
    msisdn: string,
    token: string,
    merchant_id: any = null,
    isCache = true,
  ) {
    const now = Date.now();
    // console.log(`Requested msisdn to core: ${msisdn}`);
    // console.log(
    //   `/gateway/v3.0/members?customer_type=Member&filter=%7B%22phone%22%3A%22${msisdn}%7CID%7C%2B62%22%7D&sort=%7B%7D&projection=%7B%7D&addon=%7B%7D&${
    //     merchant_id ? `merchant_id=${merchant_id}` : ''
    //   }`,
    // );

    const _this = this;
    let data;
    console.log(
      `=============================> CHECK ${JSON.stringify(msisdn, null, 2)}`,
    );
    const headerOption =
      isCache === true
        ? {
            Authorization: token,
            'Content-Type': 'application/json',
          }
        : {
            Authorization: token,
            'Content-Type': 'application/json',
            'Cache-Control': 'No-Cache',
          };
    await new Promise(async (resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: _this.raw_core,
        port: _this.raw_port > 0 ? _this.raw_port : null,
        path: `/gateway/v3.0/members?customer_type=Member&filter=%7B%22phone%22%3A%22${msisdn}%7CID%7C%2B62%22%7D&sort=%7B%7D&projection=%7B%7D&addon={"binding_level":1,"ownership_flag":1}&${
          merchant_id ? `merchant_id=${merchant_id}` : ''
        }`,
        headers: headerOption,
      };
      console.log('options');
      console.log(options);
      const req = http.request(options, function (res) {
        const chunks = [];

        res.on('data', function (chunk) {
          chunks.push(chunk);
        });

        res.on('end', async () => {
          if (chunks && res.statusCode === HttpStatus.OK) {
            try {
              const body = Buffer.concat(chunks);
              // TODO : JSON handling if string is not valid
              const response = JSON.parse(body.toString());
              data = response.payload?.members[0]['result'];
              await _this.logger.verbose({
                method: res.method,
                statusCode: res.statusCode,
                transaction_id: '',
                notif_customer: false,
                notif_operation: true,
                taken_time: Date.now() - now,
                param: msisdn,
                step: `Get customer from core`,
                service: 'Customer Service',
                result: {
                  msisdn: msisdn,
                  url: 'customer__function',
                  user_id: null,
                  result: data,
                },
              });
              console.log(`Core get member response time ${Date.now() - now}`);
              resolve(data);
            } catch (error) {
              // handleException({
              //   code: HttpStatusTransaction.CODE_INTERNAL_ERROR,
              //   message: error,
              //   transaction_classify: 'REDEEM',
              //   trace_custom_code: 'RDM',
              //   payload: {
              //     msisdn: msisdn,
              //     token: token,
              //     merchant_id: merchant_id,
              //   },
              // } satisfies GlobalTransactionResponse);
              await _this.logger.error({
                method: 'GET',
                statusCode: res.statusCode,
                transaction_id: '',
                notif_customer: false,
                notif_operation: true,
                taken_time: Date.now() - now,
                param: msisdn,
                step: `Get customer from core`,
                service: 'Customer Service',
                result: {
                  msisdn: msisdn,
                  url: 'customer__function',
                  user_id: null,
                  result: error,
                },
              });
              reject({});
            }
          } else {
            reject({
              code: res.statusCode,
              message: res.statusMessage,
            });
          }
        });

        req.on('error', async function (e) {
          await _this.logger.error({
            method: req.method,
            statusCode: res.statusCode ?? req.statusCode,
            transaction_id: '',
            notif_customer: false,
            notif_operation: true,
            taken_time: Date.now() - now,
            param: msisdn,
            step: `Failed to get customer from core`,
            service: 'Customer Service',
            result: {
              msisdn: msisdn,
              url: 'customer__function',
              user_id: null,
              result: {
                message: e.message,
                stack: e.stack,
              },
            },
          });
          resolve(e);
        });
      });

      req.end();
    });

    return data;
  }

  async getCoreMemberById(
    core_member_id: string,
    token: string,
    merchant_id: string,
    isCache = true,
  ): Promise<any> {
    let response;

    const headerOption =
      isCache === true
        ? {
            Authorization: token,
            'Content-Type': 'application/json',
          }
        : {
            Authorization: token,
            'Content-Type': 'application/json',
            'Cache-Control': 'No-Cache',
          };

    return await new Promise(async (resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: this.raw_core,
        port: this.raw_port > 0 ? this.raw_port : null,
        path: `/gateway/v3.0/members/${core_member_id}?merchant_id=${merchant_id}&addon={"binding_level":1,"ownership_flag":1}`,
        headers: headerOption,
      };

      const req = http.request(options, function (res) {
        const chunks = [];

        res.on('data', function (chunk) {
          chunks.push(chunk);
        });

        res.on('end', async () => {
          if (chunks) {
            const body = Buffer.concat(chunks);
            response = JSON.parse(body.toString());
            resolve(response);
          }
        });
      });

      req.on('error', function (e) {
        reject(e);
      });

      req.end();
    });
  }

  async getCoreWalletCustomer(
    core_member_id: string,
    token: string,
    merchant_id: string,
  ): Promise<any> {
    let response;

    console.log('<-- payload : getCoreWalletCustomer -->');
    console.log('core_member_id : ', core_member_id);
    console.log('token : ', token);
    console.log('merchant_id : ', merchant_id);
    console.log(
      'path : ',
      `/gateway/v3.0/members/${core_member_id}/wallet?merchant_id=${merchant_id}`,
    );
    console.log('<-- payload : getCoreWalletCustomer -->');

    try {
      return await new Promise(async (resolve, reject) => {
        const options = {
          method: 'GET',
          hostname: this.raw_core,
          port: this.raw_port > 0 ? this.raw_port : null,
          path: `/gateway/v3.0/members/${core_member_id}/wallet?merchant_id=${merchant_id}`,
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
        };

        const req = http.request(options, function (res) {
          const chunks = [];

          res.on('data', function (chunk) {
            chunks.push(chunk);
          });

          res.on('end', async () => {
            if (chunks) {
              try {
                const body = Buffer.concat(chunks);
                response = JSON.parse(body.toString());
                resolve(response);
              } catch (error) {
                console.log(error);
                reject({});
              }
            }
          });
        });

        req.on('error', function (e) {
          reject(e);
        });

        req.end();
      });
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async check_member_core(msisdn: string, token: string, reward_item_id: any) {
    console.log('<-- payload :: check_member_core -->');
    console.log('msisdn : ', msisdn);
    console.log('token : ', token);
    console.log('reward_item_id : ', reward_item_id);
    console.log('<-- payload :: check_member_core -->');

    const data = {
      status: false,
      message: '',
      member_core_id: null,
      balance: null,
      __v: null,
    };

    return new Promise(async (resolved, reject) => {
      if (FMC_allowedMSISDN(msisdn)) {
        const reformatMsisdn = FMC_reformatMsisdnCore(msisdn);
        // checking member core
        try {
          const customer = await this.getCoreMemberByMsisdn(
            reformatMsisdn,
            token,
          );
          if (customer) {
            data.member_core_id = customer[0]['id'];
            data.message = 'Success get customer from core';
            data.status = true;
            // get wallet from core
            try {
              const wallet = await this.getCoreWalletCustomer(
                data.member_core_id,
                token,
                this.merchant,
              );
              if (wallet?.payload) {
                const balance = wallet['payload']['wallet']['pocket']['reward'][
                  reward_item_id
                ]
                  ? wallet['payload']['wallet']['pocket']['reward'][
                      reward_item_id
                    ]['total']
                  : null;
                const __v =
                  wallet['code'] == 'S00000'
                    ? wallet['payload']['wallet']['__v']
                    : null;
                data.__v = __v;
                data.balance = balance;
                data.message = 'Success get wallet from core';
                data.status = true;
                resolved(data);
              }
            } catch (error) {
              // get wallet from core fail
              data.status = false;
              data.message = '<-- Fail get wallet from core -->';
              console.log(`<-- ${error} -->`);
              console.log(`<-- ${data.message} -->`);
              reject(data);
            }
          }
          resolved(data);
        } catch (error) {
          // get customer from core fail
          console.log('get customer error');
          // console.log(error);
          data.message = 'Fail get customer from core';
          console.log(`<-- ${data.message} -->`);
          reject(data);
        }
      } else {
        data.message = 'format msisdn not allowed ';
        reject(data);
      }

      console.log('<-- response :: check member core -->');
      console.log(data);
      console.log('<-- response :: check member core -->');

      resolved(data);
    });
  }

  async updateCoreMember(
    core_member_id: string,
    updateData: any,
    token: string,
  ): Promise<any> {
    let response;

    return new Promise(async (resolve, reject) => {
      const options = {
        method: 'PATCH',
        hostname: this.raw_core,
        port: this.raw_port > 0 ? this.raw_port : null,
        path: `/gateway/v3.0/members/${core_member_id}`,
        headers: {
          Authorization: `${token}`,
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, function (res) {
        const chunks = [];

        res.on('data', function (chunk) {
          chunks.push(chunk);
        });

        res.on('end', async () => {
          if (chunks) {
            const body = Buffer.concat(chunks);
            response = JSON.parse(body.toString());
            resolve(response);
          }
        });
      });

      req.on('error', function (e) {
        reject(e);
      });

      req.write(JSON.stringify(updateData));

      req.end();
    });
  }

  /**
   * Get customer by segmentation from core
   * @param filter
   * @param projection
   * @param token
   * @param skip
   * @param limit
   */
  async getCoreMemberBySegmentation(
    filter: any,
    projection = '',
    token: string = null,
    limit = null,
    skip = null,
  ) {
    let data = {
      total: 0,
      data: [],
    };

    const objParams = {
      customer_type: 'Member',
      filter: filter,
      projection: projection,
    };

    if (skip) {
      objParams['skip'] = skip;
    }

    if (limit) {
      objParams['limit'] = limit;
    }
    return await lastValueFrom(
      this.httpService
        .get(`${this.url}/members`, {
          params: objParams,
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
        })
        .pipe(
          map(async (res) => {
            //console.log(res.data.payload.members[0]?.total[0]?.count);
            const result = res.data.payload;
            data = {
              total: result.members[0]?.total[0]?.count ?? 0,
              data: result.members[0]?.result ?? [],
            };

            return data;
          }),
          catchError(async (err) => {
            console.log(err);
            return data;
          }),
        ),
    );
  }
}
