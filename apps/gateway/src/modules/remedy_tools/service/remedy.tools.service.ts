import { CallApiConfig } from '@configs/call-api.config';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import {
  TransactionMaster,
  TransactionMasterDocument,
} from '@transaction_master/models/transaction_master.model';
import { plainToInstance } from 'class-transformer';
import * as moment from 'moment';
import mongoose, { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';

import { Role } from '@/account/models/role.model';
import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import {
  allowedTselID,
  msisdnCombineFormatted,
  msisdnCombineFormatToId,
  removeByAttr,
} from '@/application/utils/Msisdn/formatter';
import { TimeManagement } from '@/application/utils/Time/timezone';
import { CrmbRequestBodyDto } from '@/crmb/dtos/crmb.request.body.dto';
import { MainCrmbService } from '@/crmb/services/main.crmb.service';
import { Customer } from '@/customer/models/customer.model';
import { CustomerService } from '@/customer/services/customer.service';
import { LovService } from '@/lov/services/lov.service';
import { MemberDto } from '@/remedy_tools/dto/member.dto';

const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');

@Injectable()
export class RemedyToolsService {
  private callApiConfigService: CallApiConfigService;

  private httpService: HttpService;
  private url: string;
  private raw_port: number;
  private branch: string;
  private realm: string;
  private merchant: string;
  private raw_core: string;

  private readonly COUPON_SUMMARY_CUTOFF: string = 'COUPON_SUMMARY_CUTOFF';
  private readonly COUPON_SUMMARY_METHOD: string = 'COUPON_SUMMARY_METHOD';

  constructor(
    callApiConfigService: CallApiConfigService,
    httpService: HttpService,
    private accountService: AccountService,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(ApplicationService)
    private readonly applicationService: ApplicationService,
    @Inject(LovService) private readonly lovService: LovService,
    @Inject('NOTIFICATION_GENERAL_PRODUCER')
    private readonly notificationClient: ClientKafka,
    private crmbService: MainCrmbService,
    @InjectModel(TransactionMaster.name)
    private transactionMasterModel: Model<TransactionMasterDocument>,
    private customerService: CustomerService,
  ) {
    this.callApiConfigService = callApiConfigService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.httpService = httpService;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
  }

  async getLogDetail(param): Promise<any> {
    const id = param.id ? parseInt(param.id) : 0;
    const model = param.model;
    return await model
      .findOne({
        _id: new mongoose.Types.ObjectId(id),
      })
      .exec();
  }

  async getLogPrimeOld(param): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const model = param.model;
    const query = [];
    const sort_set = {};
    const filter_builder = { $and: [], $or: [] };
    const filterSet = filters;
    const msisdn = filters?.msisdn?.value ?? '';
    const identifier = filters?.identifier?.value ?? '';
    const token = param.auth;

    let needOr = false;
    if (identifier === 'TSELID') {
      // integrate crmb
      const [checking, walletSibling] = await this.getWalletSiblingsFromCore(
        msisdn,
        token,
      );
      needOr = true;
      if (checking) {
        walletSibling.map((val) => {
          filter_builder.$or.push({
            msisdn: val,
          });
        });
      }
    }
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

        needOr = false;

        if (filterSet[a].matchMode === 'contains') {
          if (
            // TODO comment for tuning
            // a === 'body.msisdn' ||
            // a === 'customer.msisdn' ||
            a === 'msisdn'
          ) {
            needOr = true;
            // if msisdn not equals tsel_id
            if (identifier !== 'TSELID') {
              filter_builder.$or.push({
                msisdn: filterSet[a].value,
              });
            }
          } else if (a === 'created_at') {
            const date = new TimeManagement().getRangeDate(filterSet[a].value);
            autoColumn[a] = {
              $gte: new Date(date.start),
              $lt: new Date(date.end),
            };
          } else {
            autoColumn[a] = {
              $regex: filterSet[a].value,
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
          autoColumn[a] = {
            $eq: filterSet[a].value,
          };
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          };
        } else {
          if (needOr) {
            filter_builder.$or.push(autoColumn);
          } else {
            filter_builder.$and.push(autoColumn);
          }
        }
      }
    }

    if (filter_builder.$and.length === 0) {
      delete filter_builder.$and;
    } else {
      if (filter_builder.$and.length > 0) {
        filter_builder.$and = filter_builder.$and.filter(
          (person) => person.channel === undefined,
        );
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
    }

    if (filter_builder.$or.length === 0) {
      delete filter_builder.$or;
    } else {
      if (filter_builder.$or.length > 0) {
        query.push({
          $match: filter_builder,
        });
      } else {
        query.push({
          $match: {
            $or: [{ deleted_at: null }],
          },
        });
      }
    }

    console.log(query);

    const allNoFilter = await model.aggregate(
      [...query, { $count: 'all' }],
      (err, result) => {
        return result;
      },
    );

    query.push({ $skip: first });

    query.push({ $limit: rows });

    if (sortField && sortOrder) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }
    const data = await model.aggregate(query, (err, result) => {
      return result;
    });
    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length > 0 ? allNoFilter[0].all : 0,
        data: data,
      },
    };
  }

  async getLogPrime(param): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : -1;
    const filters = param.filters;
    const model = param.model;
    const query = [];
    const sort_set = {};
    const filter_builder = { $and: [] };
    const filterSet = filters;
    const msisdn = filters?.msisdn?.value ?? '';
    const identifier = filters?.identifier?.value ?? '';
    const token = param.auth;

    let needOr = false;
    if (identifier === 'TSELID' || allowedTselID(msisdn)) {
      // integrate crmb
      const [checking, walletSibling] = await this.getWalletSiblingsFromCore(
        msisdn,
        token,
      );
      needOr = true;
      const orMap = { $or: [] };

      if (checking) {
        // walletSibling.map((val) => `${msisdnCombineFormatted(val)}`).toString();

        await walletSibling.map((val) => {
          orMap.$or.push({
            msisdn: val,
          });
        });
      }

      if (orMap.$or.length > 0) {
        delete filterSet['msisdn']; // Remove msisdn so it won't filtered
        filter_builder.$and.push(orMap);
      }
    }

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
          if (a === 'created_at') {
            const date = new TimeManagement().getRangeDate(filterSet[a].value);
            autoColumn[a] = {
              $gte: new Date(date.start),
              $lt: new Date(date.end),
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

        if (a === 'created_at') {
          if (filterSet[a].start_date !== '' && filterSet[a].end_date !== '') {
            autoColumn[a] = {
              $gte: moment(filterSet[a].start_date).startOf('day').toDate(),
              $lte: moment(filterSet[a].end_date).endOf('day').toDate(),
            };
          } else {
            delete autoColumn['created_at'];
          }
        }

        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    }

    console.log(
      `\n\n\n\n\nCheck this filter for ${model.name.toString()} : ${JSON.stringify(
        filter_builder,
        null,
        2,
      )}`,
    );

    const allNoFilter = await model.aggregate(
      [...query, { $count: 'all' }],
      (err, result) => {
        return result;
      },
    );

    if (sortField && sortOrder) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    query.push({ $skip: first });

    query.push({ $limit: rows });

    console.log(query);

    const data = await model.aggregate(query, (err, result) => {
      return result;
    });
    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length > 0 ? allNoFilter[0].all : 0,
        data: data,
      },
    };
  }

  async getSmsLogPrime(param): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const model = param.model;
    const query = [];
    const sort_set = {};
    const filter_builder = { $and: [] };
    const filterSet = filters;
    const msisdn = filters?.msisdn?.value ?? '';
    const identifier = filters?.identifier?.value ?? '';
    const needOr = false;
    const token = param.auth;

    if (identifier === 'TSELID' || allowedTselID(msisdn)) {
      // integrate crmb
      const [checking, walletSibling] = await this.getWalletSiblingsFromCore(
        msisdn,
        token,
      );
      const orMap = { $or: [] };

      if (checking) {
        // walletSibling.map((val) => `${msisdnCombineFormatted(val)}`).toString();

        await walletSibling.map((val) => {
          orMap.$or.push({
            msisdn: val,
          });
        });
      }

      if (orMap.$or.length > 0) {
        delete filterSet['msisdn']; // Remove msisdn so it won't filtered
        filter_builder.$and.push(orMap);
      }
    }

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
          if (a === 'created_at') {
            const date = new TimeManagement().getRangeDate(filterSet[a].value);
            autoColumn[a] = {
              $gte: new Date(date.start),
              $lt: new Date(date.end),
            };
          } else if (a === 'masking_text') {
            autoColumn['request.text'] = {
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

        if (a === 'created_at') {
          if (filterSet[a].start_date !== '' && filterSet[a].end_date !== '') {
            autoColumn[a] = {
              $gte: moment(filterSet[a].start_date).startOf('day').toDate(),
              $lte: moment(filterSet[a].end_date).endOf('day').toDate(),
            };
          } else {
            delete autoColumn['created_at'];
          }
        }

        delete autoColumn['masking_text'];
        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      console.log(filter_builder.$and);
      query.push({
        $match: filter_builder,
      });
    }

    const allNoFilter = await model.aggregate(
      [...query, { $count: 'all' }],
      (err, result) => {
        return result;
      },
    );

    if (sortField && sortOrder) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    query.push({ $skip: first });

    query.push({ $limit: rows });

    console.log(query);

    const data = await model.aggregate(query, (err, result) => {
      return result;
    });
    if (data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        if (data[i]?.masking_text) {
          const voucher =
            data[i]?.masking_text[0]?.responseBody?.voucher_code ?? [];
          const voucherMasking = this.maskText(voucher, voucher.length);
          data[i].masking_text = data[i]?.request?.text?.replace(
            voucher,
            voucherMasking,
          );
        } else {
          // provide if masking []
          data[i].masking_text = data[i]?.request?.text;
        }
      }
    }
    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length > 0 ? allNoFilter[0].all : 0,
        data: data,
      },
    };
  }

  async getRole(roleId: string) {
    const data = await this.roleModel
      .findOne({ parent: new mongoose.Types.ObjectId(roleId) })
      .exec();
    return data;
  }

  async getSubscriberInfoPrime(param: any): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const filters = param.filters;
    const msisdn = filters?.msisdn?.value ?? '';
    const identifier = filters?.identifier?.value ?? '';
    const auth = param.auth;

    // process with tsel_id
    if (identifier === 'TSELID') {
      // integrate crmb
      const [checking, walletSibling] = await this.getWalletSiblingsFromCore(
        msisdn,
        auth,
      );
      if (checking) {
        const msisdnList = walletSibling
          .map((val) => `${msisdnCombineFormatted(val)}%7CID%7C%2B62`)
          .toString()
          .replaceAll(',', '%7C%7C');
        return await this.getCoreMember({
          all: true,
          queryParams: {
            msisdn: msisdnList,
            merchant_id: this.configService.get<string>(
              'core-backend.merchant.id',
            ),
          },
          auth: auth,
        });
      }
    }

    const msisdnReplaced = msisdnCombineFormatted(msisdn);
    const memberDetail = await this.getCoreMember({
      queryParams: {
        msisdn: `${msisdnReplaced}%7CID%7C%2B62`,
        merchant_id: this.configService.get<string>('core-backend.merchant.id'),
      },
      auth: auth,
    });

    console.log('memberDetail', memberDetail);

    // get sistem config
    const is_ngix_cache = await this.applicationService.getConfig(
      CallApiConfig.NGINX_CACHE,
    );

    if (
      is_ngix_cache &&
      memberDetail?.message === HttpStatus.OK &&
      memberDetail?.payload?.totalRecords > 0
    ) {
      const lovDataBucketType =
        await this.lovService.getLovDetailByGroupAndValue(
          'POINT_TYPE',
          'TelkomselPOIN',
        );
      console.log('lovDataBucketType', lovDataBucketType);

      const rwditmId = lovDataBucketType?.additional.split('|')[1];
      console.log('rwditmId', rwditmId);

      // override value lifetime.remaining_reward
      const wallet = await this.customerService.getCoreWalletCustomer(
        memberDetail?.payload?.data[0]?.id,
        auth,
        this.merchant,
      );
      console.log('wallet', JSON.stringify(wallet));
      if (wallet?.payload) {
        const balance = wallet['payload']['wallet']['pocket']['reward'][
          rwditmId
        ]['total']
          ? wallet['payload']['wallet']['pocket']['reward'][rwditmId]['total']
          : null;
        if (balance) {
          memberDetail.payload.data[0].lifetime_value.remaining_reward =
            balance;
        }
      }
    }

    return memberDetail;
  }

  async getCoreMember(param: any): Promise<any> {
    const queryParams = param.queryParams;
    const auth = param.auth;
    const url_old = `${this.url}/members?merchant_id=${queryParams.merchant_id}&addon={"accum":1}&filter=%7B%22phone%22%3A%22${queryParams.msisdn}%7CID%7C%2B62%22%7D`;
    return await lastValueFrom(
      await this.httpService
        .get(
          `${this.url}/members?customer_type=Member&addon={"accum.prepaid":1,"accum.postpaid":1, "accum.earn":1,"accum.redeem":1}&merchant_id=${queryParams.merchant_id}&filter=%7B%22phone%22%3A%22${queryParams.msisdn}%22%7D`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: auth,
            },
          },
        )
        .pipe(
          map(async (res) => {
            const memberCore = res.data.payload.members[0]?.result
              ? param.all
                ? res.data.payload.members[0]?.result
                : res.data.payload.members[0]?.result[0]
              : null;

            const allMembers = [];

            if (param.all) {
              if (memberCore) {
                memberCore.map((a) => {
                  const singleMember = plainToInstance(MemberDto, a);
                  singleMember.calculateAccum();
                  allMembers.push(singleMember);
                });
              }

              return {
                message: HttpStatus.OK,
                payload: {
                  totalRecords: res.data.payload.members[0].total[0].count,
                  data: allMembers ? allMembers : [],
                },
              };
            } else {
              const members = plainToInstance(MemberDto, memberCore);

              if (memberCore) {
                members.calculateAccum();
              }

              return {
                message: HttpStatus.OK,
                payload: {
                  totalRecords: res.data.payload.members[0].total[0].count,
                  data: members ? [members] : [],
                },
              };
            }
          }),
          catchError(async (err: any) => {
            const responseDataError = err.response.data;
            return {
              message: HttpStatus.FOUND,
              payload: responseDataError,
            };
          }),
        ),
    );
  }

  async resendSms(payload): Promise<any> {
    try {
      const notificationPayload = {
        origin: 'cron.notification_general',
        tracing_id: false,
        tracing_master_id: false,
        notification: [
          {
            via: 'SMS',
            template_content: payload?.text,
            param: {
              msisdn: payload?.to,
            },
          },
        ],
      };
      this.notificationClient.emit(
        process.env.KAFKA_NOTIFICATION_GENERAL_TOPIC,
        notificationPayload,
      );
      return { status: HttpStatus.OK, message: 'Success' };
    } catch (e) {
      console.log('error emit to notification general', e);
    }
  }

  async getTransactionHistoryPrime(param: any): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const filters = param.filters;
    const auth = param.auth;
    const moment = require('moment-timezone');

    const filterMap = {};

    filters?.msisdn?.value ? (filterMap['phone'] = filters?.msisdn?.value) : '';
    filters?.member_id?.value
      ? (filterMap['member_id'] = filters?.member_id?.value)
      : '';

    filters?.status?.value
      ? (filterMap['status'] = filters?.status?.value)
      : '';
    filters?.transaction_no?.value
      ? (filterMap['transaction_no'] = filters?.transaction_no?.value)
      : '';
    filters?.type?.value ? (filterMap['tyoe'] = filters?.type?.value) : '';
    filters?.action?.value
      ? (filterMap['action'] = filters?.action?.value)
      : '';
    filters?.channel?.value
      ? (filterMap['channel'] = filters?.channel?.value)
      : '';

    const queryParams = {
      from:
        filters?.from?.value ??
        moment().subtract(3, 'month').format('YYYY-MM-DD'),
      to: filters?.to?.value ?? moment().format('YYYY-MM-DD'),
      merchant_id: this.configService.get<string>('core-backend.merchant.id'),
      filter: filterMap,
      limit: rows,
      skip: first,
    };

    if (filters?.time?.value) {
      queryParams.from = moment(filters?.time?.value).format('YYYY-MM-DD');
      queryParams.to = moment(filters?.time?.value).format('YYYY-MM-DD');
    }

    if (filters?.create_time?.start_date || filters?.create_time?.end_date) {
      queryParams.from = moment(filters?.create_time?.start_date).format(
        'YYYY-MM-DD',
      );
      queryParams.to = moment(filters?.create_time?.end_date).format(
        'YYYY-MM-DD',
      );
    }

    return await this.getTransactionCore({
      queryParams,
      auth: auth,
    });
  }

  async getTransactionCore(param: any): Promise<any> {
    const queryParams = param.queryParams;
    console.log(queryParams);
    const auth = param.auth;
    return await lastValueFrom(
      await this.httpService
        .get(
          `${this.url}/transactions?addon={"member_id":1, "remark" : 1, "create_time": 1}&sort={"create_time": -1}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: auth,
            },
            params: queryParams,
          },
        )
        .pipe(
          map(async (res) => {
            console.log(JSON.stringify(res.data.payload.members));
            return {
              message: HttpStatus.OK,
              payload: {
                totalRecords: res.data.payload.transactions[0].total[0].count,
                data: res.data.payload.transactions[0].result ?? [],
              },
            };
          }),
          catchError(async (err: any) => {
            const responseDataError = err.response.data;
            return {
              message: HttpStatus.FOUND,
              payload: responseDataError,
            };
          }),
        ),
    );
  }

  private maskText(text: string, length: number): string {
    return text?.replace(
      new RegExp(`.{${length}}$`),
      [...Array(length).keys()].map(() => 'X').join(''),
    );
  }

  async integrateCRMB(tselId: string): Promise<any> {
    // payload crmb
    const integratePayload: CrmbRequestBodyDto = {
      channel: 'A6',
      timestamp: new Date().toISOString(),
      transactionId: 'TRX_xxx',
      tselId: tselId,
    };
    const getSiblingWallet = await this.crmbService.getTselIdBindingsGrouped(
      integratePayload,
    );
    const resList = getSiblingWallet?.payload?.TSELSSOServicesTypeList;
    return (
      resList
        ?.map((i) => i.TSELSSOServicesList?.map((k) => k.serviceId))
        .flat(1) ?? []
    );
  }

  getWalletSiblingsFromCore(tsel_id: string, token: string): any {
    return new Promise(async (resolve) => {
      return await this.crmbService
        .getWalletSiblingsFromCoreMember(tsel_id, token)
        .then(async (results) => {
          if (results.payload === undefined) {
            resolve([false, 'Payload is undefined']);
          }
          if (results.message !== 'Success') {
            resolve([false, results.message]);
          }
          const responsePayload = [];
          resolve([
            true,
            results.payload.members[0].result
              .map((memberData) => {
                if (memberData) {
                  const msisdn = memberData.phone ?? '';
                  const reformatMsisdn = msisdnCombineFormatToId(
                    msisdn.split('|')[0],
                  );
                  responsePayload.push(reformatMsisdn);
                } else {
                  console.log('<-- fail : get member -->');
                  return [false, 'Member is empty'];
                }
              })
              .reduce(() => responsePayload),
          ]);
        })
        .catch((e) => {
          resolve([false, e.message]);
        });
    });
  }

  async getTransactionLogPrime(param: any): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : -1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};
    const filter_builder = { $and: [] };
    const filterSet = filters;
    const msisdn = filters?.msisdn?.value ?? '';
    const identifier = filters?.identifier?.value ?? '';
    const token = param.auth;

    if (identifier === 'TSELID' || allowedTselID(msisdn)) {
      // integrate crmb
      const [checking, walletSibling] = await this.getWalletSiblingsFromCore(
        msisdn,
        token,
      );
      const orMap = { $or: [] };

      if (checking) {
        // walletSibling.map((val) => `${msisdnCombineFormatted(val)}`).toString();

        await walletSibling.map((val) => {
          orMap.$or.push({
            msisdn: val,
          });
        });
      }

      if (orMap.$or.length > 0) {
        delete filterSet['msisdn']; // Remove msisdn so it won't filtered
        filter_builder.$and.push(orMap);
      }
    }

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
          if (a === 'created_at') {
            const date = new TimeManagement().getRangeDate(filterSet[a].value);
            autoColumn[a] = {
              $gte: new Date(date.start),
              $lt: new Date(date.end),
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

        if (a === 'created_at') {
          if (filterSet[a].start_date !== '' && filterSet[a].end_date !== '') {
            autoColumn[a] = {
              $gte: moment(filterSet[a].start_date).startOf('day').toDate(),
              $lte: moment(filterSet[a].end_date).endOf('day').toDate(),
            };
          } else {
            delete autoColumn['created_at'];
          }
        }

        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      console.log(filter_builder.$and);
      query.push({
        $match: filter_builder,
      });
    }

    console.log(query);

    query.push({
      $project: {
        transaction_id: 1,
        msisdn: 1,
        bonus: 1,
        status: 1,
        error_desc: 1,
        keyword: 1,
        poin: 1,
        channel_id: 1,
        type: 1,
        created_at: 1,
        updated_at: 1,
        origin: 1,
      },
    });

    const allNoFilter = await this.transactionMasterModel.aggregate(
      [...query, { $count: 'all' }],
      (err, result) => {
        return result;
      },
    );

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    query.push({ $skip: first });

    query.push({ $limit: rows });

    const data = await this.transactionMasterModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    // console.log(data);
    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length > 0 ? allNoFilter[0].all : 0,
        data: data,
      },
    };
  }

  /**
   * @method getConfigCutOff digunakan ketika perlu ada cuctoff data.
   * @param configCutOff 
   * @returns 
   */
  private async getConfigCutOff(configCutOff: string) : Promise<{isCutOff,cutOffDate }> {
    const cutOff = await this.applicationService.getConfig(
      configCutOff,
    );
    return {
      isCutOff : cutOff ? true: false,
      cutOffDate : cutOff ? moment(cutOff).utc() : null
    }
  }

  /**
   * get log prime when need read cutoff get data from core to db reproting
   * @param payload 
   * @returns 
   */
  async getCutofftoSummaryData(payload : {
    model_coupon, model_coupon_summary, param
  }) {
      // Data catoff switch can be made, but at this time it is not needed.
      const  { model_coupon, model_coupon_summary, param } = payload;
      param.model = model_coupon_summary;
      return await this.getLogPrime(param);
  }
}
