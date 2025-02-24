import { CallApiConfig } from '@configs/call-api.config';
import {
  DeductPoint,
  DeductPointDocument,
} from '@deduct/models/deduct.point.model';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { formatIndihomeCore } from '@utils/logger/formatters';
import { AxiosRequestConfig } from 'axios';
import * as moment from 'moment';
import * as moment_tz from 'moment-timezone';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';

import { Account } from '@/account/models/account.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import {
  allowedIndihomeNumber,
  checkCustomerIdentifier,
  formatIndihomeNumberCore,
  formatMsisdnCore,
  msisdnCombineFormatted,
  msisdnCombineFormatToId,
  validateCustomerIdentifierNumber,
} from '@/application/utils/Msisdn/formatter';
import { findProp } from '@/application/utils/NestedObject/findProp';
import { CrmbRequestBodyDto } from '@/crmb/dtos/crmb.request.body.dto';
import { MainCrmbService } from '@/crmb/services/main.crmb.service';
import { CustomerMemberDto } from '@/customer/dto/customer.member.dto';
import { Customer, CustomerDocument } from '@/customer/models/customer.model';
import { CustomerService } from '@/customer/services/customer.service';
import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { KeywordService } from '@/keyword/services/keyword.service';
import { LovService } from '@/lov/services/lov.service';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { FmcIdenfitiferType } from '@/transaction/dtos/point/fmc.member.identifier.type';
import {
  ViewPointHistoryFMCParamDTO as ViewPointHistoryParamDTO,
  ViewPointHistoryFMCQueryDTO as ViewPointHistoryQueryDTO,
} from '@/transaction/dtos/point/point.fmc.dto';
import { TransferPointDto } from '@/transaction/dtos/point/transfer/transfer.point.dto';
import {
  InjectCoupon,
  InjectCouponDocument,
} from '@/transaction/models/inject.coupon.model';
import {
  RefundPoint,
  RefundPointDocument,
} from '@/transaction/models/point/refund.point.model';
import {
  Voucher,
  VoucherDocument,
} from '@/transaction/models/voucher/voucher.model';

import { TransactionOptionalService } from '../../config/transaction-optional.service';

@Injectable()
export class PointFmcService {
  private httpService: HttpService;
  private url: string;
  private tsel_url: string;
  private realm: string;
  private branch: string;

  private merchant: string;
  private customerService: CustomerService;
  private lovService: LovService;
  private keywordService: KeywordService;
  private programService: ProgramServiceV2;
  private mainCrmbService: MainCrmbService;

  constructor(
    @InjectModel(InjectCoupon.name)
    private injectCouponModel: Model<InjectCouponDocument>,
    @InjectModel(Voucher.name)
    private voucherModel: Model<VoucherDocument>,
    @InjectModel(RefundPoint.name)
    private refundPointModel: Model<RefundPointDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(DeductPoint.name)
    private deductPointModel: Model<DeductPointDocument>,
    @Inject(ApplicationService)
    private readonly applicationService: ApplicationService,
    @Inject('INJECT_POINT_SERVICE_PRODUCER')
    private readonly clientInjectKafka: ClientKafka,
    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,
    httpService: HttpService,
    configService: ConfigService,
    customerService: CustomerService,
    lovService: LovService,
    keywordService: KeywordService,
    programService: ProgramServiceV2,
    private transactionOptional: TransactionOptionalService,
    private readonly callApiConfigService: CallApiConfigService,
    mainCrmbService: MainCrmbService,
  ) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.tsel_url = `${configService.get<string>('tsel-core-backend.api.url')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.customerService = customerService;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.lovService = lovService;
    this.programService = programService;
    this.mainCrmbService = mainCrmbService;
    this.keywordService = keywordService;
  }

  /**
   * This function will selected and validation data
   * like keyword, program, customer and params reward_item_id, reward_instance_id from lov
   * This function can be used by inject and deduct
   * @param request mandatory, params from body
   * @param token optional
   */
  async getSelectedData(request: any, token = '', except = {}) {
    const startTime = Date.now();
    try {
      let additional, point_type, keyword, customer;
      const data = {
        message: '',
        msg_error_system: '',
        reward_item_id: '',
        reward_instance_id: '',
        status: false,
        keyword: {},
        program: {},
        customer: null,
        customer_core: null,
        code: null,
        is_keyword_registration: false,
        member_id: null,
        http_status: null,
        balance: 0,
        __v: 0,
      };

      console.log('Preparing data for selected transaction');
      console.log(request);
      console.log('=========================================================');

      const checkIdentifier = checkCustomerIdentifier(request.msisdn);

      return new Promise(async (resolve, reject) => {
        /*
            Condition to get data keyword
          */
        if (request.keyword && request.program_id) {
          console.log('req keyword & program_id active');
          keyword = await this.keywordService
            .getKeywordWhere({
              'eligibility.name': request.keyword,
              'eligibility.program_id': request.program_id,
            })
            .catch((e) => {
              console.log(`Keyword get error : ${e}`);
            });

          //   if (!keyword) {
          //     throw new BadRequestException([
          //       { isNotFound: 'Keyword not found with condition  params keyword & program_id' },
          //     ]);
          //   }

          console.log('stoped keyword and program ');

          if (!keyword) {
            data.code = HttpStatusTransaction.ERR_KEYWORD_NOT_FOUND;
            data.message =
              'Keyword not found with condition  params keyword & program_id';
            console.log(data);
            reject(data);
          }
        } else if (request.keyword) {
          // Check param keyword is not empty
          // console.log('req keyword active');
          // keyword = await this.keywordService.getKeywordWhere({
          //   'eligibility.name': request.keyword,
          // });
          keyword = await this.keywordService.findKeywordByNameWithRedis(
            request.keyword,
          );

          if (!keyword) {
            //SINI UNTUK KEYWORD REGISTRATION - TANAKA
            await this.programService
              .getProgramByKeywordRegistration(request.keyword)
              .then(async (rsp) => {
                if (rsp) {
                  if (except['customer']) {
                    const reformatMsisdn = msisdnCombineFormatted(
                      request.msisdn,
                    ); // check_member_core
                    if (reformatMsisdn && token) {
                      customer = await this.customerService
                        .getCustomerByMSISDN(reformatMsisdn, token)
                        .then(async (customerDetail) => customerDetail);
                      if (customer) {
                        data.customer = customer;
                      } else {
                        data.message = 'Customer not registered';
                        // reject(data);
                      }

                      // Check member core
                      const checkMisdnFromCore = await this.customerService
                        .getCoreMemberByMsisdn(reformatMsisdn, token)
                        .then(async (coreDetail) => coreDetail)
                        .catch((e) => {
                          console.log('Goes Here 3');
                          console.log('checkMisdnFromCore', e);
                        });

                      if (checkMisdnFromCore) {
                        data.customer_core = checkMisdnFromCore;
                      } else {
                        data.message = 'Customer on core not registered';
                        // reject(data);
                      }
                    }
                  }

                  const lov = await this.lovService.getLovData(rsp.point_type);
                  const lovSP = lov.additional.split('|');
                  data.reward_instance_id = lovSP[0];
                  data.reward_item_id = lovSP[1];
                  data.is_keyword_registration = true;
                  const NO_RULE = await this.applicationService.getConfig(
                    'PROGRAM_NO_RULE_MECHANISM',
                  );
                  // data.program = { ...rsp?._doc, program_mechanism: NO_RULE };
                  data.program = { ...rsp, program_mechanism: NO_RULE }; // edited by Rifqi
                  data.keyword = {
                    eligibility: {
                      name: request.keyword,
                      start_period: rsp.start_period,
                      end_period: rsp.end_period,
                      program_experience: [],
                      keyword_type: '',
                      point_type: rsp.point_type,
                      poin_value: 'Fixed',
                      poin_redeemed: rsp.point_registration,
                      channel_validation: false,
                      channel_validation_list: [],
                      eligibility_locations: false,
                      locations: [],
                      program_title_expose: rsp.name,
                      merchant: this.merchant,
                      program_id: rsp._id,
                      merchandise_keyword: false,
                      keyword_schedule: 'Daily',
                      program_bersubsidi: false,
                      total_budget: 0,
                      customer_value: 0,
                      multiwhitelist: false,
                      multiwhitelist_program: '',
                      enable_sms_masking: false,
                      sms_masking: '',
                      timezone: '',
                      for_new_redeemer: false,
                      max_mode: '',
                      max_redeem_counter: 0,
                      segmentation_customer_tier: [],
                      segmentation_customer_los_operator: '',
                      segmentation_customer_los_max: 0,
                      segmentation_customer_los_min: 0,
                      segmentation_customer_los: 0,
                      segmentation_customer_type: '',
                      segmentation_customer_most_redeem: [],
                      segmentation_customer_brand: [],
                      segmentation_customer_prepaid_registration: false,
                      segmentation_customer_kyc_completeness: false,
                      segmentation_customer_poin_balance_operator: '',
                      segmentation_customer_poin_balance: 0,
                      segmentation_customer_poin_balance_max: 0,
                      segmentation_customer_poin_balance_min: 0,
                      segmentation_customer_preference: '',
                      segmentation_customer_arpu_operator: '',
                      segmentation_customer_arpu: 0,
                      segmentation_customer_arpu_min: 0,
                      segmentation_customer_arpu_max: 0,
                      segmentation_customer_preferences_bcp: '',
                      location_type: rsp.program_owner,
                      keyword_shift: [],
                      bcp_app_name: '',
                      bcp_app_name_operator: '',
                      bcp_app_category: '',
                      bcp_app_category_operator: '',
                    },
                    created_by: rsp.created_by,
                    bonus: [
                      {
                        bonus_type: 'void',
                        stock_location: [],
                      },
                    ],
                    notification: rsp.program_notification,
                  };
                } else {
                  data.message = 'Failed, Data keyword is not found';
                  console.log(data);
                  reject(data);
                }
              })
              .catch((err) => {
                console.error(
                  'Keyword not found with condition  params keyword.',
                );
                data.msg_error_system = err?.message;
                data.message = 'Failed, Data keyword is not found';
                console.log(data);
                reject(data);
              });
            // data.code = HttpStatusTransaction.ERR_KEYWORD_NOT_FOUND;
            // data.message = 'Keyword not found with condition params keyword';
            // reject(data);
          } else {
            data.code = HttpStatusTransaction.CODE_SUCCESS;
          }
        } else if (request.program_id) {
          // Check param program_id is not empty
          console.log('req program_id active');
          keyword = await this.keywordService.getKeywordByName({
            'eligibility.program_id': request.program_id,
          });

          if (!keyword) {
            data.message = 'und with condition params program_id';
            console.log(data);
            reject(data);
          }
        }

        // Keyword is exsist
        if (keyword) {
          data.code = HttpStatusTransaction.CODE_SUCCESS;
          // set data keyword
          data.keyword = keyword;

          // check param point_type on keyword exsist
          if (keyword.eligibility.point_type) {
            //set to variavel point_type
            point_type = keyword.eligibility.point_type.toString();
          }

          /*
              Call data program and set point type from data program if param keyword.eligibility.point_type is not exist
            */
          await this.programService
            // .getProgramByID(keyword.eligibility.program_id)
            .findProgramByIdWithRedis(keyword.eligibility.program_id)
            .then((rsp) => {
              if (rsp.point_type) {
                data.program = rsp;
                // Checking value from  param keyword.eligibility.point_type is not exist
                if (
                  !keyword.eligibility.point_type ||
                  keyword.eligibility.point_type == ''
                ) {
                  // set point_type from data program
                  point_type = rsp.point_type.toString();
                }
              } else {
                console.log('cek program stoped');
                data.code = HttpStatusTransaction.ERR_NOT_FOUND;
                data.message = 'Program not have point type';
                reject(data);
              }
            })
            .catch((err) => {
              console.log('cek program stoped');
              data.code = HttpStatusTransaction.ERR_NOT_FOUND;
              data.msg_error_system = err?.message;
              data.message = 'Failed, Data program is not found';
              console.log(data);
              reject(data);
            });

          /*
                Call data lov to get params reward_item_id &  reward_instance_id
             */
          const lov = await this.lovService.getLovData(point_type);

          // Check data lov
          if (!lov) {
            data.code = HttpStatusTransaction.ERR_NOT_FOUND;
            data.message = 'Lov is not found with condition params point_type';
            console.log(data);
            reject(data);
          } else {
            // Checking params additional in lov
            if (!lov.additional) {
              data.code = HttpStatusTransaction.ERR_NOT_FOUND;
              data.message = 'Params additional in lov is empty';
              console.log(data);
              reject(data);
            }

            // split params additional to get reward_item_id &  reward_instance_id
            additional = lov.additional ? lov.additional.split('|') : false;

            // Check lov and params additional exsist
            if (lov && additional) {
              // set data reward_item_id & reward_instance_id and change status true, that's condistion
              if (!additional[1]) {
                data.message = 'Params reward_item_id not found';
                console.log(data);
                reject(data);
              }

              data.reward_item_id = additional[1];
              data.reward_instance_id = additional[0];
              data.status = true;
            } else {
              data.message =
                'Params reward_item_id & reward_instance_id is not found';
              console.log(data);
              reject(data);
            }
          }

          /*
                Get data customer by condition msisdn
             */
          if (except['customer']) {
            if (checkIdentifier.isValid && token) {
              const reformatMsisdn =
                checkIdentifier.type == FmcIdenfitiferType.MSISDN
                  ? formatMsisdnCore(checkIdentifier.custNumber)
                  : formatIndihomeCore(checkIdentifier.custNumber);
              customer = await this.customerService
                .getCustomerByMSISDN(reformatMsisdn, token)
                .then(async (customerDetail) => customerDetail)
                .catch((e) => {
                  console.log(`Customer not found with error : ${e}`);
                  console.log(e);
                  console.log(
                    '=====================================================',
                  );
                });
              if (customer) {
                data.customer = customer;
                console.log(customer);
              } else {
                data.message = 'Customer not registered';
                // reject(data);
              }

              // Check member core
              // TODO : For what?
              const checkMisdnFromCore = await this.customerService
                .getCoreMemberByMsisdn(reformatMsisdn, token, '', false)
                .then(async (coreDetail) => coreDetail)
                .catch((e) => {
                  console.log('checkMisdnFromCore', e);
                });

              if (checkMisdnFromCore) {
                data.customer_core = checkMisdnFromCore;
                console.log(checkMisdnFromCore);
              } else {
                data.message = 'Customer on core not registered';
                // reject(data);
              }
            }
          } else {
            // console.log('get customer not allowed');
          }

          if (except['wallet'] || except['check_balance']) {
            try {
              let reformatMsisdn = '';
              if (checkIdentifier.isValid && token) {
                reformatMsisdn =
                  checkIdentifier.type == FmcIdenfitiferType.MSISDN
                    ? formatMsisdnCore(checkIdentifier.custNumber)
                    : formatIndihomeCore(checkIdentifier.custNumber);
              }

              const check_member: any =
                await this.customerService.check_member_core(
                  reformatMsisdn,
                  token,
                  data.reward_item_id,
                );

              data.member_id = check_member?.member_core_id;
              data.__v = check_member.__v;
              data.balance = check_member.balance;
            } catch (data_fail) {
              console.log('<-- fatal :: fail check member core -->');

              data.member_id = data_fail?.member_core_id;

              console.log(data_fail);
            }

            if (except['check_balance']) {
              // Check balance
              const point_balance = data.balance;
              // const amount = validationKeywordPointValueRule(request.total_point);
              const amount = request?.total_point ?? 0;
              if (point_balance) {
                if (amount > point_balance) {
                  const logMessage = `Point balance not enough, current balance ${point_balance}, poin redeemed ${amount}`;

                  data.status = false;
                  data.message = 'Point balance not enough';
                  data.msg_error_system = logMessage;
                  data.http_status = 'isInsufficientPoint';
                  data.code = HttpStatusTransaction.ERR_INSUFFICIENT_POINTS;
                  console.log(data);
                  reject(data);
                }
              } else {
                console.log('send notif point balance not found or undefined');
                const logMessage = `Point balance not found, poin redeemed ${amount}, balance (${point_balance})`;

                data.status = false;
                data.message = 'Point balance not enough';
                data.msg_error_system = logMessage;
                data.http_status = 'isInsufficientPoint';
                data.code = HttpStatusTransaction.ERR_INSUFFICIENT_POINTS;
                console.log(data);
                reject(data);
              }
            }
          }
        }

        /*
              return response success
           */
        console.log(
          `PO00110011 - Point service data preparation speed test : ${
            Date.now() - startTime
          }`,
        );
        resolve(data);
      });
    } catch (e) {
      console.log(e);
    }
  }

  minDateMonth(month) {
    // Dapatkan tanggal saat ini
    const date = new Date();

    // Kurangi jumlah bulan yang diberikan ke tanggal saat ini
    date.setMonth(date.getMonth() - month);

    // Kembalikan tanggal yang telah ditambahkan bulannya
    return date;
  }

  getISODate(date) {
    // Dapatkan tahun, bulan, dan hari dari tanggal yang diberikan
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Format tanggal menjadi YYYY-MM-DD
    const isoDate =
      year +
      '-' +
      month.toString().padStart(2, '0') +
      '-' +
      day.toString().padStart(2, '0');

    // Kembalikan tanggal dalam format YYYY-MM-DD
    return isoDate;
  }

  getServiceIdsFromTselID(tsel_id: string, queryDto: any): any {
    return new Promise(async (resolve) => {
      const bindingQuery = new CrmbRequestBodyDto();
      bindingQuery.tselId = tsel_id;
      bindingQuery.channel = queryDto.channel_id ?? '';
      bindingQuery.transactionId = queryDto.transaction_id ?? '';
      bindingQuery.intRef = 'SSOGetTselIdBindings';
      bindingQuery.timestamp = moment(new Date()).format(
        'YYYYMMDD HH:mm:ss:SSS',
      );
      bindingQuery.userId = '';
      return await this.mainCrmbService
        .getTselIdBindingsGrouped(bindingQuery)
        .then(async (results) => {
          console.log('results');
          console.log(results);
          if (results.payload === undefined) {
            return [false, 'Payload is undefined'];
          }

          if (results.message !== 'Success') {
            return [false, results.message];
          }
          console.log("results.payload['TSELSSOServicesTypeList']");
          console.log(results.payload.TSELSSOServicesTypeList);
          console.log(results.payload);
          resolve([
            true,
            results.payload.TSELSSOServicesTypeList.map((a) => {
              return a.TSELSSOServicesList;
            })
              .flat()
              .map((b) => {
                return b.serviceId;
              })
              .sort()
              .filter((item, pos, arr) => {
                return !pos || item != arr[pos - 1]; //filter duplicate
              }),
          ]);
        })
        .catch((e) => {
          console.log('apa kesini ?');
          console.log(e.response);
          console.log(e.message);
          resolve([false, e.message]);
        });
    });
  }

  getPointBalanceWithTselId(
    tsel_id: string,
    queryDto: any,
    token: string,
  ): any {
    return new Promise(async (resolve) => {
      return await this.mainCrmbService
        .getWalletSiblingsFromCoreMember(tsel_id, token)
        .then(async (results) => {
          console.log('results');
          console.log(results);
          if (results.payload === undefined) {
            resolve([false, 'Payload is undefined']);
          }

          if (results.message !== 'Success') {
            resolve([false, results.message]);
          }
          const lovDataBucketType = await this.lovService.findLov({
            group_name: 'POINT_TYPE',
            set_value: queryDto.bucket_type ?? 'TelkomselPOIN',
          });

          const rwditmId = lovDataBucketType[0]?.additional.split('|')[1];

          const responsePayload = [];
          const coreData = results.payload.members[0].result;
          for (const memberData of coreData) {
            if (memberData) {
              const wallet = memberData.wallet;
              const msisdn = memberData.phone ?? '';
              const reformatMsisdn = msisdnCombineFormatToId(
                msisdn.split('|')[0],
              );
              const listOfPoint = [];
              const rwditm = wallet.pocket.reward[rwditmId] ?? {};
              const amount = findProp(rwditm, 'amount', []);
              const expireDate = findProp(rwditm, 'expire_time', []);

              for (let i = 0; i < amount.length; i++) {
                const dateString = expireDate[i];
                const date = moment.utc(dateString);
                const wibTime = moment_tz.tz(date, 'Asia/Jakarta');
                listOfPoint.push({
                  total_point: amount[i],
                  expired_date: expireDate[i]
                    ? wibTime.format('YYYY-MM-DD')
                    : expireDate[i],
                });
              }
              responsePayload.push({
                list_of_point: listOfPoint,
                msisdn: reformatMsisdn,
                // tier: memberData['tier']
                //   ? memberData['tier']['current']['name']
                //   : 'New',
                tier:
                  memberData['tier'] ??
                  (await this.applicationService.getConfig(
                    'DEFAULT_CUSTOMER_TIER',
                  )),
                brand: memberData['brand'] ?? '',
                bucket_type: queryDto.bucket_type
                  ? queryDto.bucket_type
                  : 'TelkomselPOIN',
                bucket_id: 50000,
                ownership: memberData['ownership_flag'] ?? '',
                binding_level: memberData['binding_level'] ?? '',
              });
            }
          }
          resolve([true, responsePayload]);
        })
        .catch((e) => {
          resolve([false, e.message]);
        });
    });
  }

  getMsisdnWithTselId(tsel_id: string, token: string): any {
    return new Promise(async (resolve) => {
      return await this.mainCrmbService
        .getWalletSiblingsFromCoreMember(tsel_id, token)
        .then(async (results) => {
          console.log('results');
          console.log(results);
          if (results.payload === undefined) {
            resolve([false, 'Payload is undefined']);
          }
          if (results.message !== 'Success') {
            resolve([false, results.message]);
          }
          const responsePayload = [];

          const coreData = results.payload.members[0].result;
          for (const memberData of coreData) {
            if (memberData) {
              const msisdn = memberData.phone ?? '';
              const reformatMsisdn = msisdnCombineFormatToId(
                msisdn.split('|')[0],
              );
              responsePayload.push({
                msisdn: reformatMsisdn,
                core_id: memberData?.id,
                ownership: memberData?.ownership_flag ?? '',
                binding_level: memberData?.binding_level ?? '',
              });
            }
          }
          resolve([true, responsePayload]);
        })
        .catch((e) => {
          resolve([false, e.message]);
        });
    });
  }

  async new_point_history_list(
    param: ViewPointHistoryParamDTO,
    query: ViewPointHistoryQueryDTO,
    token: string,
  ): Promise<any> {
    const moment_tz = require('moment-timezone');
    // console.log(
    //   'Start PointHistory - ' + now.format("YYYY-MM-DD HH:mm:ss'SSS"),
    // );
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;

    const idenfitierCheck = validateCustomerIdentifierNumber(
      param.msisdn,
      query.identifier,
    );

    if (!idenfitierCheck.isValid) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = idenfitierCheck.message;
      responseGlobal.payload = [
        {
          trace_id: false,
        },
      ];
      return responseGlobal;
    }

    if (query.limit < 0) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'Limit Must More Than 1';
      responseGlobal.payload = [
        {
          trace_id: false,
        },
      ];
      return responseGlobal;
    } else if (query.limit == 0) {
      const configLimit = await this.callApiConfigService.callConfig(
        'DEFAULT_LIMIT_PAGINATION',
      );
      query.limit = configLimit ? configLimit : 5;
    }

    if (query.skip < 0) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'Skip Must be a Non-Negative Number';
      responseGlobal.payload = [
        {
          trace_id: false,
        },
      ];
      return responseGlobal;
    }

    const skip = Number(query.skip ?? 0);
    const limit = Number(query.limit && query.limit != 0 ? query.limit : 5);

    let coreList = [];
    let crmbeValid = false;
    let message: any = '';
    if (query.identifier?.toUpperCase() == FmcIdenfitiferType.TSEL_ID) {
      [crmbeValid, message] = await _this.getMsisdnWithTselId(
        param.msisdn,
        token,
      );
      if (!crmbeValid) {
        responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
        responseGlobal.message = message;
        responseGlobal.payload = [
          {
            trace_id: false,
          },
        ];
        return responseGlobal;
      }
      coreList = [...message];
    } else {
      const reformatMsisdn = msisdnCombineFormatted(param.msisdn);
      await _this.customerService
        .getCoreMemberByMsisdn(reformatMsisdn, token, '', false)
        .then(async (customerDetail) => {
          if (customerDetail) {
            const core_id = customerDetail[0].id;
            const ownership = customerDetail[0]['ownership_flag'] ?? '';
            const binding_level = customerDetail[0]['binding_level'] ?? '';
            coreList.push({
              msisdn: param.msisdn,
              core_id: core_id,
              ownership: ownership,
              binding_level: binding_level,
            });
          } else {
            responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            responseGlobal.message = 'customer not found';
            responseGlobal.payload = [
              {
                trace_id: false,
              },
            ];
            return responseGlobal;
          }
        })
        .catch((e: Error) => {
          responseGlobal.code = HttpCodeTransaction.CODE_INTERNAL_ERROR_500;
          responseGlobal.message = e.message;
          responseGlobal.payload = [
            {
              trace_id: false,
            },
          ];
          return responseGlobal;
        });
    }
    let responsePayload = [];
    const promises = coreList.map(async (item) => {
      return new Promise(async (resolve) => {
        const core_id = item?.core_id;
        const fromDate = query.from
          ? query.from
          : this.getISODate(this.minDateMonth(3));
        const toDate = query.to ? query.to : this.getISODate(new Date());

        const lovList = await this.lovService.getLovDetailByGroupName(
          'POINT_TYPE',
        );

        let filter = `"member_id":"${core_id}"`;

        if (query.bucket_type) {
          const mappingBucket = lovList.reduce((acc, item) => {
            acc[item.set_value] = item.additional;
            return acc;
          }, {});

          const getSetValue = (set_value) =>
            mappingBucket[set_value] || 'TelkomselPOIN';
          const inputString = getSetValue(query.bucket_type);

          const rewards = inputString.split('|');
          const reward_instance_value = rewards[0];
          const reward_item_value = rewards[1];

          filter =
            filter +
            `,"reward_item_id":"${reward_item_value}","reward_instance_id":"${reward_instance_value}"`;
        }
        if (query.type) {
          const typeQuery =
            query.type[0]?.toUpperCase() +
            query.type.substring(1).toLowerCase();
          if (typeQuery !== 'All') {
            filter =
              filter +
              `,"type":"${
                typeQuery === 'Inject'
                  ? 'Earning||Refund'
                  : typeQuery === 'Redeem'
                  ? 'Redemption'
                  : typeQuery
              }"`;
          }
        }

        if (query.filter) {
          try {
            const resultFilter = JSON.parse(query.filter);
            const filterOutput = Object.keys(resultFilter)
              .map(
                (key) =>
                  `"${key === 'transaction_id' ? 'transaction_no' : key}":"${
                    resultFilter[key]
                  }"`,
              )
              .join(',');
            console.log(filterOutput, 'filterOutput');
            filter = filter + `,${filterOutput}`;
          } catch (error) {
            responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            responseGlobal.message = error.message;
            responseGlobal.payload = [
              {
                trace_id: false,
              },
            ];
            return responseGlobal;
          }
        }

        const addon = {
          remark: 1,
          amount: 1,
          reward_item_id: 1,
          reward_instance_id: 1,
        };

        const sort = {
          create_time: -1,
        };

        const config: AxiosRequestConfig = {
          params: {
            from: fromDate,
            to: toDate,
            filter: `{${filter}}`,
            sort: JSON.stringify(sort),
            limit: limit,
            skip: skip,
            realm_id: this.realm,
            branch_id: this.branch,
            addon: JSON.stringify(addon),
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        };

        // const start = moment();
        // console.log(
        //   'Start PointHistory_GETLASTVALUE - ' +
        //     start.format("YYYY-MM-DD HH:mm:ss'SSS"),
        // );

        await lastValueFrom(
          this.httpService.get(`${this.url}/transactions`, config).pipe(
            map(async (response) => {
              // console.log(
              //   'NFT PointHistory_GETLASTVALUE - ' + moment().diff(start),
              // );

              const resp = response.data;
              const resPayload = resp.payload['transactions'][0];
              if (resp.code === 'S00000') {
                const total = resPayload['total'][0]['count'];
                const transactions = [];

                if (resPayload['result']) {
                  for (let i = 0; i < resPayload['result'].length; i++) {
                    const data = resPayload['result'][i];

                    const dateStringHistory = data['time'];
                    const dateHistory = moment.utc(dateStringHistory);
                    const wibTimeHistory = moment_tz.tz(
                      dateHistory,
                      'Asia/Jakarta',
                    );

                    const mapping = lovList.reduce((acc, item) => {
                      acc[item.additional] = item.set_value;
                      return acc;
                    }, {});

                    const getSetValue = (additional) =>
                      mapping[additional] || 'TelkomselPOIN';

                    const bucket_type = getSetValue(
                      `${data['reward_instance_id']}|${data['reward_item_id']}`,
                    );

                    let trx_id: any;

                    // penambahan fungsi jika type refund karena di core tidak ada trx id beragam seperti inject atau deduct
                    if (data['type'] === 'Refund') {
                      const start = moment();
                      console.log(
                        'Start PointHistory_GETREFUNDPOINT - ' +
                          start.format("YYYY-MM-DD HH:mm:ss'SSS"),
                      );

                      const refundData = await this.refundPointModel
                        .findOne({
                          remark: data.remark,
                          'responseBody.payload.trx_date': data.time,
                        })
                        .exec();

                      trx_id = refundData
                        ? refundData.master_id
                        : data['transaction_no'];

                      console.log(
                        'NFT PointHistory_GETREFUNDPOINT - ' +
                          moment().diff(start),
                      );
                    } else {
                      trx_id = data['transaction_no'];
                    }

                    const remarkData = data['remark'];
                    let firstElementRemark = '';
                    if (remarkData) {
                      const splittedRemark = remarkData
                        ? remarkData.split('|')
                        : [''];
                      firstElementRemark = splittedRemark[0];
                    }

                    const transaction = {
                      transaction_id: trx_id,
                      remark: firstElementRemark,
                      transaction_type:
                        data['type'] === 'Refund'
                          ? data['type']
                          : data['type'] + '-' + data['action'],
                      transaction_date: wibTimeHistory.format(
                        'YYYY-MM-DDTHH:mm:ss.SSSZ',
                      ),
                      bucket_type: bucket_type,
                      total: data['amount'] ? data['amount'] : 0,
                    };
                    transactions.push(transaction);

                    // store to local
                    const start = moment();
                    console.log(
                      'Start PointHistory_STORING - ' +
                        start.format("YYYY-MM-DD HH:mm:ss'SSS"),
                    );
                  }
                }

                const pageSize = Math.ceil(total / limit);
                const pageNum = Math.floor(skip / limit + 1);
                responsePayload = [
                  {
                    msisdn: item?.msisdn,
                    ownership: item.ownership,
                    binding_level: item.binding_level,
                    total_record: total,
                    page_size: pageSize ? pageSize : 1,
                    page_number: pageNum ? pageNum : 1,
                    list_of_transactions: transactions,
                  },
                  ...responsePayload,
                ];
                responseGlobal.code = resp.code;
                responseGlobal.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
                responseGlobal.payload = responsePayload;
                resolve(true);
              } else {
                responseGlobal.code = resp.code;
                responseGlobal.message = resp.message;
                responseGlobal.payload = resPayload;
                resolve(false);
              }
            }),
            catchError(async (e) => {
              console.log(e.data);
              responseGlobal.code = HttpCodeTransaction.CODE_INTERNAL_ERROR_500;
              responseGlobal.message = e.message;
              // responseGlobal.transaction_classify = 'GET_CUSTOMER_POIN_HISTORY';
              responseGlobal.payload = [
                {
                  trace_id: false,
                },
              ];
              resolve(false);
            }),
          ),
        );
      });
    });
    return Promise.allSettled(promises).then((results) => {
      console.log('results');
      console.log(results);
      console.log(responseGlobal);
      return new Promise(async (resolve) => {
        resolve(responseGlobal);
      });
    });
  }

  async getPoinBalance(
    custNumber: string,
    query: any,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;

    const lovDataBucketType = await this.lovService.getLovDetailByGroupAndValue(
      'POINT_TYPE',
      query.bucket_type ?? 'TelkomselPOIN',
    );
    console.log('lovDataBucketType', lovDataBucketType);

    const rwditmId = lovDataBucketType?.additional.split('|')[1];
    console.log('rwditmId', rwditmId);

    const idenfitierCheck = validateCustomerIdentifierNumber(
      custNumber,
      query.identifier,
    );

    if (!idenfitierCheck.isValid) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = idenfitierCheck.message;
      responseGlobal.payload = [
        {
          trace_id: false,
        },
      ];
      return responseGlobal;
    }

    let identifierId = custNumber;
    const customerBrand = '';
    const custNumbers = [custNumber];
    let crmbeValid;
    let message: any = '';
    if (query.identifier?.toUpperCase() == FmcIdenfitiferType.TSEL_ID) {
      [crmbeValid, message] = await _this.getPointBalanceWithTselId(
        custNumber,
        query,
        token,
      );
      if (!crmbeValid) {
        responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
        responseGlobal.message = message;
        responseGlobal.payload = [
          {
            trace_id: false,
          },
        ];
        return responseGlobal;
      }
      responseGlobal.code = HttpCodeTransaction.CODE_SUCCESS_200;
      responseGlobal.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
      responseGlobal.payload = message;
      return responseGlobal;
    }
    let responsePayload = [];
    const promises = custNumbers.map(async (custNumber) => {
      return new Promise(async (resolve) => {
        if (custNumber[0] == '6') {
          identifierId = formatMsisdnCore(custNumber);
        } else if (custNumber[0] == '1') {
          identifierId = formatIndihomeNumberCore(custNumber);
        }

        // get sistem config
        const is_ngix_cache = await this.applicationService.getConfig(
          CallApiConfig.NGINX_CACHE,
        );

        let localMember = null;
        if (!is_ngix_cache) {
          // Find account from local
          localMember = await this.customerModel.findOne({
            msisdn: identifierId,
          });
        }

        const config: AxiosRequestConfig = {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
            'Cache-Control': 'No-Cache',
          },
        };

        console.log(`Member local : ${localMember}`);
        const customerIdResult =
          query.identifier?.toUpperCase() == FmcIdenfitiferType.MSISDN
            ? custNumber.replace(/^0/, '62')
            : custNumber;

        if (localMember) {
          console.log(
            `get member ${identifierId} from core member detail by id`,
          );
          await lastValueFrom(
            this.httpService
              .get(
                `${this.url}/members/${localMember['core_id']}?merchant_id=${_this.merchant}&addon={"binding_level":1,"ownership_flag":1}`,
                config,
              )
              .pipe(
                map(async (response) => {
                  const resp = response.data;
                  const resPayload = resp['payload'].member;

                  console.log(
                    `get member ${identifierId} detail customer by id`,
                    resPayload,
                  );

                  const listOfPoint = [];
                  const reward = resPayload.wallet.reward;
                  if (reward) {
                    const rwditm = reward[rwditmId] ? reward[rwditmId] : {};
                    const amount = findProp(rwditm, 'amount', []);
                    const expireDate = findProp(rwditm, 'expire_time', []);

                    for (let i = 0; i < amount.length; i++) {
                      const dateString = expireDate[i];
                      const date = moment.utc(dateString);
                      const wibTime = moment_tz.tz(date, 'Asia/Jakarta');
                      listOfPoint.push({
                        total_point: amount[i],
                        expired_date: expireDate[i]
                          ? wibTime.format('YYYY-MM-DD')
                          : expireDate[i],
                      });
                    }

                    responsePayload = [
                      {
                        list_of_point: listOfPoint,
                        msisdn: customerIdResult,
                        tier:
                          resPayload['tier'] ??
                          (await this.applicationService.getConfig(
                            'DEFAULT_CUSTOMER_TIER',
                          )),
                        brand: resPayload['brand'] ?? customerBrand,
                        bucket_type: query.bucket_type
                          ? query.bucket_type
                          : 'TelkomselPOIN',
                        bucket_id: 50000,
                        ownership: resPayload['ownership_flag'] ?? '',
                        binding_level: resPayload['binding_level'] ?? '',
                      },
                      ...responsePayload,
                    ];

                    if (resp['code'] === 'S00000') {
                      responseGlobal.code = resp['code'];
                      responseGlobal.message =
                        HttpMsgTransaction.DESC_CODE_SUCCESS;
                      responseGlobal.payload = responsePayload;
                      resolve(true);
                    } else {
                      responseGlobal.code = resp['code'];
                      responseGlobal.message = resp['message'];
                      responseGlobal.payload = responsePayload;
                      resolve(false);
                    }
                  } else {
                    responsePayload = [
                      {
                        list_of_point: [],
                        msisdn: customerIdResult,
                        tier: await this.applicationService.getConfig(
                          'DEFAULT_CUSTOMER_TIER',
                        ),
                        brand: resPayload['brand'] ?? customerBrand,
                        bucket_type: 'TelkomselPOIN',
                        bucket_id: 50000,
                      },
                      ...responsePayload,
                    ];
                    responseGlobal.code = resp['code'];
                    responseGlobal.message =
                      HttpMsgTransaction.DESC_CODE_SUCCESS;
                    responseGlobal.payload = responsePayload;

                    resolve(true);
                  }
                }),
                catchError(async (e) => {
                  console.log('<-- fail : get customer -->');
                  console.log(e);
                  console.log('<-- fail : get customer -->');

                  responseGlobal.code =
                    HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                  responseGlobal.message = e.message;
                  responseGlobal.payload = [
                    {
                      trace_id: false,
                    },
                  ];

                  resolve(false);
                }),
              ),
          );
        } else {
          /**
           * If member if not exists in collection `customers`,
           * this will create first
           */
          console.log(
            `get member ${identifierId} from core member detail by msisdn`,
          );
          await _this.customerService
            .getCoreMemberByMsisdn(identifierId, token, _this.merchant, false)
            .then(async (customerCheck) => {
              console.log('< -- customer -- >');
              console.log(customerCheck);
              console.log('< -- customer -- >');

              if (customerCheck) {
                // console.log('< -- customer tier -- >');
                // console.log(customerCheck[0]['tier']['current']['name']);
                // console.log('< -- customer tier -- >');

                // TODO : TANAKA - KENAPA PANGGIL 2x ke core. Apply k FMC juga
                await _this.customerService
                  .getCoreMemberById(
                    customerCheck[0].id,
                    token,
                    this.merchant,
                    false,
                  )
                  .then(async (customerDetailResp) => {
                    const customerDetail = customerDetailResp?.payload?.member;

                    // return await new Promise(async (resolve, reject) => {
                    await lastValueFrom(
                      this.httpService
                        .get(
                          `${this.url}/members/${customerDetail['id']}/wallet?merchant_id=${_this.merchant}&addon={"binding_level":1,"ownership_flag":1}`,
                          config,
                        )
                        .pipe(
                          map(async (response) => {
                            const resp = response.data;
                            const resPayload = resp['payload'].wallet;

                            console.log(
                              `get member ${identifierId} detail wallet`,
                              resPayload,
                            );

                            const listOfPoint = [];
                            const rwditm = resPayload.pocket.reward[rwditmId]
                              ? resPayload.pocket.reward[rwditmId]
                              : {};
                            const amount = findProp(rwditm, 'amount', []);
                            const expireDate = findProp(
                              rwditm,
                              'expire_time',
                              [],
                            );

                            for (let i = 0; i < amount.length; i++) {
                              const dateString = expireDate[i];
                              const date = moment.utc(dateString);
                              const wibTime = moment_tz.tz(
                                date,
                                'Asia/Jakarta',
                              );
                              listOfPoint.push({
                                total_point: amount[i],
                                expired_date: expireDate[i]
                                  ? wibTime.format('YYYY-MM-DD')
                                  : expireDate[i],
                              });
                            }

                            responsePayload = [
                              {
                                list_of_point: listOfPoint,
                                msisdn: customerIdResult,
                                // tier: customerDetail['tier']
                                //   ? customerDetail['tier']['current']['name']
                                //   : 'New',
                                tier:
                                  customerDetail['tier'] ??
                                  (await this.applicationService.getConfig(
                                    'DEFAULT_CUSTOMER_TIER',
                                  )),
                                brand: customerDetail['brand'] ?? customerBrand,
                                bucket_type: query.bucket_type
                                  ? query.bucket_type
                                  : 'TelkomselPOIN',
                                bucket_id: 50000,
                                ownership:
                                  customerDetail['ownership_flag'] ?? '',
                                binding_level:
                                  customerDetail['binding_level'] ?? '',
                              },
                              ...responsePayload,
                            ];

                            if (resp['code'] === 'S00000') {
                              responseGlobal.code = resp['code'];
                              responseGlobal.message =
                                HttpMsgTransaction.DESC_CODE_SUCCESS;
                              responseGlobal.payload = responsePayload;
                              resolve(true);
                            } else {
                              responseGlobal.code = resp['code'];
                              responseGlobal.message = resp['message'];
                              responseGlobal.payload = resPayload;
                              resolve(false);
                            }
                          }),
                          catchError(async (e) => {
                            if (e.response.status === HttpStatus.NOT_FOUND) {
                              responseGlobal.code = 'S00000';
                              responseGlobal.message =
                                HttpMsgTransaction.DESC_CODE_SUCCESS;
                              // responseGlobal.transaction_classify =
                              //   'GET_POINT_BALANCE';
                              responseGlobal.payload = {
                                total_record: 1,
                                page_size: 1,
                                page_number: 1,
                                list_of_point: [],
                                msisdn: customerIdResult,
                                tier: await this.applicationService.getConfig(
                                  'DEFAULT_CUSTOMER_TIER',
                                ),
                                bucket_type: query.bucket_type
                                  ? query.bucket_type
                                  : 'TelkomselPOIN',
                                bucket_id: 50000,
                              };

                              resolve(true);
                            } else {
                              console.log('<-- fail : get customer -->');
                              console.log(e);
                              console.log('<-- fail : get customer -->');

                              responseGlobal.code =
                                HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                              responseGlobal.message = e.message;
                              responseGlobal.payload = [
                                {
                                  trace_id: false,
                                },
                              ];

                              resolve(false);
                            }
                          }),
                        ),
                    );
                  });
                // });
              } else {
                console.log('<-- fail : get member -->');

                const payload = {
                  total_record: 0,
                  page_size: 1,
                  page_number: 1,
                  list_of_point: [],
                  msisdn: customerIdResult,
                  tier: await this.applicationService.getConfig(
                    'DEFAULT_CUSTOMER_TIER',
                  ),
                  bucket_type: query.bucket_type
                    ? query.bucket_type
                    : 'TelkomselPOIN',
                  bucket_id: 50000,
                };

                responseGlobal.code = 'S00000';
                responseGlobal.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
                responseGlobal.payload = payload;

                // responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                // responseGlobal.message = 'Member not found';
                // responseGlobal.payload = [
                //   {
                //     trace_id: false,
                //   },
                // ];

                // OLD CODE DEFAULT VALUE
                //resolve(false);
                resolve(true);
              }
            });
        }
      });
    });

    return Promise.allSettled(promises).then((results) => {
      console.log('results');
      console.log(results);
      console.log(responseGlobal);
      return new Promise(async (resolve) => {
        resolve(responseGlobal);
      });
    });
  }

  async point_inject(
    request: any,
    account: Account,
    token: string,
    no_action_emit = true,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'INJECT_POINT';
    response.trace_custom_code = 'TRX';
    // create channel_id
    request.channel_id = request?.channel_id
      ? request?.channel_id?.toUpperCase()
      : '';
    const channel_id = request?.channel_id;
    console.log('channel id coupon ', channel_id);

    if (request?.keyword) {
      request.keyword = request.keyword?.toUpperCase();
      console.log('Keyword uppercase: ', request.keyword);
    }

    // generate trace_id
    const trace_id = this.transactionOptional.getTracingId(request, response);

    // config total point for inject point
    let amount = request.total_point;
    if (typeof request.total_point == 'undefined') {
      amount = -1;
    } else if (request.total_point === 0) {
      amount = 0;
    } else if (request.total_point < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Total Point Must +' },
      ]);
    }

    return await this.getSelectedData(request, token)
      .then(async (value: any) => {
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';

        // create remark
        const _eligibility = value?.keyword?.eligibility;

        let program_experience = '';
        const _program_experience = _eligibility?.program_experience.toString();
        if (_program_experience) {
          try {
            const lov = await this.lovService.getLovData(_program_experience);
            program_experience = lov.set_value;
          } catch (error) {
            console.log('==== PREPARE PAYLOAD ======');
            console.log('get program_experience not found');
            console.log(error);
            console.log('==== PREPARE PAYLOAD ======');
          }
        }

        const remark = [
          _eligibility?.program_title_expose
            ? _eligibility?.program_title_expose
            : '',
          _eligibility.name,
          // eslint-disable-next-line prettier/prettier
          _eligibility?.program_experience ? (program_experience ? program_experience : '') : '',
        ].join('|');

        const coreRequest = {
          locale: request.locale, //"id-ID"
          type: 'reward',
          channel: channel_id,
          transaction_no: trace_id,
          remark: remark,
          reward_item_id: value?.reward_item_id,
          reward_instance_id: value?.reward_instance_id,
          amount: amount,
          member_id: value.customer_core ? value.customer_core[0]?.id : null,
          realm_id: this.realm,
          branch_id: this.branch,
          merchant_id: this.merchant,
          __v: 0,
        };

        response.payload = {
          trace_id: trace_id,
          core: coreRequest,
          keyword: value.keyword,
          program: value.program,
          customer: value.customer,
        };

        const json = {
          transaction_classify: 'INJECT_POINT',
          origin: 'inject_point',
          program: response.payload['program'],
          keyword: response.payload['keyword'],
          customer: response.payload['customer'],
          endpoint: '',
          tracing_id: response.payload['trace_id'],
          tracing_master_id: response.payload['trace_id'],
          incoming: request,
          account: account,
          retry: {
            inject_point: {
              counter: 0,
              errors: [],
            },
          },
          rule: {
            fixed_multiple: {
              counter: 0,
              counter_fail: 0,
              counter_success: 0,
              message: [],
              status: [],
              transactions: [],
            },
          },
          submit_time: new Date().toISOString(),
          token: token,
          payload: {
            inject_point: response.payload['core'],
          },
        };

        if (no_action_emit) {
          // save to transaction master
          this.transactionMasterClient.emit('transaction_master', json);
          this.clientInjectKafka.emit('inject_point', json);
        }
        response.payload['json'] = json;
        delete response.payload['customer'];
        return response;
      })
      .catch((e) => {
        response.code = e.code
          ? e.code
          : HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
        response.message = e.message;
        response.payload = {
          trace_id: trace_id,
        };
        return response;
      });
  }

  async getCustomerTselPointBalance(
    msisdn: string,
    token: string,
    identifier: FmcIdenfitiferType,
  ): Promise<any> {
    const q = {
      limit: 10000,
      skip: 0,
      bucket_type: 'TelkomselPOIN',
      transaction_id: null,
      channel_id: null,
      filter: null,
      additional_param: null,
      identifier: identifier?.toUpperCase(),
    };

    return await this.getPoinBalance(msisdn, q, token)
      .then(async (res) => {
        if (res && res.code == 'S00000') {
          return res.payload['list_of_point'].reduce((a, b) => {
            return a + b.total_point;
          }, 0);
        } else {
          throw new Error(res.message);
        }
      })
      .catch((err: Error) => {
        console.log(err.message);
        throw new Error(err.message);
      });
  }

  async transferPoint(
    param: TransferPointDto,
    account: Account,
    token: string,
  ) {
    const _this = this;
    const responseGlobal = new GlobalTransactionResponse();
    responseGlobal.payload = {};
    responseGlobal.message = '';
    responseGlobal.code = '';
    const config: AxiosRequestConfig = {
      params: {},
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
    };

    if (!allowedIndihomeNumber(param.indihome_number_source)) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'Source Number is not Indihome number';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }

    if (!allowedIndihomeNumber(param.indihome_number_target)) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'Target Number is not Indihome number';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }

    if (
      allowedIndihomeNumber(param.indihome_number_source) &&
      allowedIndihomeNumber(param.indihome_number_target)
    ) {
      const reformatMsisdnOrigin = formatIndihomeNumberCore(
        param.indihome_number_source,
      );
      const reformatMsisdnForeign = formatIndihomeNumberCore(
        param.indihome_number_target,
      );
      // Get balance from origin
      return await new Promise(async (resolve, reject) => {
        const projection = {
          wallet: 1,
          id: 1,
          code: 1,
          firstname: 1,
          lastname: 1,
          nickname: 1,
          gender: 1,
          phone: 1,
          email: 1,
          i18n: 1,
          status: 1,
          __v: 1,
          tier_id: 1,
          tier: 1,
          binding_level: 1,
          binding_date: 1,
          ownership_flag: 1,
          tsel_id: 1,
          tsel_tier: 1,
          tsel_tier_id: 1,
          lifetime_value: 1,
          last_transaction_time: 1,
        };

        const coreQuery = `${
          this.url
        }/members?customer_type=Member&addon={}&filter={"phone": "${reformatMsisdnOrigin}|ID|+62||${reformatMsisdnForeign}|ID|+62"}&sort={}&projection=${JSON.stringify(
          projection,
        )}&merchant_id=${_this.merchant}`;

        return await lastValueFrom(
          this.httpService.get(coreQuery, config).pipe(
            map(async (response) => {
              const resp = response.data;

              const metaData = {};
              const trace_id = this.transactionOptional.getTracingId(
                {
                  msisdn: param.indihome_number_source,
                },
                response,
              );

              responseGlobal.payload = {
                trace_id: '',
              };

              if (resp.payload.members[0].total[0].count > 0) {
                const members = resp.payload.members[0].result;
                await members.map(async (mKey) => {
                  const customerNumber = mKey.phone.split('|');
                  if (!metaData[customerNumber[0]]) {
                    metaData[customerNumber[0]] = {};
                  }
                  metaData[customerNumber[0]] = mKey;
                });

                if (metaData[reformatMsisdnOrigin].wallet) {
                  // Wallet exist
                  const sourceWallet = metaData[reformatMsisdnOrigin].wallet;
                  const lovDataBucketType = await this.lovService.findLov({
                    group_name: 'POINT_TYPE',
                    set_value: 'TelkomselPOIN',
                  });

                  const rwditmId =
                    lovDataBucketType[0]?.additional.split('|')[1];
                  const rwdinstId =
                    lovDataBucketType[0]?.additional.split('|')[0];

                  if (sourceWallet.pocket.reward[rwditmId].available > 0) {
                    responseGlobal.payload.trace_id = trace_id;

                    const corePayload = {
                      locale: param.locale,
                      type: 'reward',
                      transaction_no: trace_id,
                      channel: 'Application',
                      amount:
                        sourceWallet.pocket.reward[rwditmId].available * -1,
                      __v: sourceWallet.__v,
                      reward_item_id: rwditmId,
                      member_id: metaData[reformatMsisdnOrigin].id,
                      realm_id: _this.realm,
                      branch_id: _this.branch,
                      merchant_id: _this.merchant,
                    };

                    // Deduct source wallet
                    await lastValueFrom(
                      this.httpService
                        .post(`${this.url}/redeem/inject`, corePayload, {
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: token,
                          },
                        })
                        .pipe(
                          map(async (res) => {
                            const data = res.data;

                            const newData = new this.deductPointModel({
                              locale: param.locale,
                              msisdn: param.indihome_number_source,
                              master_id: trace_id,
                              tracing_id: trace_id,
                              total_point:
                                sourceWallet.pocket.reward[rwditmId].available *
                                -1,
                              send_notification: false,
                              transaction_id: trace_id,
                              remark: param.reason,
                              channel_id: param.channel_id,
                              callback_url: '',
                              transaction_date: new Date(),
                              created_by: account,
                              responseBody: data,
                            });
                            await newData
                              .save()
                              .catch((e: BadRequestException) => {
                                console.error(
                                  `Failed to save deduct transaction ${e}`,
                                );
                              })
                              .then(async () => {
                                let targetInjectMemberId = '';
                                //Check target customer
                                if (metaData[reformatMsisdnForeign]) {
                                  // Target customer has subprofile
                                  targetInjectMemberId =
                                    metaData[reformatMsisdnForeign].id;

                                  const customerUpdate = {
                                    tier_id:
                                      metaData[reformatMsisdnOrigin].tier_id,
                                    tier: metaData[reformatMsisdnOrigin].tier,
                                    merchant_id: _this.merchant,
                                    binding_level:
                                      metaData[reformatMsisdnOrigin]
                                        .binding_level,
                                    ownership_flag:
                                      metaData[reformatMsisdnOrigin]
                                        .ownership_flag,
                                    binding_date:
                                      metaData[reformatMsisdnOrigin]
                                        .binding_date,
                                    tsel_id:
                                      metaData[reformatMsisdnOrigin].tsel_id,
                                    tsel_tier:
                                      metaData[reformatMsisdnOrigin].tsel_tier,
                                    tsel_tier_id:
                                      metaData[reformatMsisdnOrigin]
                                        .tsel_tier_id,
                                    __v: metaData[reformatMsisdnForeign].__v,
                                  };

                                  await this.customerService
                                    .memberEdit(
                                      customerUpdate,
                                      token,
                                      {
                                        msisdn: reformatMsisdnForeign,
                                        last_redeemed_date: '',
                                        loyalty_tier: '',
                                      },
                                      targetInjectMemberId,
                                    )
                                    .then((updatedCustomer) => {
                                      //
                                    })
                                    .catch((e) => {
                                      console.log(
                                        `Failed to update custoner ${e}`,
                                      );
                                    });
                                } else {
                                  // Auto create new customer
                                  const customerData = new CustomerMemberDto();

                                  customerData.locale = 'en-US';
                                  customerData.channel = 'Application';
                                  customerData.firstname = `COAutoGeneratedMSISDN`;
                                  customerData.lastname = 'X';
                                  customerData.nickname = 'X';
                                  customerData.gender = 'Other';
                                  customerData.phone = `${reformatMsisdnForeign}|ID|+62`;
                                  customerData.email = 'anonymous@xyz.com';
                                  customerData.birthdate = '1990-12-31';
                                  customerData.status = 'Active';
                                  customerData.tsel_id =
                                    metaData[reformatMsisdnOrigin].tsel_id;
                                  customerData.tier_id =
                                    metaData[reformatMsisdnOrigin].tier_id;
                                  customerData.tier =
                                    metaData[reformatMsisdnOrigin].tier;
                                  customerData.ownership_flag =
                                    metaData[
                                      reformatMsisdnOrigin
                                    ].ownership_flag;
                                  customerData.binding_level =
                                    metaData[
                                      reformatMsisdnOrigin
                                    ].binding_level;
                                  customerData.binding_date =
                                    metaData[reformatMsisdnOrigin].binding_date;
                                  customerData.tsel_tier =
                                    metaData[reformatMsisdnOrigin].tsel_tier;
                                  customerData.tsel_tier_id =
                                    metaData[reformatMsisdnOrigin].tsel_tier_id;
                                  customerData.realm_id = _this.realm;
                                  customerData.branch_id = _this.branch;
                                  customerData.merchant_id = _this.merchant;

                                  await this.customerService
                                    .memberAdd(customerData, token, {
                                      msisdn: reformatMsisdnForeign,
                                      last_redeemed_date: '',
                                      loyalty_tier: '',
                                    })
                                    .then((newCreatedCustomer) => {
                                      targetInjectMemberId =
                                        newCreatedCustomer.payload.core_id;
                                    })
                                    .catch((e) => {
                                      console.log(
                                        `Failed to create custoner ${e}`,
                                      );
                                    });
                                }

                                // Inject to target customer
                                const payloadInject = {
                                  locale: 'id-ID',
                                  type: 'reward',
                                  channel: 'Application',
                                  amount:
                                    sourceWallet.pocket.reward[rwditmId]
                                      .available,
                                  reward_item_id: rwditmId,
                                  reward_instance_id: rwdinstId,
                                  remark: param.reason,
                                  member_id: targetInjectMemberId,
                                  realm_id: _this.realm,
                                  branch_id: _this.branch,
                                  merchant_id: _this.merchant,
                                  __v:
                                    metaData[reformatMsisdnForeign]?.wallet
                                      ?.__v ?? 1, // TODO: If 0 it will 400??
                                };

                                console.log(
                                  `>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Payload Inject CO ${JSON.stringify(
                                    payloadInject,
                                    null,
                                    2,
                                  )}`,
                                );

                                await lastValueFrom(
                                  this.httpService
                                    .post(
                                      `${this.url}/earn/inject`,
                                      payloadInject,
                                      {
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: token,
                                        },
                                      },
                                    )
                                    .pipe(
                                      map(async (res) => {
                                        // responseGlobal.code = resp['code'];
                                        // responseGlobal.message =
                                        //   HttpMsgTransaction.DESC_CODE_SUCCESS;

                                        // Transfer coupon and voucher
                                        const transferCouponPayload = {
                                          locale: 'id-ID',
                                          type: 'Coupon',
                                          from: moment()
                                            .subtract(90, 'd')
                                            .format('YYYY-MM-DD'), // Last 3 months
                                          to: moment().format('YYYY-MM-DD'), // To now
                                          from_member_id:
                                            metaData[reformatMsisdnOrigin].id,
                                          to_member_id: targetInjectMemberId,
                                        };

                                        const transfer_url = `${_this.tsel_url}/vouchers/transfer`;
                                        await lastValueFrom(
                                          this.httpService
                                            .post(
                                              transfer_url,
                                              transferCouponPayload,
                                              {
                                                headers: {
                                                  'Content-Type':
                                                    'application/json',
                                                  Authorization: token,
                                                },
                                              },
                                            )
                                            .pipe(
                                              map(async (resTransfer) => {
                                                // TODO : Here to add success code
                                                responseGlobal.code =
                                                  resp['code'];
                                                responseGlobal.message =
                                                  HttpMsgTransaction.DESC_CODE_SUCCESS;

                                                // Transfer coupon and voucher
                                              }),
                                              catchError(async (e) => {
                                                console.error(
                                                  `Failed to transfer coupon and voucher ${e}`,
                                                );
                                              }),
                                            ),
                                        );

                                        const transferVoucherPayload = {
                                          locale: 'id-ID',
                                          type: 'Voucher',
                                          from: moment()
                                            .subtract(90, 'd')
                                            .format('YYYY-MM-DD'), // Last 3 months
                                          to: moment().format('YYYY-MM-DD'), // To now
                                          from_member_id:
                                            metaData[reformatMsisdnOrigin].id,
                                          to_member_id: targetInjectMemberId,
                                        };

                                        await lastValueFrom(
                                          this.httpService
                                            .post(
                                              transfer_url,
                                              transferVoucherPayload,
                                              {
                                                headers: {
                                                  'Content-Type':
                                                    'application/json',
                                                  Authorization: token,
                                                },
                                              },
                                            )
                                            .pipe(
                                              map(async (resTransfer) => {
                                                console.log(
                                                  `Core response : ${JSON.stringify(
                                                    resTransfer.data,
                                                    null,
                                                    2,
                                                  )}`,
                                                );
                                                // TODO : Here to add success code
                                                responseGlobal.code =
                                                  resp['code'];
                                                responseGlobal.message =
                                                  HttpMsgTransaction.DESC_CODE_SUCCESS;

                                                // Transfer coupon and voucher
                                              }),
                                              catchError(async (e) => {
                                                console.error(
                                                  `Failed to transfer coupon and voucher ${e}`,
                                                );
                                              }),
                                            ),
                                        );

                                        // Change voucher on non core
                                        await _this.voucherModel
                                          .updateMany(
                                            {
                                              msisdn:
                                                param.indihome_number_source,
                                            },
                                            {
                                              $set: {
                                                msisdn:
                                                  param.indihome_number_target,
                                              },
                                            },
                                          )
                                          .catch((errorMoveVoucher) => {
                                            console.error(
                                              `Voucher error : ${errorMoveVoucher}`,
                                            );
                                          });

                                        await _this.injectCouponModel
                                          .updateMany(
                                            {
                                              msisdn:
                                                param.indihome_number_source,
                                            },
                                            {
                                              $set: {
                                                msisdn:
                                                  param.indihome_number_target,
                                              },
                                            },
                                          )
                                          .catch((errorMoveVoucher) => {
                                            console.error(
                                              `Coupon error : ${errorMoveVoucher}`,
                                            );
                                          });

                                        if (
                                          metaData[reformatMsisdnOrigin]
                                            .tsel_id &&
                                          metaData[reformatMsisdnOrigin]
                                            .tsel_id !== ''
                                        ) {
                                          const originUnbind = {
                                            merchant_id: _this.merchant,
                                            binding_level: 0,
                                            // binding_level: '',
                                            ownership_flag: '', // WHY EMPTY STRING? Core cant patch NULL
                                            tsel_id: '', // WHY EMPTY STRING? Core cant patch NULL
                                            tsel_tier: '', // WHY EMPTY STRING? Core cant patch NULL
                                            tsel_tier_id: '', // WHY EMPTY STRING? Core cant patch NULL
                                            __v: metaData[reformatMsisdnOrigin]
                                              .__v,
                                          };

                                          await this.customerService
                                            .memberEdit(
                                              originUnbind,
                                              token,
                                              {
                                                msisdn: reformatMsisdnOrigin,
                                                last_redeemed_date: '',
                                                loyalty_tier: '',
                                              },
                                              metaData[reformatMsisdnOrigin].id,
                                            )
                                            .then((updatedOriginCustomer) => {
                                              //
                                            })
                                            .catch((e) => {
                                              console.log(
                                                `Failed to update custoner ${e}`,
                                              );
                                            });
                                        }

                                        // TODO : Here to add success code
                                        // Coupon and voucher may return 400 because IH number is not have any coupon or voucher. There is no required condition to inform this condition
                                        responseGlobal.code = resp['code'];
                                        responseGlobal.message =
                                          HttpMsgTransaction.DESC_CODE_SUCCESS;
                                      }),
                                      catchError(async (e) => {
                                        console.error(
                                          `Failed to inject target ${e}`,
                                        );
                                      }),
                                    ),
                                );
                              });
                          }),
                          catchError(async (e) => {
                            console.error(`Failed to deduct origin ${e}`);
                          }),
                        ),
                    );
                  } else {
                    responseGlobal.code =
                      HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                    responseGlobal.message = 'Source wallet already 0';
                  }
                } else {
                  // Wallet no exist
                  responseGlobal.code =
                    HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                  responseGlobal.message = 'Source wallet not exist';
                }
              } else {
                responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                responseGlobal.message = 'No member found';
              }

              resolve(responseGlobal);
            }),
            catchError(async (e) => {
              console.log(e.data);
              console.log('Error');
              responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
              responseGlobal.message = e.message;
              // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
              responseGlobal.payload = {
                trace_id: false,
              };
              resolve(responseGlobal);
            }),
          ),
        );
      });
    } else {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'msisdn wrong format';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }

    // Upsert target
  }
}
