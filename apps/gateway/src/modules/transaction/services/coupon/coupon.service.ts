import { CallApiConfig } from '@configs/call-api.config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { isInt } from 'class-validator';
import { response } from 'express';
import { Model, Types } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { formatMsisdnToID } from '@/application/utils/Msisdn/formatter';
import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import {
  LuckyDrawUploadDetailDocument,
  LuckyDrawUploadDetailModel,
} from '@/lucky-draw/models/lucky.draw.upload.detail.model';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import {
  ViewCouponParamDTO,
  ViewCouponQueryDTO,
} from '@/transaction/dtos/coupon/view.coupon.list.property.dto';
import {
  InjectCoupon,
  InjectCouponDocument,
} from '@/transaction/models/inject.coupon.model';
import { InjectCouponSummary } from '@/transaction/models/inject-coupon-summary.model';
const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');
import * as moment from 'moment';

@Injectable()
export class CouponService {
  private httpService: HttpService;
  private url: string;
  private realm: string;
  private branch: string;
  private merchant: string;
  private raw_core: string;
  private raw_port: number;
  private logger = new Logger('HTTP');
  private programService: ProgramServiceV2;

  constructor(
    @InjectModel(InjectCoupon.name)
    private injectCouponModel: Model<InjectCouponDocument>,
    @InjectModel(LuckyDrawUploadDetailModel.name)
    private luckyDrawWinnerModel: Model<LuckyDrawUploadDetailDocument>,
    @InjectModel(InjectCoupon.name, 'secondary')
    private injectCouponModelSec: Model<InjectCouponDocument>,
    @InjectModel(LuckyDrawUploadDetailModel.name, 'secondary')
    private luckyDrawWinnerModelSec: Model<LuckyDrawUploadDetailDocument>,
    @InjectModel(InjectCouponSummary.name, 'secondary')
    private injectCouponSummaryModelSec: Model<InjectCouponSummary>,

    @Inject('REPORTING_STATISTIC_PRODUCER')
    private readonly clientReporting: ClientKafka,

    programService: ProgramServiceV2,
    httpService: HttpService,
    configService: ConfigService,
    private readonly callApiConfigService: CallApiConfigService,
    private readonly applicationService: ApplicationService,
  ) {
    this.httpService = httpService;
    this.programService = programService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
  }

  private convertDate(date: string) {
    if (date == null) return null;
    const timezone = 'Asia/Jakarta';
    return moment
      .tz(moment.utc(date), timezone)
      .format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  }

  async core_find_coupon(id: string, token: string) {
    const _this = this;
    let data;
    await new Promise(async (resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: _this.raw_core,
        port: _this.raw_port > 0 ? _this.raw_port : null,
        path: `/gateway/v3.0/vouchers/${id}?merchant_id=${_this.merchant}`,
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
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());
            data = response;
            resolve(response);
          }
        });
      });

      req.on('error', function (e) {
        resolve(e);
      });

      req.end();
    });
    return data;
  }

  async inject_coupon(
    request: InjectCoupon,
    account: Account,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;

    // TODO : Should eligibility check first here

    await new Promise(async (resolve, reject) => {
      if (account) {
        const options = {
          method: 'POST',
          hostname: _this.raw_core,
          port: _this.raw_port > 0 ? _this.raw_port : null,
          path: '/gateway/v3.0/vouchers',
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
              const resp = JSON.parse(body.toString());
              const resPayload = resp.payload;
              if (resp.code === 'S00000') {
                await _this
                  .core_find_coupon(resPayload.id, token)
                  .then(async (voucher_detail: any) => {
                    const vd_payload = voucher_detail.payload.voucher;
                    const newData = new _this.injectCouponModel({
                      ...request,
                      core_id: resPayload.id,
                      core_type: vd_payload.type,
                      // core_serial_code: vd_payload.serial_code,
                      // core_name: vd_payload.name,
                      // core_desc: vd_payload.desc,
                      // core_remark: vd_payload.remark,
                      // core_product_name: vd_payload.product_name,
                      // core_owner_name: vd_payload.owner_name,
                      // core_owner_phone: vd_payload.owner_phone,
                      // core_provider_flag: vd_payload.core_provider_flag,
                      // core_merchant_flag: vd_payload.merchant_flag,
                      core_start_time: vd_payload.start_time,
                      core_end_time: vd_payload.end_time,
                      core_status: vd_payload.status,
                      core_redeem_time: vd_payload.redeem_time,
                      core__v: vd_payload.__v,
                      core_time: vd_payload.time,
                      created_by: account,
                    });

                    await newData
                      .save()
                      .then(() => {
                        responseGlobal.code = resp.code;
                        responseGlobal.message = resp.message;
                        responseGlobal.transaction_classify = 'COUPON_INJECT';
                        responseGlobal.payload = {
                          ...resPayload,
                          ...request,
                          core_id: resPayload.id,
                          core_type: vd_payload.type,
                          // core_serial_code: vd_payload.serial_code,
                          // core_name: vd_payload.name,
                          // core_desc: vd_payload.desc,
                          // core_remark: vd_payload.remark,
                          // core_product_name: vd_payload.product_name,
                          // core_owner_name: vd_payload.owner_name,
                          // core_owner_phone: vd_payload.owner_phone,
                          // core_provider_flag: vd_payload.core_provider_flag,
                          // core_merchant_flag: vd_payload.merchant_flag,
                          core_start_time: vd_payload.start_time,
                          core_end_time: vd_payload.end_time,
                          core_status: vd_payload.status,
                          core_redeem_time: vd_payload.redeem_time,
                          core__v: vd_payload.__v,
                          core_time: vd_payload.time,
                          created_by: account,
                        };
                        resolve(responseGlobal);
                      })
                      .catch((e) => {
                        responseGlobal.code =
                          HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                        responseGlobal.message = 'Failed to log inject voucher';
                        responseGlobal.transaction_classify = 'COUPON_INJECT';
                        responseGlobal.payload = resPayload;
                        resolve(responseGlobal);
                      });
                  })
                  .catch((e) => {
                    responseGlobal.code =
                      HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                    responseGlobal.message = 'Created voucher is not sync';
                    responseGlobal.transaction_classify = 'COUPON_INJECT';
                    responseGlobal.payload = resPayload;
                    resolve(responseGlobal);
                  });
              } else {
                responseGlobal.code = resp.code;
                responseGlobal.message = resp.message;
                responseGlobal.transaction_classify = 'COUPON_INJECT';
                responseGlobal.payload = resPayload;
                resolve(responseGlobal);
              }
            }
          });
        });

        req.on('error', function (e) {
          responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
          responseGlobal.message = e.message;
          responseGlobal.transaction_classify = 'COUPON_INJECT';
          responseGlobal.payload = {
            trace_id: false,
          };

          resolve(responseGlobal);
        });

        let allowProcess = false;
        let program;
        if (request.program_id !== '') {
          program = await _this.programService.getProgramByName(
            request.program_id,
          );

          if (program) {
            allowProcess = true;
          } else {
            // TODO : If program not found handler
          }
        }

        if (request.keyword !== '') {
        }

        if (allowProcess) {
          const forCore = {
            locale: request.locale,
            type: 'Product',
            transaction_no: request.transaction_id,
            channel: 'Application',
            name: 'TANAKA',
            prefix: '',
            suffix: '',
            desc: '',
            remark: '',
            product_name: 'Toys',
            owner_name: request.msisdn,
            owner_phone: `${request.msisdn}|ID|+62`,
            status: 'Active',
            expiry: {
              expire_type: 'specific',
              expire_specific: program.end_period,
              // expire_duration: {
              //   value: 2,
              //   unit: '',
              // },
              // expire_endof: {
              //   value: 2,
              //   unit: '',
              // },
            },
            product_id: 'prodct-6322c22c10635ec399474f2d',
            owner_id: 'member-5fdb3a63ae5f5148f3143b19',
            realm_id: _this.realm,
            branch_id: _this.branch,
            merchant_id: _this.merchant,
          };

          req.write(JSON.stringify(forCore));
          req.end();
        } else {
          responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
          responseGlobal.message = 'Process is forbidden';
          responseGlobal.transaction_classify = 'COUPON_INJECT';
          responseGlobal.payload = {
            trace_id: false,
          };
          resolve(responseGlobal);
        }

        req.end();
      } else {
        resolve([{ isUnknown: 'unauthorized action' }]);
      }
    });

    return responseGlobal;
    // const newData = new this.injectCouponModel({
    //   ...request,
    //   created_by: account,
    // });

    // return await newData
    //   .save()
    //   .catch((e: Error) => {
    //     throw new Error(e.message);
    //   })
    //   .then(() => {
    //     response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    //     response.message = 'Success';
    //     response.transaction_classify = 'COUPON_INJECT';
    //     response.payload = {
    //       trace_id: true,
    //     };
    //     return response;
    //   });
  }

  async cuoponList(param: ViewCouponParamDTO, query: any) {
    const response = new GlobalTransactionResponse();

    const queryBuilder: any = [];

    const filter_set =
      query.filter && query.filter !== undefined && query.filter !== ''
        ? JSON.parse(query.filter)
        : {};
    // const sort_set = query.sort === '{}' ? { _id: 1 } : JSON.parse(query.sort);

    query.limit =
      query.limit || query.limit === 0
        ? query.limit == 0
          ? 0
          : query.limit
        : 5;

    if (query.limit < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must More Than or Equal to 0' },
      ]);
    }

    if (!isInt(parseInt(query.limit))) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must Be Numeric' },
      ]);
    }

    const limit: number = parseInt(query.limit);
    const skip: number = parseInt(query.skip) || 0;
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

    let msisdn = param.msisdn;
    if (/^0/g.test(msisdn)) {
      msisdn = msisdn.replace(/^0/, '62');
    }

    queryBuilder.push({
      $match: { msisdn: msisdn },
    });

    // queryBuilder.push({
    //   $lookup: {
    //     from: 'programv2',
    //     let: { program_id: '$program_id' },
    //     pipeline: [
    //       {
    //         $match: {
    //           $expr: {
    //             $and: [
    //               {
    //                 $eq: [
    //                   '$_id',
    //                   {
    //                     $convert: {
    //                       input: '$$program_id',
    //                       to: 'objectId',
    //                       onNull: '',
    //                       onError: '',
    //                     },
    //                   },
    //                 ],
    //               },
    //             ],
    //           },
    //         },
    //       },
    //       {
    //         $project: {
    //           // _id: false,
    //           created_by: false,
    //           created_at: false,
    //           updated_at: false,
    //           deleted_at: false,
    //           __v: false,
    //         },
    //       },
    //     ],
    //     as: 'program_info',
    //   },
    // });

    // TODO : Join to keyword and program then populate the result

    // queryBuilder.push({
    //   $unwind: '$program_info',
    // });

    queryBuilder.push({ $match: filter_builder });

    if (query.transaction_id) {
      queryBuilder.push({ $match: { transaction_id: query.transaction_id } });
    }

    if (query.channel_id) {
      queryBuilder.push({ $match: { channel_id: query.channel_id } });
    }

    if (query.program_id) {
      queryBuilder.push({ $match: { program_id: query.program_id } });
    }

    if (query.keyword) {
      // queryBuilder.push({
      //   $match: { 'program_info.keyword_registration': query.keyword },
      // });
      queryBuilder.push({ $match: { keyword: query.keyword } });
    }

    const allNoFilter = await this.injectCouponModel.aggregate(
      queryBuilder,
      (err, result) => {
        return result;
      },
    );

    queryBuilder.push({ $skip: skip });
    if (limit > 0) queryBuilder.push({ $limit: limit });
    // queryBuilder.push({ $sort: sort_set });

    const coupons = await this.injectCouponModel.aggregate(
      queryBuilder,
      (err, result) => {
        return result;
      },
    );

    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.transaction_classify = 'GET_COUPON_LIST';

    const couponsDetail = {};
    let population = [];

    await Promise.all(
      coupons.map((coupon) => {
        if (!couponsDetail[`${coupon?.program_name}_${coupon?.keyword}`]) {
          couponsDetail[`${coupon?.program_name}_${coupon?.keyword}`] = {
            program_id: coupon?.program_id || null,
            program_name: coupon?.program_name || null,
            program_start: this.convertDate(coupon?.program_start) || null,
            program_end: this.convertDate(coupon?.program_end) || null,
            keyword: coupon?.keyword || null,
            total_coupon: 0,
            status_winner: 0,
            list_of_winner: [
              {
                prize_name: 'TODO',
                msisdn: '62813XXXXX',
                coupon: 350,
              },
            ],
          };
        }

        couponsDetail[
          `${coupon?.program_name}_${coupon?.keyword}`
        ].total_coupon += 1;
        // return {
        //   program_id: coupon?.program_id || null,
        //   program_name: coupon?.program_name || null,
        //   program_start: coupon?.program_start || null,
        //   program_end: coupon?.program_end || null,
        //   keyword: coupon?.keyword || null,
        //   total_coupon: 100,
        //   status_winner: 0,
        //   list_of_winner: [
        //     {
        //       prize_name: 'TODO',
        //       msisdn: '62813XXXXX',
        //       coupon: 350,
        //     },
        //   ],
        // };
      }),
    );

    // for (const a in couponsDetail) {
    //   population.push(couponsDetail[a]);
    // }
    population = Object.values(couponsDetail);

    response.payload = {
      // transaction_id: 'N/A',
      total_record: allNoFilter.length,
      // page_size: limit,
      // page_number: skip == 0 ? 1 : limit / skip,
      page_size: limit == 0 ? allNoFilter.length : limit,
      page_number: skip == 0 ? 1 : allNoFilter.length / skip,
      // list_of_coupon: couponsDetail,
      list_of_coupon: population,
      // list_of_coupon_asli: coupons,
      msisdn: msisdn,
    };

    return response;
  }

  async cuoponListv2(param: ViewCouponParamDTO, query: any) {
    const response = new GlobalTransactionResponse();

    const queryBuilder: any = [];

    const filter_set =
      query.filter && query.filter !== undefined && query.filter !== ''
        ? JSON.parse(query.filter)
        : {};
    // const sort_set = query.sort === '{}' ? { _id: 1 } : JSON.parse(query.sort);

    query.limit =
      query.limit || query.limit === 0
        ? query.limit == 0
          ? 0
          : query.limit
        : 5;

    if (query.limit < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must More Than or Equal to 0' },
      ]);
    }

    if (!isInt(parseInt(query.limit))) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must Be Numeric' },
      ]);
    }

    const limit: number = parseInt(query.limit);
    const skip: number = parseInt(query.skip) || 0;
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

    let msisdn = param.msisdn;
    if (/^0/g.test(msisdn)) {
      msisdn = msisdn.replace(/^0/, '62');
    }

    queryBuilder.push({
      $match: { msisdn: msisdn },
    });

    queryBuilder.push({ $match: filter_builder });

    /*
    if (query.transaction_id) {
      queryBuilder.push({ $match: { transaction_id: query.transaction_id } });
    }

    if (query.channel_id) {
      queryBuilder.push({ $match: { channel_id: query.channel_id } });
    }

    if (query.program_id) {
      queryBuilder.push({ $match: { program_id: query.program_id } });
    }

    if (query.keyword) {
      // queryBuilder.push({
      //   $match: { 'program_info.keyword_registration': query.keyword },
      // });
      queryBuilder.push({ $match: { keyword: query.keyword } });
    }

    // queryBuilder.push({ $skip: skip });
    // if (limit > 0) queryBuilder.push({ $limit: limit });
    // queryBuilder.push({ $sort: sort_set });
    */

    const coupons = await this.injectCouponModel.aggregate(
      queryBuilder,
      (err, result) => {
        return result;
      },
    );

    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.transaction_classify = 'GET_COUPON_LIST';

    const couponsDetail = {};
    let population = [];

    await Promise.all(
      coupons.map((coupon) => {
        if (!couponsDetail[`${coupon?.program_name}_${coupon?.keyword}`]) {
          couponsDetail[`${coupon?.program_name}_${coupon?.keyword}`] = {
            program_id: coupon?.program_id || null,
            program_name: coupon?.program_name || null,
            program_start: this.convertDate(coupon?.program_start) || null,
            program_end: this.convertDate(coupon?.program_end) || null,
            keyword: coupon?.keyword || null,
            total_coupon: 0,
            status_winner: 0,
            list_of_winner: [
              {
                prize_name: 'TODO',
                msisdn: '62813XXXXX',
                coupon: 350,
              },
            ],
          };
        }

        couponsDetail[
          `${coupon?.program_name}_${coupon?.keyword}`
        ].total_coupon += 1;
      }),
    );

    population = Object.values(couponsDetail);

    // limit
    const newTotalData = population.length;
    if (skip > 0) {
      population = population.slice(skip);
    }

    if (limit > 0) {
      population = this.paginate(population, limit, 1);
    }

    const page_size = newTotalData / limit;
    response.payload = {
      total_record: newTotalData,
      page_size: Math.ceil(page_size),
      // page_number: 1,
      list_of_coupon: population,
      msisdn: msisdn,
    };

    return response;
  }

  private getTime(start) {
    const end = Date.now();
    return `Execution time: ${end - start} ms`;
  }

  async couponEnhancement(param: ViewCouponParamDTO, query: any) {
    const isCouponSummaryEnabled = await this.applicationService.getConfig(
      CallApiConfig.IS_COUPON_SUMMARY_ENABLED,
    );

    if (isCouponSummaryEnabled) {
      // new flow query to transaction_inject_coupon_summary
      return this.couponSummaryList(param, query);
    } else {
      // flow existing query to transaction_inject_coupon
      return this.cuoponListv3(param, query);
    }
  }

  async couponSummaryList(param: ViewCouponParamDTO, query: any) {
    // query to inject coupon summary
    const s1 = Date.now();
    console.log('=== Coupon Summary start ===');
    console.log('| Msisdn: ', param.msisdn);

    const response = new GlobalTransactionResponse();
    const queryBuilder: any = [];

    const filter_set =
      query.filter && query.filter !== undefined && query.filter !== ''
        ? JSON.parse(query.filter)
        : {};
    // const sort_set = query.sort === '{}' ? { _id: 1 } : JSON.parse(query.sort);

    query.limit =
      query.limit || query.limit === 0
        ? query.limit == 0
          ? 0
          : query.limit
        : 5;

    if (!isInt(parseInt(query.limit))) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must Be Numeric' },
      ]);
    }

    if (query.limit < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must More Than 1' },
      ]);
    } else if (query.limit == 0) {
      const configLimit = await this.applicationService.getConfig(
        'DEFAULT_LIMIT_PAGINATION',
      );
      query.limit = configLimit ? configLimit : 5;
    }

    if (query.skip < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Skip Must be a Non-Negative Number' },
      ]);
    }

    const s2 = Date.now();

    const limit: number = parseInt(query.limit);
    const skip: number = parseInt(query.skip) || 0;
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

    let msisdn = param.msisdn;
    if (/^0/g.test(msisdn)) {
      msisdn = msisdn.replace(/^0/, '62');
    }

    filter_builder['msisdn'] = { $eq: msisdn };
    filter_builder['program_end'] = { $gte: moment().utc().toDate() };

    queryBuilder.push({ $match: filter_builder });

    console.log('| ', JSON.stringify(queryBuilder));
    console.log('| Filter Builder: ', this.getTime(s2));

    const isPaginationTotalDataEnable = await this.applicationService.getConfig(
      CallApiConfig.PAGINATION_TOTAL_DATA,
    );

    console.log('isPaginationTotalDataEnable', isPaginationTotalDataEnable);
    let allData = 0;
    if (isPaginationTotalDataEnable) {
      const queryTotal = await this.injectCouponSummaryModelSec.aggregate(
        queryBuilder,
        (err, result) => {
          return result;
        },
      );

      allData = queryTotal.length;
    }

    console.log('allData', allData);

    queryBuilder.push({ $skip: skip });
    queryBuilder.push({ $limit: limit });
    queryBuilder.push({
      $project: {
        _id: false,
        program_id: true,
        program_name: true,
        program_start: true,
        program_end: true,
        keyword: "$keyword_name",
        total_coupon: true,
        status_winner: { $literal: 0 },
        list_of_winner: []
      }
    })

    const queryResult = await this.injectCouponSummaryModelSec.aggregate(
      queryBuilder,
    );

    const s3 = Date.now();
    console.log('| ', JSON.stringify(queryBuilder));
    console.log('| Query:', this.getTime(s3));

    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.transaction_classify = 'GET_COUPON_LIST';

    const s4 = Date.now();
    response.payload = {
      total_record: allData,
      page_size: queryResult.length,
      page_number: isPaginationTotalDataEnable
        ? skip == 0
          ? 1
          : allData / skip
        : 1,
      list_of_coupon: queryResult,
      msisdn: msisdn,
    };

    console.log('| Response:', this.getTime(s4));
    console.log('| Total execution time: ', this.getTime(s1));
    console.log('=== Coupon Summary End ===');

    return response;
  }

  async couponSummaryListWithReportStatistic(param: ViewCouponParamDTO, query: any) {
    // check msisdn is exit ini coupon summary
    const countMsisdn = await this.injectCouponSummaryModelSec.count({
      msisdn: param.msisdn,
    });

    if (countMsisdn < 1) {
      return this.cuoponListv3(param, query);
    }

    // query to inject coupon summary
    const s1 = Date.now();
    console.log('=== Coupon Summary start ===');
    console.log('| Msisdn: ', param.msisdn);

    const response = new GlobalTransactionResponse();
    const queryBuilder: any = [];

    const filter_set =
      query.filter && query.filter !== undefined && query.filter !== ''
        ? JSON.parse(query.filter)
        : {};
    // const sort_set = query.sort === '{}' ? { _id: 1 } : JSON.parse(query.sort);

    query.limit =
      query.limit || query.limit === 0
        ? query.limit == 0
          ? 0
          : query.limit
        : 5;

    if (!isInt(parseInt(query.limit))) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must Be Numeric' },
      ]);
    }

    if (query.limit < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must More Than 1' },
      ]);
    } else if (query.limit == 0) {
      const configLimit = await this.applicationService.getConfig(
        'DEFAULT_LIMIT_PAGINATION',
      );
      query.limit = configLimit ? configLimit : 5;
    }

    if (query.skip < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Skip Must be a Non-Negative Number' },
      ]);
    }

    const s2 = Date.now();

    const limit: number = parseInt(query.limit);
    const skip: number = parseInt(query.skip) || 0;
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

    let msisdn = param.msisdn;
    if (/^0/g.test(msisdn)) {
      msisdn = msisdn.replace(/^0/, '62');
    }

    filter_builder['msisdn'] = { $eq: msisdn };
    filter_builder['program_end'] = { $gte: moment().utc().toDate() };

    queryBuilder.push({ $match: filter_builder });

    console.log('| ', JSON.stringify(queryBuilder));
    console.log('| Filter Builder: ', this.getTime(s2));

    const isPaginationTotalDataEnable = await this.applicationService.getConfig(
      CallApiConfig.PAGINATION_TOTAL_DATA,
    );

    console.log('isPaginationTotalDataEnable', isPaginationTotalDataEnable);
    let allData = 0;
    if (isPaginationTotalDataEnable) {
      const queryTotal = await this.injectCouponSummaryModelSec.aggregate(
        queryBuilder,
        (err, result) => {
          return result;
        },
      );

      allData = queryTotal.length;
    }

    console.log('allData', allData);

    queryBuilder.push({ $skip: skip });
    queryBuilder.push({ $limit: limit });
    queryBuilder.push({
      $facet: {
        result: [
          {
            $match: {},
          },
        ],
        sync_not_null: [
          {
            $match: {
              synced_at: { $ne: null },
            },
          },
          {
            $count: 'count',
          },
        ],
      },
    });
    queryBuilder.push({
      $addFields: {
        sync_not_null: {
          $arrayElemAt: ['$sync_not_null.count', 0],
        },
      },
    });
    queryBuilder.push({
      $project: {
        sync_not_null: { $ifNull: ['$sync_not_null', 0] },
        result: 1,
      },
    });

    const queryResult = await this.injectCouponSummaryModelSec.aggregate(
      queryBuilder,
    );

    const s3 = Date.now();
    console.log('| ', JSON.stringify(queryBuilder));
    console.log('| Query:', this.getTime(s3));

    const cutoffCouponSummary = await this.applicationService.getConfig(
      CallApiConfig.COUPON_SUMMARY_CUTOFF_END,
    );
    const cutoff = moment(cutoffCouponSummary).utc();
    const sysdate = moment().utc();

    if (queryResult[0]?.sync_not_null.length === 0 && sysdate.isAfter(cutoff)) {
      // emit to reporting statistic
      this.clientReporting.emit(process.env.KAFKA_REPORTING_STATISTIC_TOPIC, {
        transaction_status: 'Success',
        transaction_classify: 'COUPON_SUMMARY',
        msisdn: param.msisdn,
      });
    }

    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.transaction_classify = 'GET_COUPON_LIST';

    const s4 = Date.now();
    response.payload = {
      total_record: allData,
      page_size: queryResult[0]?.result.length,
      page_number: isPaginationTotalDataEnable
        ? skip == 0
          ? 1
          : allData / skip
        : 0,
      list_of_coupon: queryResult[0]?.result,
      msisdn: msisdn,
    };

    console.log('| Response:', this.getTime(s4));
    console.log('| Total execution time: ', this.getTime(s1));
    console.log('=== Coupon Summary End ===');

    return response;
  }

  async cuoponListv3(param: ViewCouponParamDTO, query: any) {
    let totalCoupon = 0;
    const s1 = Date.now();
    console.log('=== Coupon List start ===');
    console.log('| Msisdn: ', param.msisdn);

    const response = new GlobalTransactionResponse();
    const queryBuilder: any = [];

    const filter_set =
      query.filter && query.filter !== undefined && query.filter !== ''
        ? JSON.parse(query.filter)
        : {};
    // const sort_set = query.sort === '{}' ? { _id: 1 } : JSON.parse(query.sort);

    query.limit =
      query.limit || query.limit === 0
        ? query.limit == 0
          ? 0
          : query.limit
        : 5;

    if (!isInt(parseInt(query.limit))) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must Be Numeric' },
      ]);
    }

    if (query.limit < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must More Than 1' },
      ]);
    } else if (query.limit == 0) {
      const configLimit = await this.callApiConfigService.callConfig(
        'DEFAULT_LIMIT_PAGINATION',
      );
      query.limit = configLimit ? configLimit : 5;
    }

    if (query.skip < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Skip Must be a Non-Negative Number' },
      ]);
    }

    const s2 = Date.now();

    const limit: number = parseInt(query.limit);
    const skip: number = parseInt(query.skip) || 0;
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

    let msisdn = param.msisdn;
    if (/^0/g.test(msisdn)) {
      msisdn = msisdn.replace(/^0/, '62');
    }

    queryBuilder.push({
      $match: { msisdn: msisdn, core_type: 'Coupon' },
    });

    queryBuilder.push({ $match: filter_builder });

    queryBuilder.push({
      $group: {
        _id: {
          program_name: '$program_name',
          keyword: '$keyword',
        },
        latestData: {
          $max: {
            $mergeObjects: [
              {
                updated_at: '$updated',
              },
              '$$ROOT',
            ],
          },
        },
        total_coupon: {
          $sum: 1,
        },
      },
    });

    console.log('| ', JSON.stringify(queryBuilder));
    console.log('| Query Builder (filter): ', this.getTime(s2));
    const s3 = Date.now();

    const isPaginationTotalDataEnable = await this.applicationService.getConfig(
      CallApiConfig.PAGINATION_TOTAL_DATA,
    );

    console.log('isPaginationTotalDataEnable', isPaginationTotalDataEnable);
    let allData = 0;
    if (isPaginationTotalDataEnable) {
      const queryTotal = await this.injectCouponModelSec.aggregate(
        queryBuilder,
        (err, result) => {
          return result;
        },
      );

      allData = queryTotal.length;
    }

    console.log('allData', allData);

    queryBuilder.push({ $skip: skip });
    queryBuilder.push({ $limit: limit });

    const coupons = await this.injectCouponModelSec.aggregate(
      queryBuilder,
      (err, result) => {
        return result;
      },
    );

    console.log('| Query:', this.getTime(s3));

    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.transaction_classify = 'GET_COUPON_LIST';

    const s4 = Date.now();

    const couponsDetail = await Promise.all(
      coupons.map(async (coupon) => {
        totalCoupon += coupon?.total_coupon ?? 0;

        // setup winner
        // const luckyDrawWinner = await this.luckyDrawWinnerModelSec.find({
        //   keyword: coupon?.latestData?.keyword,
        // });

        const statusWinner = 0;
        const listWinner = [];

        // if (luckyDrawWinner.length > 0) {
        //   const winner = luckyDrawWinner.find(
        //     (item) => item.msisdn === coupon?.latestData?.msisdn,
        //   );

        //   statusWinner = winner ? 1 : 2;

        //   listWinner = winner
        //     ? [
        //         {
        //           prize_name: winner.prize,
        //           msisdn: winner.msisdn,
        //           coupon: coupon?.total_coupon || 0,
        //         },
        //       ]
        //     : [];
        // }

        return {
          program_id: coupon?.latestData?.program_id || null,
          program_name: coupon?.latestData?.program_name || null,
          program_start:
            this.convertDate(coupon?.latestData?.program_start) || null,
          program_end:
            this.convertDate(coupon?.latestData?.program_end) || null,
          keyword: coupon?.latestData?.keyword || null,
          total_coupon: coupon?.total_coupon || 0,
          status_winner: statusWinner,
          list_of_winner: listWinner,
        };
      }),
    );

    // const page_size = newTotalData / limit;
    response.payload = {
      total_record: allData,
      // total_coupon: totalCoupon,
      page_size: coupons.length,
      page_number: isPaginationTotalDataEnable
        ? skip == 0
          ? 1
          : allData / skip
        : 0,
      list_of_coupon: couponsDetail,
      msisdn: msisdn,
    };

    console.log('| Response:', this.getTime(s4));
    console.log('| Total execution time: ', this.getTime(s1));
    console.log('=== Coupon List End ===');

    return response;
  }

  async cuoponListv3Old(param: ViewCouponParamDTO, query: any) {
    let totalCoupon = 0;
    const s1 = Date.now();
    console.log('=== Coupon List start ===');
    console.log('| Msisdn: ', param.msisdn);

    const response = new GlobalTransactionResponse();
    const queryBuilder: any = [];

    const filter_set =
      query.filter && query.filter !== undefined && query.filter !== ''
        ? JSON.parse(query.filter)
        : {};
    // const sort_set = query.sort === '{}' ? { _id: 1 } : JSON.parse(query.sort);

    query.limit =
      query.limit || query.limit === 0
        ? query.limit == 0
          ? 0
          : query.limit
        : 5;

    if (!isInt(parseInt(query.limit))) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must Be Numeric' },
      ]);
    }

    if (query.limit < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Limit Must More Than 1' },
      ]);
    } else if (query.limit == 0) {
      const configLimit = await this.callApiConfigService.callConfig(
        'DEFAULT_LIMIT_PAGINATION',
      );
      query.limit = configLimit ? configLimit : 5;
    }

    if (query.skip < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Skip Must be a Non-Negative Number' },
      ]);
    }

    const s2 = Date.now();

    const limit: number = parseInt(query.limit);
    const skip: number = parseInt(query.skip) || 0;
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

    let msisdn = param.msisdn;
    if (/^0/g.test(msisdn)) {
      msisdn = msisdn.replace(/^0/, '62');
    }

    queryBuilder.push({
      $match: { msisdn: msisdn, core_type: 'Coupon' },
    });

    queryBuilder.push({ $match: filter_builder });

    queryBuilder.push({
      $group: {
        _id: {
          program_name: '$program_name',
          keyword: '$keyword',
        },
        latestData: {
          $max: {
            $mergeObjects: [
              {
                updated_at: '$updated',
              },
              '$$ROOT',
            ],
          },
        },
        total_coupon: {
          $sum: 1,
        },
      },
    });

    console.log('| ', JSON.stringify(queryBuilder));
    console.log('| Query Builder (filter): ', this.getTime(s2));
    const s3 = Date.now();

    const allData = await this.injectCouponModel.aggregate(
      queryBuilder,
      (err, result) => {
        return result;
      },
    );

    queryBuilder.push({ $skip: skip });
    queryBuilder.push({ $limit: limit });

    const coupons = await this.injectCouponModel.aggregate(
      queryBuilder,
      (err, result) => {
        return result;
      },
    );

    console.log('| Query:', this.getTime(s3));

    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.transaction_classify = 'GET_COUPON_LIST';

    const s4 = Date.now();

    const couponsDetail = await Promise.all(
      coupons.map(async (coupon) => {
        totalCoupon += coupon?.total_coupon ?? 0;

        // setup winner
        const luckyDrawWinner = await this.luckyDrawWinnerModel.find({
          keyword: coupon?.latestData?.keyword,
        });

        let statusWinner = 0;
        let listWinner = [];

        if (luckyDrawWinner.length > 0) {
          const winner = luckyDrawWinner.find(
            (item) => item.msisdn === coupon?.latestData?.msisdn,
          );

          statusWinner = winner ? 1 : 2;

          listWinner = winner
            ? [
                {
                  prize_name: winner.prize,
                  msisdn: winner.msisdn,
                  coupon: coupon?.total_coupon || 0,
                },
              ]
            : [];
        }

        return {
          program_id: coupon?.latestData?.program_id || null,
          program_name: coupon?.latestData?.program_name || null,
          program_start:
            this.convertDate(coupon?.latestData?.program_start) || null,
          program_end:
            this.convertDate(coupon?.latestData?.program_end) || null,
          keyword: coupon?.latestData?.keyword || null,
          total_coupon: coupon?.total_coupon || 0,
          status_winner: statusWinner,
          list_of_winner: listWinner,
        };
      }),
    );

    // const page_size = newTotalData / limit;
    response.payload = {
      total_record: allData.length,
      // total_coupon: totalCoupon,
      page_size: coupons.length,
      page_number: skip == 0 ? 1 : allData.length / skip,
      list_of_coupon: couponsDetail,
      msisdn: msisdn,
    };

    console.log('| Response:', this.getTime(s4));
    console.log('| Total execution time: ', this.getTime(s1));
    console.log('=== Coupon List End ===');

    return response;
  }

  paginate(array, page_size, page_number) {
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((page_number - 1) * page_size, page_number * page_size);
  }

  async couponAmountPerProgram(msisdn, programName, keywordName = null) {
    const query = [];

    query.push(
      {
        $lookup: {
          from: 'programv2',
          let: { program_id: '$program_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        '$_id',
                        {
                          $convert: {
                            input: '$$program_id',
                            to: 'objectId',
                            onNull: '',
                            onError: '',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                // _id: false,
                created_by: false,
                created_at: false,
                updated_at: false,
                deleted_at: false,
                __v: false,
              },
            },
          ],
          as: 'program_info',
        },
      },
      {
        $unwind: '$program_info',
      },
    );

    // new filter
    const queryMatchAnd: any[] = [
      {
        $or: [
          {
            msisdn: formatMsisdnToID(msisdn),
          },
          {
            msisdn: msisdn,
          },
        ],
      },
      {
        core_type: 'Coupon',
      },
    ];

    if (programName) {
      queryMatchAnd.push({
        program_name: programName,
      });
    }

    if (keywordName) {
      queryMatchAnd.push({
        keyword: keywordName,
      });
    }

    query.push({
      $match: {
        $and: queryMatchAnd,
      },
    });

    const datas = await this.injectCouponModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    return datas;
  }

  async couponAmountPerKeyword(msisdn, programName, keywordName) {
    return await this.couponAmountPerProgram(msisdn, programName, keywordName);
  }
}
