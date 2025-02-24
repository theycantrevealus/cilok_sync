import { CallApiConfig } from '@configs/call-api.config';
import { NotificationTemplateConfig } from '@configs/notification.template.config';
// import { UtilsService } from '@utils/services/utils.service';
import { ReportingServiceResult } from '@fmc_reporting_generation/model/reporting_service_result';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import {
  PrepaidGranularLog,
  PrepaidGranularLogEnum,
  PrepaidGranularTransactionEnum,
} from '@prepaid_granular/models/prepaid_granular_log';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { formatIndihomeCore } from '@utils/logger/formatters';
import { LoggingRequest } from '@utils/logger/handler';
import { ExceptionHandler } from '@utils/logger/handler';
import { LoggingData } from '@utils/logger/transport';
// import { IAccount } from '@utils/logger/transport';
import { AxiosRequestConfig } from 'axios';
// import { validationKeywordPointValueRule } from '@/application/utils/Validation/keyword.validation';
import * as moment from 'moment';
// const moment_tz = require('moment-timezone');
import * as moment_tz from 'moment-timezone';
// import { Console } from 'console';
import { Model } from 'mongoose';
import { catchError, firstValueFrom, lastValueFrom, map } from 'rxjs';

import { Account } from '@/account/models/account.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { isJson } from '@/application/utils/JSON/json';
import {
  allowedMSISDN,
  checkCustomerIdentifier,
  FMC_reformatMsisdnCore,
  formatMsisdnCore,
  msisdnCombineFormatted,
} from '@/application/utils/Msisdn/formatter';
import { findProp } from '@/application/utils/NestedObject/findProp';
import { CustomerPoinHistoryDto } from '@/customer/dto/customer.poin.history.dto';
import { Customer, CustomerDocument } from '@/customer/models/customer.model';
import {
  CustomerPoinHistory,
  CustomerPoinHistoryDocument,
} from '@/customer/models/customer.poin.history.model';
import { CustomerService } from '@/customer/services/customer.service';
import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { KeywordService } from '@/keyword/services/keyword.service';
import { APILog } from '@/logging/models/api.logs.model';
import { LovService } from '@/lov/services/lov.service';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { FmcIdenfitiferType } from '@/transaction/dtos/point/fmc.member.identifier.type';
import {
  ViewPointHistoryCoreQueryDTO,
  ViewPointHistoryParamDTO,
  ViewPointHistoryQueryDTO,
} from '@/transaction/dtos/point/point.dto';
import { ViewPointQueryDTO } from '@/transaction/dtos/point/view_current_balance/view.current.balance.property.dto';
import {
  DeductPoint,
  DeductPointDocument,
} from '@/transaction/models/point/deduct.point.model';
import {
  InjectPoint,
  InjectPointDocument,
} from '@/transaction/models/point/inject.point.model';
import {
  RefundPoint,
  RefundPointDocument,
} from '@/transaction/models/point/refund.point.model';

import { EarningPayloadDTO } from '../../dtos/point/point.earning.dto';
import { EligibilityService } from '../eligibility.service';
import { TransactionMasterService } from '../transaction_master/transaction_master.service';
const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');

@Injectable()
export class PointService {
  private httpService: HttpService;
  private url: string;
  private tsel_url: string;
  protected realm: string;
  protected branch: string;
  protected merchant: string;
  private raw_core: string;
  private raw_port: number;
  protected customerService: CustomerService;
  protected keywordService: KeywordService;
  protected lovService: LovService;
  protected programService: ProgramServiceV2;
  private callApiConfigService: CallApiConfigService;

  constructor(
    @InjectModel(InjectPoint.name)
    private injectPointModel: Model<InjectPointDocument>,
    @InjectModel(DeductPoint.name)
    private deductPointModel: Model<DeductPointDocument>,
    @InjectModel(RefundPoint.name)
    private refundPointModel: Model<RefundPointDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(CustomerPoinHistory.name)
    private customerPoinHistoryModel: Model<CustomerPoinHistoryDocument>,
    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,
    @Inject('DEDUCT_SERVICE_PRODUCER')
    private readonly clientDeductKafka: ClientKafka,
    @Inject('INJECT_POINT_SERVICE_PRODUCER')
    protected readonly clientInjectKafka: ClientKafka,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject(ApplicationService)
    protected readonly applicationService: ApplicationService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    httpService: HttpService,
    private readonly configService: ConfigService,
    customerService: CustomerService,
    keywordService: KeywordService,
    lovService: LovService,
    programService: ProgramServiceV2,
    private notifService: NotificationContentService,
    protected transactionOptional: TransactionOptionalService,
    private transactionMasterService: TransactionMasterService,
    private eligibilityService: EligibilityService,
    @InjectModel(APILog.name) private readonly apiLogModel: Model<APILog>,
    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly clientRefundKafka: ClientKafka,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    callApiConfigService: CallApiConfigService,
    @InjectModel(PrepaidGranularLog.name)
    private prepaidGranularLogModel: Model<PrepaidGranularLog>,
  ) {
    this.programService = programService;
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.tsel_url = `${configService.get<string>('tsel-core-backend.api.url')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.customerService = customerService;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.keywordService = keywordService;
    this.lovService = lovService;
    this.transactionMasterService = transactionMasterService;
    this.callApiConfigService = callApiConfigService;
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
            // const reformatMsisdn = msisdnCombineFormatted(request.msisdn); // check_member_core
            // if (reformatMsisdn && token) {
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
                .getCoreMemberByMsisdn(reformatMsisdn, token, '', false) // sync with FMC
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
              // const reformatMsisdn = msisdnCombineFormatted(request.msisdn); // check_member_core
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
      ? request?.channel_id.toUpperCase()
      : '';
    const channel_id = request?.channel_id;
    console.log('channel id coupon ', channel_id);

    if (request?.keyword) {
      request.keyword = request.keyword.toUpperCase();
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

    // const count = await this.checkTraceIDInjectPoint(trace_id);
    // if (count == 0) {
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
          _eligibility?.program_experience
            ? program_experience
              ? program_experience
              : ''
            : '',
        ].join('|');

        // console.log(
        //   '<-- payload request :: point.service.ts (inject_point) -->',
        // );
        // console.log(request);
        // console.log(
        //   '<-- payload request :: point.service.ts (inject_point) -->',
        // );

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

        // console.log(
        //   '<-- payload for core :: point.service.ts (inject_point) -->',
        // );
        // console.log(coreRequest);
        // console.log(
        //   '<-- payload for core :: point.service.ts (inject_point) -->',
        // );

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
          this.transactionMasterClient.emit(
            process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
            json,
          );
          this.clientInjectKafka.emit(
            process.env.KAFKA_INJECT_POINT_TOPIC,
            json,
          );
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
        // console.log(
        //   '<-- catch getSelectedData :: point.service.ts (inject_point) -->',
        // );
        // console.log(response);
        // console.log(
        //   '<-- catch getSelectedData :: point.service.ts (inject_point) -->',
        // );
        return response;
      });
    // } else {
    //   response.code = HttpStatusTransaction.ERR_DATA_EXISTS;
    //   response.message =
    //     'Transaction_id was used before, please input another transaction_id';
    //   response.payload = {
    //     trace_id: trace_id,
    //   };
    //   return response;
    // }
  }

  async point_inject_api(request: any, account: Account, token: string) {
    const response = new GlobalTransactionResponse();

    response.transaction_classify = 'INJECT_POINT';
    response.trace_custom_code = 'TRX';

    request.channel_id = request?.channel_id
      ? request?.channel_id.toUpperCase()
      : '';
    const channel_id = request?.channel_id;
    console.log('channel id coupon ', channel_id);

    if (request?.keyword) {
      request.keyword = request.keyword.toUpperCase();
      console.log('Keyword uppercase: ', request.keyword);
    }

    // generate trace_id
    const trace_id = this.transactionOptional.getTracingId(request, response);

    if (request.total_point < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Total Point Must +' },
      ]);
    }

    try {
      response.payload = {
        trace_id: trace_id,
        // core: coreRequest,
        // keyword: value.keyword,
        // program: value.program,
        // customer: value.customer,
      };

      const json = {
        transaction_classify: 'INJECT_POINT',
        origin: 'inject_point',
        program: null, // response.payload['program'],
        keyword: null, // response.payload['keyword'],
        customer: null, // response.payload['customer'],
        endpoint: '',
        tracing_id: trace_id,
        tracing_master_id: trace_id,
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
          inject_point: null, // response.payload['core'],
        },
      };

      // this.transactionMasterClient.emit(
      //   process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
      //   json,
      // );

      // emit payload kosong ke inject_point
      this.clientInjectKafka.emit(process.env.KAFKA_INJECT_POINT_TOPIC, json);

      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Success';
      response.payload['json'] = json;

      return response;
    } catch (err) {
      response.code = err?.code
        ? err?.code
        : HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      response.message = err?.message;
      response.payload = {
        trace_id: trace_id,
      };

      return response;
    }
  }

  /**
   * This function will check data injection point based on transaction_id || tracing_id || trace_id
   * @param obj mandatory, you can custom object like query usually
   */
  async getOneInjectPoint(obj: object) {
    return await this.injectPointModel.findOne(obj);
  }

  /**
   * This function will check data inject point based on transaction_id || tracing_id || trace_id
   * @param transaction_id
   */
  async checkTraceIDInjectPoint(transaction_id: string) {
    if (transaction_id) {
      return await this.injectPointModel.count({
        transaction_id: transaction_id,
      });
    } else {
      return 0;
    }
  }

  async point_deduct(
    request: DeductPoint,
    account: Account,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    let endTime: Date;
    const startTime = new Date();
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'DEDUCT';
    response.trace_custom_code = 'TRX';

    if (request?.keyword) {
      request.keyword = request.keyword.toUpperCase();
      console.log('Keyword uppercase: ', request.keyword);
    }

    // generate trace_id
    const trace_id = this.transactionOptional.getTracingId(request, response);

    // const count = await this.checkTraceIDDeductPoint(trace_id);
    // if (count == 0) {
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
          _eligibility?.program_experience
            ? program_experience
              ? program_experience
              : ''
            : '',
        ].join('|');

        // create channel_id
        const channel_id = request.channel_id ? request.channel_id : '';

        const coreRequest = {
          locale: request.locale, //"id-ID"
          type: 'reward',
          channel: channel_id,
          transaction_no: trace_id,
          reward_item_id: value?.reward_item_id,
          reward_instance_id: value?.reward_instance_id,
          amount: request.total_point,
          remark: remark,
          member_id: value?.customer_core ? value?.customer_core[0]?.id : null,
          local_id: null,
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

        endTime = new Date();
        console.log(
          `NFT_PointService.point_deduct = ${
            endTime.getTime() - startTime.getTime()
          } ms`,
        );
        return response;
      })
      .catch((e) => {
        endTime = new Date();
        console.log(
          `NFT_PointService.point_deduct = ${
            endTime.getTime() - startTime.getTime()
          } ms`,
        );

        const http_status = e.http_status
          ? e.http_status
          : 'isInvalidDataContent';
        throw new BadRequestException([
          { [http_status]: e.message, trace_id: trace_id },
        ]);
      });
    // } else {
    //   response.code = HttpStatusTransaction.ERR_DATA_EXISTS;
    //   response.message =
    //     'transaction_id  has been used before, please input another transaction_id';
    //   response.payload = {
    //     trace_id: trace_id,
    //   };
    //   return response;
    // }
  }

  async prepare_payload_deduct(
    request: DeductPoint,
    account: Account,
    req: any,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'DEDUCT';
    response.trace_custom_code = 'TRX';

    if (request?.keyword) {
      request.keyword = request.keyword.toUpperCase();
      console.log('Keyword uppercase: ', request.keyword);
    }

    // generate trace_id
    const trace_id = this.transactionOptional.getTracingId(request, response);

    // const count = await this.checkTraceIDDeductPoint(trace_id);
    // if (count == 0) {
    return await this.getSelectedData(request, req.headers.authorization, {
      check_balance: true,
    })
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
            console.log('program_experience ', _program_experience);
            console.log(error);
            console.log('==== PREPARE PAYLOAD ======');
          }
        }

        const remark = [
          _eligibility?.program_title_expose
            ? _eligibility?.program_title_expose
            : '',
          _eligibility.name,
          _eligibility?.program_experience
            ? program_experience
              ? program_experience
              : ''
            : '',
        ].join('|');

        // create channel_id
        const channel_id = request.channel_id ? request.channel_id : '';

        // add new field create_local_time
        const transaction_date = new Date().toISOString();
        const create_local_time =
          this.transactionOptional.convertUTCtoGMT7LocalFormat(
            transaction_date,
          );

        const coreRequest = {
          locale: request.locale, //"id-ID"
          type: 'reward',
          channel: channel_id,
          transaction_no: trace_id,
          reward_item_id: value?.reward_item_id,
          reward_instance_id: value?.reward_instance_id,
          amount: request.total_point,
          remark: remark,
          member_id: value?.member_id,
          realm_id: this.realm,
          branch_id: this.branch,
          merchant_id: this.merchant,
          create_local_time: create_local_time,
          __v: value.__v,
        };

        const json = {
          transaction_classify: 'DEDUCT_POINT',
          origin: 'deduct',
          program: value.program,
          keyword: value.keyword,
          customer: value.customer,
          endpoint: req.url,
          tracing_id: trace_id,
          tracing_master_id: trace_id,
          incoming: request,
          account: account,
          retry: {
            deduct: {
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
          submit_time: transaction_date,
          token: req.headers.authorization,
          payload: {
            deduct: coreRequest,
          },
        };

        response.payload = {
          trace_id: trace_id,
          core: coreRequest,
          keyword: value.keyword,
          program: value.program,
          customer: value.customer,
          payload: json,
        };

        return response;
      })
      .catch((e) => {
        const http_status = e.http_status
          ? e.http_status
          : 'isInvalidDataContent';

        this.save_to_logger({
          statusStringCode: e?.code,
          step: 'Prepare payload for deduct',
          payload: {
            origin: 'deduct.deduct_fail',
            endpoint: '/v2/point/deduct',
            incoming: request,
            tracing_master_id: trace_id ?? '-',
          },
          message: e?.msg_error_system,
          method: 'POST',
          service: 'DEDUCT_SYNC',
          is_success: false,
        });

        throw new BadRequestException([
          { [http_status]: e.message, trace_id: trace_id },
        ]);
      });
  }

  async proccess_point_deduct_to_core(
    payload,
  ): Promise<GlobalTransactionResponse> {
    const request = payload.incoming;
    const account = payload.account;
    const keyword = payload.keyword;
    const corePayload = payload.payload.deduct;
    const token = payload.token;

    // tracing_id change TRX to DDC
    // let tracing_id = payload.tracing_id.split('_');
    // tracing_id[0] = 'DDC';
    const tracing_id = payload.tracing_id;

    // Add field parent_master_id
    let parent_transaction_id = payload.tracing_master_id;
    if (payload?.incoming?.additional_param) {
      const parse_additional_param = payload.incoming.additional_param;

      if (parse_additional_param?.parent_transaction_id) {
        parent_transaction_id = parse_additional_param.parent_transaction_id;
      }
    }

    if (corePayload.amount > 0) {
      corePayload.amount = corePayload.amount * -1;
    }

    corePayload.transaction_no = payload.tracing_id;

    if (keyword.eligibility.poin_value == 'Fixed Multiple') {
      corePayload.transaction_no = tracing_id;
    } else {
      corePayload.transaction_no = corePayload.transaction_no
        ? corePayload.transaction_no
        : tracing_id;
    }

    const origin = payload.origin.split('.');
    const req = request;

    const transaction_date = payload?.submit_time ? payload?.submit_time : '';

    req['tracing_id'] = tracing_id;
    req['master_id'] = payload?.tracing_master_id;
    req['remark'] = corePayload.remark;
    req['create_local_time'] = corePayload.create_local_time;
    req['transaction_date'] = transaction_date;
    req['total_point'] = Math.abs(corePayload.amount);
    req['parent_master_id'] = parent_transaction_id;

    if (origin[0] == 'redeem') {
      req['msisdn'] = request.msisdn;
      req['keyword'] = request.keyword;
      req['created_by'] = (account as any)._id;
    }

    console.log(`<== Tracing Log :: @${corePayload.transaction_no} ==>`);
    console.log('<--- Information :: Deduct Point Service --->');
    console.log('url_core : ', `${this.url}/redeem/inject`);
    console.log('token : ', token);
    console.log('<--- Information :: Deduct Point Service --->');

    if (corePayload.amount == 0) {
      console.log('=== DEDUCT AMOUNT 0 ===');
      console.log(req);
      const response = new GlobalTransactionResponse();
      const newData = new this.deductPointModel(req);
      return await newData
        .save()
        .catch((e: BadRequestException) => {
          // Set Logging Failed
          this.save_to_logger({
            payload: payload,
            statusStringCode: HttpStatusTransaction.ERR_CONTENT_DATA_INVALID,
            method: 'POST',
            service: 'DEDUCT_SYNC',
            step: `Step :: Insert to collection amount 0`,
            message: e?.message ?? 'Failed insert to collection with amount 0',
            is_success: false,
          });

          throw new BadRequestException([{ isNotFoundGeneral: e.message }]);
        })
        .then(() => {
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
          response.transaction_classify = 'DEDUCT_POINT';
          response.payload = {
            trace_id: payload.tracing_id,
          };

          // Set Logging Success
          this.save_to_logger({
            payload: payload,
            statusStringCode: HttpStatusTransaction.CODE_SUCCESS,
            method: 'POST',
            service: 'DEDUCT_SYNC',
            step: `Step :: Insert to collection amount 0`,
            message: 'Success insert to collection with amount 0',
            stack: req,
          });

          console.log('=== DEDUCT AMOUNT 0 ===');
          return response;
        });
    } else {
      console.log('<--- Payload to Core :: Deduct Point Service --->');
      console.log(corePayload);
      console.log('<--- Payload to Core :: Deduct Point Service --->');

      return await lastValueFrom(
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

              req['responseBody'] = data;

              const newData = new this.deductPointModel(req);
              const response = new GlobalTransactionResponse();
              return await newData
                .save()
                .catch((e: BadRequestException) => {
                  // Set Logging Failed
                  this.save_to_logger({
                    payload: payload,
                    statusStringCode:
                      HttpStatusTransaction.ERR_CONTENT_DATA_INVALID,
                    method: 'POST',
                    service: 'DEDUCT_SYNC',
                    step: `Step :: Insert to collection normal case`,
                    message: e?.message ?? 'Failed insert to collection',
                    is_success: false,
                  });

                  throw new BadRequestException([
                    { isNotFoundGeneral: e.message },
                  ]);
                })
                .then((e) => {
                  response.code = HttpStatusTransaction.CODE_SUCCESS;
                  response.message = 'Success';
                  response.transaction_classify = 'DEDUCT_POINT';
                  response.payload = {
                    trace_id: payload.tracing_id,
                    error_message: e,
                    core: data,
                  };

                  // Set Logging Success
                  this.save_to_logger({
                    payload: payload,
                    statusStringCode: HttpStatusTransaction.CODE_SUCCESS,
                    method: 'POST',
                    service: 'DEDUCT_SYNC',
                    step: `Step :: Process deduct to core`,
                    message:
                      'Success insert to collection & processed deduct to core is success too',
                    stack: response.payload,
                  });

                  return response;
                });
            }),
            catchError(async (e) => {
              const rsp = e?.response;
              console.log(
                '<--- Response from Core :: fail :: Deduct Point Service --->',
              );
              console.log('Status Code : ', rsp.status);
              console.log('Status Text : ', rsp.statusText);
              console.log('Data : ', rsp.data);
              console.log(
                '<--- Response from Core :: fail :: Deduct Point Service --->',
              );

              const response = new GlobalTransactionResponse();
              response.code = e?.response?.data.code
                ? e?.response?.data.code
                : HttpStatusTransaction.ERR_NOT_FOUND;
              response.message = e?.response?.data.message
                ? e?.response?.data.message
                : 'Fail';
              response.transaction_classify = 'DEDUCT_POINT';
              response.payload = {
                trace_id: payload.tracing_id,
                error_message: `${rsp.status}|${rsp.statusText}|${
                  e?.response?.data.message ? e?.response?.data.message : 'Fail'
                }`,
              };

              // Set Logging Failed
              this.save_to_logger({
                payload: payload,
                statusStringCode:
                  HttpStatusTransaction.ERR_CONTENT_DATA_INVALID,
                method: 'POST',
                service: 'DEDUCT_SYNC',
                step: `Step :: Process deduct to core`,
                message:
                  'Failed insert to collection & processed to core is failed too',
                is_success: false,
                stack: response,
              });

              return response;
            }),
          ),
      );
    }
  }

  /**
   * This function will check data deduct point based on transaction_id || tracing_id || trace_id
   * @param transaction_id
   */
  async checkTraceIDDeductPoint(transaction_id: string) {
    if (transaction_id) {
      return await this.deductPointModel.count({
        transaction_id: transaction_id,
      });
    } else {
      return 0;
    }
  }

  async point_deduct_lama(
    request: DeductPoint,
    account: Account,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    let reward_item_id,
      reward_instance_id = '';

    const getRewardId = async () => {
      let additional;
      const data = {
        reward_item_id: '',
        reward_instance_id: '',
        status: false,
      };

      const keyword = await this.keywordService.getKeywordByName({
        'eligibility.name': request.keyword,
      });

      if (keyword) {
        const lov = await this.lovService.getLovData(
          keyword.eligibility.point_type.toString(),
        );
        additional = lov.additional ? lov.additional.split('|') : false;

        if (lov && additional) {
          data.reward_item_id = additional[1];
          data.reward_instance_id = additional[0];
          data.status = true;
        }
      }

      return data;
    };

    const check_reward = await getRewardId();
    if (check_reward.status) {
      reward_item_id = check_reward.reward_item_id;
      reward_instance_id = check_reward.reward_instance_id;

      return this.customer_point_balance_v2(
        request.msisdn,
        new ViewPointQueryDTO(),
        token,
      )
        .then((e: any) => {
          const member_id = e.payload.member_id;
          const member_core_id = e.payload.member_core_id;
          const __v = e.payload.__v;
          const coreRequest = {
            locale: request.locale, //"id-ID"
            type: 'reward',
            channel: request.channel_id ? request.channel_id : 'Application',
            reward_item_id: reward_item_id, //dari product
            reward_instance_id: reward_instance_id, //dari product
            // TODO : Mapping from lov point type - Need to enhance
            remark: 'program mechanism refund point',
            amount: request.total_point,
            member_id: member_core_id,
            local_id: member_id,
            realm_id: this.realm,
            branch_id: this.branch,
            merchant_id: this.merchant, //"mercht-623bdcce7399b50e38fbe93a"
            __v: __v,
          };

          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
          response.transaction_classify = 'DEDUCT_POINT';
          response.payload = {
            trace_id: true,
            core: coreRequest,
          };
          return response;
        })
        .catch((e: BadRequestException) => {
          throw new BadRequestException(e.message);
        });
    } else {
      response.code = HttpStatusTransaction.ERR_DATA_EXISTS;
      response.message = 'Failed, data keyword not exist';
      response.transaction_classify = 'DEDUCT_POINT';
      response.payload = {
        trace_id: false,
      };
      return response;
    }
  }

  /**
   * This function will selected and validation data
   * like keyword, program, customer and params reward_item_id, reward_instance_id from lov
   * This function can be used by refund
   * @param request mandatory, params from body
   * @param token optional
   */
  async getSelectedDataRefund(request: any, token = '', except = {}) {
    let additional, point_type, keyword, customer;
    const data = {
      reward_item_id: '',
      reward_instance_id: '',
      message: '',
      msg_error_system: '',
      member_id: '',
      authorize_pin: '',
      point_refund: 0,
      transaction_no: '',
      ref_transaction_id: '',
      customer_core: null,
      status: false,
      keyword: {},
      program: {},
      customer: {},
      code: null,
      http_status: null,
      balance: 0,
      __v: 0,
    };

    return new Promise(async (resolve, reject) => {
      /*
          Condition to get data keyword
        */
      if (request.keyword && request.program_id) {
        console.log('req keyword & program_id active');
        keyword = await this.keywordService.getKeywordWhere({
          'eligibility.name': request.keyword,
          'eligibility.program_id': request.program_id,
        });

        if (!keyword) {
          data.message =
            'Keyword not found with condition  params keyword & program_id';
          reject(data);
        }
      } else if (request.keyword) {
        // Check param keyword is not empty
        // console.log('req keyword active');
        keyword = await this.keywordService.getKeywordWhere({
          'eligibility.name': request.keyword,
        });

        if (!keyword) {
          data.message = 'Keyword not found with condition  params keyword';
          reject(data);
        }
      } else if (request.program_id) {
        // Check param program_id is not empty
        console.log('req program_id active');
        keyword = await this.keywordService.getKeywordByName({
          'eligibility.program_id': request.program_id,
        });

        if (!keyword) {
          data.message = 'Keyword not found with condition  params program_id';
          reject(data);
        }
      }

      // Keyword is exsist
      if (keyword) {
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
          .getProgramByID(keyword.eligibility.program_id)
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
              data.message = 'Program not have point type';
              reject(data);
            }
          })
          .catch((err) => {
            data.msg_error_system = err?.message;
            data.message = 'Failed, Data program is not found';
            reject(data);
          });
      }

      /*
          Call data lov to get params reward_item_id &  reward_instance_id
        */
      const lov = await this.lovService.getLovData(point_type);

      // Check data lov
      if (!lov) {
        data.message = 'Lov is not found with condition params point_type';
        reject(data);
      } else {
        // Checking params additional in lov
        if (!lov.additional) {
          data.message = 'Params additional in lov is empty';
          reject(data);
        }

        // split params additional to get reward_item_id &  reward_instance_id
        additional = lov.additional ? lov.additional.split('|') : false;

        // Check lov and params additional exsist
        if (lov && additional) {
          // set data reward_item_id & reward_instance_id and change status true, that's condistion
          if (!additional[1]) {
            data.message = 'Params reward_item_id not found';
            reject(data);
          }

          data.reward_item_id = additional[1];
          data.reward_instance_id = additional[0];
          data.status = true;
        } else {
          data.message =
            'Params reward_item_id & reward_instance_id is not found';
          reject(data);
        }
      }

      try {
        const merchant = await this.getMerchantSelf(token);
        const authorize_pin = merchant.payload.merchant_config.authorize_code
          .refund
          ? merchant.payload.merchant_config.authorize_code.refund
          : '0000';

        if (authorize_pin) {
          data.authorize_pin = authorize_pin;
        } else {
          data.message = 'Auhtorization pin is not found';
          reject(data);
        }
      } catch (error) {
        console.log('<== ERROR :: GET MERCHANT ==>');
        console.log(error);
        console.log('<== ERROR :: GET MERCHANT ==>');
        data.message = 'Auhtorization pin is not found';
        reject(data);
      }

      // If customer false, cannot get customer
      if (except['customer']) {
        const msisdn = FMC_reformatMsisdnCore(request.msisdn);

        const member_id = await this.customerService.getCoreMemberByMsisdn(
          msisdn,
          token,
        );

        if (member_id) {
          /*
            Get data customer by condition msisdn
          */

          const reformatMsisdn = msisdnCombineFormatted(request.msisdn); // check_member_core
          if (reformatMsisdn && token) {
            try {
              customer = await this.customerService
                .getCustomerByMSISDN(reformatMsisdn, token)
                .then(async (customerDetail) => customerDetail);

              if (customer) {
                data.customer = customer;
              } else {
                data.message = 'Customer not registered';
                reject(data);
              }

              // Check member core
              try {
                const checkMisdnFromCore = await this.customerService
                  .getCoreMemberByMsisdn(reformatMsisdn, token)
                  .then(async (coreDetail) => coreDetail)
                  .catch((e) => {
                    console.log('checkMisdnFromCore', e);
                  });

                if (checkMisdnFromCore) {
                  data.customer_core = checkMisdnFromCore;
                } else {
                  data.message = 'Customer on core not registered';
                  reject(data);
                }
              } catch (error) {
                data.message = 'Get Core member failed';
                reject(data);
              }
            } catch (error) {
              data.message = 'Get data customer by condition msisdn failed';
              reject(data);
            }
          }

          data.member_id = member_id[0]['id'];
        } else {
          data.message = 'msisdn is not found';
          reject(data);
        }
      }

      /*
         checking trx
      */

      try {
        if (request?.ref_transaction_id) {
          const channel_transaction_id = request?.ref_transaction_id;
          if (!channel_transaction_id.includes('TRX_')) {
            const trx =
              await this.transactionMasterService.getTransactionMasterFindOne({
                channel_transaction_id: channel_transaction_id,
              });
            if (trx) {
              data.ref_transaction_id = trx.transaction_id;
              data.transaction_no = trx.transaction_id;
            } else {
              data.code = HttpStatusTransaction.ERR_NOT_FOUND;
              data.message = 'Data to be refunded not found';
              console.log(
                '<--- Rejected :: sync trx on transaction_master  :: getSelectedDataRefund --->',
              );
              console.log(data.message);
              console.log(
                '<--- Rejected :: sync trx on transaction_master  :: getSelectedDataRefund --->',
              );
              reject(data);
            }
          } else {
            data.ref_transaction_id = request.ref_transaction_id;
            data.transaction_no = request.ref_transaction_id;
          }
        }
      } catch (error) {
        console.log('<--- Fail :: Get TRX  :: getSelectedDataRefund --->');
        console.log(error);
        console.log('<--- Fail :: Get TRX :: getSelectedDataRefund --->');
      }

      /*
         get point refund
      */
      try {
        const queryPointHistory = new ViewPointHistoryCoreQueryDTO();

        queryPointHistory.transaction_id = data.ref_transaction_id;

        const point_history = await this.getCoreTransactionHistory(
          queryPointHistory,
          token,
        );
        if (point_history.code == 'S00000') {
          const total_point_history =
            point_history.payload['transactions'][0]['total'][0]['count'];
          const result_point_history =
            point_history.payload['transactions'][0]['result'];
          if (total_point_history == 0) {
            data.code = HttpStatusTransaction.ERR_NOT_FOUND;
            data.message = 'Data to be refunded not found';
            console.log(
              '<--- Rejected :: get trx form core  :: getSelectedDataRefund --->',
            );
            console.log(data.message);
            console.log(
              '<--- Rejected :: get trx form core  :: getSelectedDataRefund --->',
            );
            reject(data);
          } else {
            const point_history_data =
              result_point_history && total_point_history > 0
                ? result_point_history[0]
                : null;
            if (point_history_data) {
              if (point_history_data['status'] == 'Refund') {
                data.code = HttpStatusTransaction.ERR_NOT_FOUND;
                data.message = 'ref_transaction_id already used for refund';
                console.log(
                  '<--- Rejected :: ref_transaction_id already use for refund :: getSelectedDataRefund --->',
                );
                console.log(data.message);
                console.log(
                  '<--- Rejected :: ref_transaction_id already use for refund :: getSelectedDataRefund --->',
                );
                reject(data);
              } else {
                const point_refund = Math.abs(point_history_data['amount']);
                data.point_refund = point_refund;
                data.status = true;
              }
            } else {
              data.code = HttpStatusTransaction.ERR_NOT_FOUND;
              data.message = 'Data to be refunded not found';
              console.log(
                '<--- Rejected :: on condition point_history_data :: getSelectedDataRefund --->',
              );
              console.log(data.message);
              console.log(
                '<--- Rejected :: on condition point_history_data :: getSelectedDataRefund --->',
              );
              reject(data);
            }
          }
        } else {
          data.code = HttpStatusTransaction.ERR_NOT_FOUND;
          data.message = 'Data to be refunded not found';
          console.log(
            '<--- Rejected :: form core :: getSelectedDataRefund --->',
          );
          console.log(data.message);
          console.log(
            '<--- Rejected :: form core :: getSelectedDataRefund --->',
          );
          reject(data);
        }
      } catch (error) {
        console.log(
          '<-- Fail :: Refund Information :: getSelectedDataRefund -->',
        );
        console.log(error);
        console.log(
          '<-- Fail :: Refund Information :: getSelectedDataRefund -->',
        );
      }
      /*
         return response success
      */
      resolve(data);
    });
  }

  async point_refund(
    request: RefundPoint,
    account: Account,
    token: string,
  ): Promise<any> {
    // const moment = require('moment-timezone');
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'REFUND_POINT';
    response.trace_custom_code = 'TRX';

    if (request?.keyword) {
      request.keyword = request.keyword.toUpperCase();
      console.log('Keyword uppercase: ', request.keyword);
    }

    // generate trace_id
    const start = moment();
    console.log(
      'Start PointRefund_GETTRACINGID - ' +
        start.format("YYYY-MM-DD HH:mm:ss'SSS"),
    );
    const trace_id = this.transactionOptional.getTracingId(request, response);
    console.log('NFT PointRefund_GETTRACINGID - ' + moment().diff(start));

    // check ref_transaction_id on collection
    // const count = await this.checkTraceIDRefundPoint(
    //   request?.ref_transaction_id,
    // );
    // if (count == 0) {
    console.log(
      'Start PointRefund_GETSELECTEDDATAREFUND - ' +
        start.format("YYYY-MM-DD HH:mm:ss'SSS"),
    );
    return await this.getSelectedDataRefund(request, token, { customer: false })
      .then(async (value: any) => {
        console.log(
          'NFT PointRefund_GETSELECTEDDATAREFUND - ' + moment().diff(start),
        );
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';

        // create remark
        const _eligibility = value?.keyword?.eligibility;

        let program_experience = '';
        const _program_experience = _eligibility?.program_experience.toString();
        if (_program_experience) {
          try {
            var start = moment();
            console.log(
              'Start PointRefund_GETLOV - ' +
                start.format("YYYY-MM-DD HH:mm:ss'SSS"),
            );

            const lov = await this.lovService.getLovData(_program_experience);

            console.log('NFT PointRefund_GETLOV - ' + moment().diff(start));
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
          _eligibility?.program_experience
            ? program_experience
              ? program_experience
              : ''
            : '',
        ].join('|');

        // create channel_id
        const channel_id = request.channel_id ? request.channel_id : '';

        const coreRequest = {
          locale: request.locale, //"id-ID"
          transaction_no: value.transaction_no,
          type: 'reward',
          reward_item_id: value?.reward_item_id,
          reward_instance_id: value?.reward_instance_id,
          channel: channel_id,
          remark: remark,
          authorize_pin: value?.authorize_pin,
          member_id: value.customer_core ? value.customer_core[0]?.id : null,
          realm_id: this.realm,
          branch_id: this.branch,
          merchant_id: this.merchant, //"mercht-623bdcce7399b50e38fbe93a"
          __v: 0,
        };

        response.payload = {
          trace_id: trace_id,
          ref_transaction_id: request?.ref_transaction_id,
          point_refund: value?.point_refund,
          core: coreRequest,
          keyword: value?.keyword,
          program: value?.program,
          customer: value?.customer,
        };

        return response;
      })
      .catch((e) => {
        const http_status = e.http_status
          ? e.http_status
          : 'isInvalidDataContent';
        throw new BadRequestException([
          { [http_status]: e.message, trace_id: trace_id },
        ]);
      });
    // } else {
    //   response.code = HttpStatusTransaction.ERR_NOT_FOUND;
    //   response.message =
    //     'ref_transaction_id  has been refunded before, please input another ref_transaction_id';
    //   response.payload = {
    //     trace_id: trace_id,
    //   };
    //   return response;
    // }
  }

  async prepare_point_refund(
    request: RefundPoint,
    account: Account,
    req: any,
  ): Promise<any> {
    // const moment = require('moment-timezone');
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'REFUND_POINT';
    response.trace_custom_code = 'TRX';

    if (request?.keyword) {
      request.keyword = request.keyword.toUpperCase();
      console.log('Keyword uppercase: ', request.keyword);
    }

    // generate trace_id
    var start = moment();
    console.log(
      'Start PointRefund_GETTRACINGID - ' +
        start.format("YYYY-MM-DD HH:mm:ss'SSS"),
    );
    const trace_id = this.transactionOptional.getTracingId(request, response);
    console.log('NFT PointRefund_GETTRACINGID - ' + moment().diff(start));

    // check ref_transaction_id on collection
    // const count = await this.checkTraceIDRefundPoint(
    //   request?.ref_transaction_id,
    // );
    // if (count == 0) {
    var start = moment();
    console.log(
      'Start PointRefund_GETSELECTEDDATAREFUND - ' +
        start.format("YYYY-MM-DD HH:mm:ss'SSS"),
    );
    return await this.getSelectedDataRefund(
      request,
      req.headers.authorization,
      { customer: true },
    )
      .then(async (value: any) => {
        console.log(
          'NFT PointRefund_GETSELECTEDDATAREFUND - ' + moment().diff(start),
        );
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.message = 'Success';

        // create remark
        const _eligibility = value?.keyword?.eligibility;

        let program_experience = '';
        const _program_experience = _eligibility?.program_experience.toString();
        if (_program_experience) {
          try {
            var start = moment();
            console.log(
              'Start PointRefund_GETLOV - ' +
                start.format("YYYY-MM-DD HH:mm:ss'SSS"),
            );

            const lov = await this.lovService.getLovData(_program_experience);

            console.log('NFT PointRefund_GETLOV - ' + moment().diff(start));
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
          _eligibility?.program_experience
            ? program_experience
              ? program_experience
              : ''
            : '',
        ].join('|');

        // create channel_id
        const channel_id = request.channel_id ? request.channel_id : '';

        // add new field create_local_time
        const transaction_date = new Date().toISOString();
        const create_local_time =
          this.transactionOptional.convertUTCtoGMT7LocalFormat(
            transaction_date,
          );

        const coreRequest = {
          locale: request.locale, //"id-ID"
          transaction_no: value.transaction_no,
          type: 'reward',
          reward_item_id: value?.reward_item_id,
          reward_instance_id: value?.reward_instance_id,
          channel: channel_id,
          remark: remark,
          authorize_pin: value?.authorize_pin,
          member_id: value?.member_id,
          realm_id: this.realm,
          branch_id: this.branch,
          merchant_id: this.merchant,
          create_local_time: create_local_time,
          __v: 0,
        };

        const incoming: any = request;
        if (incoming) {
          incoming.point_refund = value?.point_refund;
        }

        const json = {
          transaction_classify: 'REFUND_POINT',
          origin: 'refund',
          program: value.program,
          keyword: value.keyword,
          customer: value.customer,
          endpoint: req.url,
          tracing_id: trace_id,
          tracing_master_id: trace_id,
          incoming: request,
          account: account,
          retry: {
            refund: {
              refund: 0,
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
          is_stock_deducted: true,
          token: req.headers.authorization,
          payload: {
            refund: coreRequest,
          },
        };

        response.payload = {
          trace_id: trace_id,
          ref_transaction_id: request?.ref_transaction_id,
          point_refund: value?.point_refund,
          core: coreRequest,
          keyword: value?.keyword,
          program: value?.program,
          customer: value?.customer,
          payload: json,
        };

        return response;
      })
      .catch((e) => {
        console.log('<-- CATCH PREPARE :: SYNC REFUND  -->');
        console.log(e);
        const http_status = e.http_status
          ? e.http_status
          : 'isInvalidDataContent';
        throw new BadRequestException([
          { [http_status]: e.message, trace_id: trace_id },
        ]);
      });
    // } else {
    //   response.code = HttpStatusTransaction.ERR_NOT_FOUND;
    //   response.message =
    //     'ref_transaction_id  has been refunded before, please input another ref_transaction_id';
    //   response.payload = {
    //     trace_id: trace_id,
    //   };
    //   return response;
    // }
  }

  async proccess_point_refund_to_core(
    payload,
  ): Promise<GlobalTransactionResponse> {
    // const moment = require('moment-timezone');

    const request = payload.incoming;
    const account = payload.account;
    const token = payload.token;
    const corePayload = payload.payload.refund;

    console.log(`<== Tracing Log :: @${corePayload.transaction_no} ==>`);

    // try {
    //   if(request?.ref_transaction_id){
    //     let channel_transaction_id = request?.ref_transaction_id;
    //     if(!channel_transaction_id.includes('TRX_')){
    //       const trx = await this.transactionMasterService.getTransactionMasterFindOne({channel_transaction_id : channel_transaction_id})
    //       corePayload.transaction_no = trx.transaction_id;
    //     }

    //     console.log(request)
    //   }
    // } catch (error) {
    //   console.log('<--- Fail :: Get TRX  :: Refund Point Service --->');
    //   console.log(error);
    //   console.log('<--- Fail :: Get TRX :: Refund Point Service --->');
    // }

    console.log('<--- Information :: Refund Point Service --->');
    console.log('url_core : ', `${this.url}/transactions/refund`);
    console.log('token : ', token);
    console.log('<--- Information :: Refund Point Service --->');

    const reformatMsisdn = msisdnCombineFormatted(request.msisdn); // check_member_core    // check_member_core
    //  try {
    //   const data:any = await this.customerService.check_member_core(
    //     reformatMsisdn,
    //     token,
    //     corePayload.reward_item_id
    //   );

    //   corePayload.member_id = corePayload.member_id
    //     ? corePayload.member_id
    //     : data?.member_core_id;

    // } catch (data_fail) {
    //   console.log('<-- fatal :: fail check member core -->')

    //   corePayload.member_id = corePayload.member_id
    //   ? corePayload.member_id
    //   : data_fail?.member_core_id;

    //   console.log(data_fail)
    // }

    console.log('<--- Payload to Core :: Refund Point Service --->');
    console.log(corePayload);
    console.log('<--- Payload to Core :: Refund Point Service --->');

    const start = moment();
    console.log(
      'Start PointRefundKAFKA_GETLASTVALUE - ' +
        start.format("YYYY-MM-DD HH:mm:ss'SSS"),
    );
    return await lastValueFrom(
      this.httpService
        .post(`${this.url}/transactions/refund`, corePayload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        })
        .pipe(
          map(async (res) => {
            const data = res.data;

            // tracing_id change TRX to RFN
            let tracing_id = payload.tracing_id.split('_');
            tracing_id[0] = 'RFN';
            tracing_id = tracing_id.join('_');

            const newData = new this.refundPointModel({
              ...request,
              remark: corePayload.remark,
              created_by: (account as any)._id,
              responseBody: data,
              tracing_id: tracing_id,
              master_id: payload.tracing_id,
              create_local_time: corePayload?.create_local_time,
            });

            const response = new GlobalTransactionResponse();

            console.log(
              'NFT PointRefundKAFKA_GETLASTVALUE - ' + moment().diff(start),
            );

            return await newData
              .save()
              .catch((e: BadRequestException) => {
                throw new BadRequestException([
                  { isNotFoundGeneral: e.message },
                ]);
              })
              .then((e) => {
                response.code = HttpStatusTransaction.CODE_SUCCESS;
                response.message = 'Success';
                response.transaction_classify = 'REFUND_POINT';
                response.payload = {
                  trace_id: payload.tracing_id,
                  error_message: e,
                };
                return response;
              });
          }),
          catchError(async (e) => {
            const response = new GlobalTransactionResponse();
            const rsp = e?.response;

            console.log(
              '<--- Response from Core :: fail :: Refund Point Service --->',
            );
            console.log('Status Code : ', rsp.status);
            console.log('Status Text : ', rsp.statusText);
            console.log('Data : ', rsp.data);
            console.log(
              '<--- Response from Core :: fail :: Refund Point Service --->',
            );

            response.code = e?.response?.data.code
              ? e?.response?.data.code
              : HttpStatusTransaction.ERR_NOT_FOUND;
            response.message = e?.response?.data.message
              ? e?.response?.data.message
              : 'Fail';
            response.transaction_classify = 'REFUND_POINT';
            response.payload = {
              trace_id: payload.tracing_id,
              error_message: `${rsp.status}|${rsp.statusText}|${
                e?.response?.data.message ? e?.response?.data.message : 'Fail'
              }`,
            };
            return response;
          }),
        ),
    );
  }
  /**
   * This function will check data deduct point based on transaction_id || tracing_id || trace_id
   * @param ref_transaction_id
   */
  async checkTraceIDRefundPoint(ref_transaction_id: string) {
    if (ref_transaction_id) {
      return await this.refundPointModel.count({
        ref_transaction_id: ref_transaction_id,
      });
    } else {
      return 0;
    }
  }

  async point_refund_lama(
    request: RefundPoint,
    account: Account,
    token: string,
  ): Promise<any> {
    const merchant = await this.getMerchantSelf(token);
    const authorize_pin =
      merchant.payload.merchant_config.authorize_code.refund;
    const member_id = await this.customerService.getCoreMemberByMsisdn(
      request.msisdn,
      token,
    );

    const ViewPointHistoryParam = new ViewPointHistoryParamDTO();
    const ViewPointHistoryQuery = new ViewPointHistoryQueryDTO();

    ViewPointHistoryParam.msisdn = request.msisdn;
    ViewPointHistoryQuery.transaction_id = request.ref_transaction_id;
    ViewPointHistoryQuery.type = 'Inject';
    const point_history_list = await this.point_history_list_all(
      ViewPointHistoryParam,
      ViewPointHistoryQuery,
      token,
    );

    const response = new GlobalTransactionResponse();
    const trace_id = this.transactionOptional.getTracingId(request, response);
    if (point_history_list.code != 'E04006') {
      if (point_history_list.payload['total_record'] == 0) {
        response.code = HttpStatusTransaction.ERR_DATA_EXISTS;
        response.message = 'Failed, data not exist';
        response.transaction_classify = 'REFUND_POINT';
        response.payload = {
          trace_id: trace_id,
        };
        return response;
      }

      const ref_transaction_id =
        point_history_list.payload['list_of_transactions'][0]['id'];

      const point_refund =
        point_history_list.payload['list_of_transactions'][0]['amount'];

      const data = {
        locale: request.locale, //"id-ID"
        transaction_no:
          point_history_list.payload['list_of_transactions'][0].transaction_no,
        type: 'reward',
        channel: 'Application',
        remark: ' refund point',
        authorize_pin: authorize_pin,
        member_id: member_id ? member_id[0].id : member_id,
        realm_id: this.realm,
        branch_id: this.branch,
        merchant_id: this.merchant, //"mercht-623bdcce7399b50e38fbe93a"
        __v: 0,
      };

      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Success';
      response.transaction_classify = 'REFUND_POINT';
      response.payload = {
        point_refund: point_refund,
        ref_transaction_id: ref_transaction_id,
        trace_id: trace_id,
        core: data,
      };
      return response;
    } else {
      response.code = HttpStatusTransaction.ERR_NOT_FOUND;
      response.message = 'Failed, data not found';
      response.transaction_classify = 'REFUND_POINT';
      response.payload = {
        trace_id: trace_id,
      };
      return response;
    }
  }

  async getMerchantSelf(token: string): Promise<any> {
    return await lastValueFrom(
      this.httpService
        .get(`${this.url}/merchant-setting/${this.merchant}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        })
        .pipe(
          map(async (res) => {
            return res.data;
          }),
          catchError(async (e) => {
            return e;
          }),
        ),
    );
  }

  async point_history_list_all(
    param: ViewPointHistoryParamDTO,
    query: ViewPointHistoryQueryDTO,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;

    const reformatMsisdn = msisdnCombineFormatted(param.msisdn); // check_member_core
    if (reformatMsisdn) {
      return await _this.customerService
        .getCustomerByMSISDN(reformatMsisdn, token)
        .then(async (customerDetail) => {
          if (customerDetail) {
            const limit = parseInt(query.limit) ? parseInt(query.limit) : 10;
            const skip = parseInt(query.skip) ? parseInt(query.skip) : 0;
            const fromDate = query.from
              ? query.from
              : this.getISODate(this.minDateMonth(3));
            const toDate = query.to ? query.to : this.getISODate(new Date());

            await new Promise(async (resolve, reject) => {
              let filter = `"member_id":"${customerDetail.core_id}"`;
              if (query.type) {
                filter =
                  filter +
                  `,"action":"${
                    query.type[0].toUpperCase() +
                    query.type.substring(1).toLowerCase()
                  }"`;
              }
              if (query.transaction_id) {
                filter = filter + `,"id":"${query.transaction_id}"`;
              }
              if (query.filter) {
                query.filter = JSON.parse(query.filter);
                filter =
                  filter +
                  `,"transaction_no":"${query.filter['transaction_no']}"`;
              }
              const options = {
                method: 'GET',
                hostname: _this.raw_core,
                port: _this.raw_port > 0 ? _this.raw_port : null,
                path: `/gateway/v3.0/transactions?from=${fromDate}&to=${toDate}&filter={${filter}}&sort={}&limit=${limit}&skip=${skip}&realm_id=${_this.realm}&branch_id=${_this.branch}&addon={"amount":1}`,
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
                    if (isJson(body.toString())) {
                      const resp = JSON.parse(body.toString());
                      const resPayload = resp.payload['transactions'][0];

                      if (resp.code === 'S00000') {
                        const total = resPayload['total'][0]['count'];
                        const transactions = [];

                        if (resPayload['result']) {
                          for (
                            let i = 0;
                            i < resPayload['result'].length;
                            i++
                          ) {
                            const data = resPayload['result'][i];
                            // const transaction = {
                            //   transaction_id: data['id'],
                            //   remark: '',
                            //   transaction_type:
                            //     data['type'] + '-' + data['action'],
                            //   transaction_date: data['time'],
                            //   total: 0,
                            // };
                            transactions.push(data);

                            // store to local
                            const customerPoinHistoryDTO =
                              new CustomerPoinHistoryDto({
                                transaction_id: data['id'],
                                transaction_no: data['transaction_no'],
                                type: data['type'],
                                action: data['action'],
                                channel: data['channel'],
                                status: data['status'],
                                customer_id: customerDetail._id,
                                time: data['time'],
                                amount: data['amount'] ? data['amount'] : 0,
                              });

                            const customerPoinHistory =
                              new _this.customerPoinHistoryModel(
                                customerPoinHistoryDTO,
                              );
                            customerPoinHistory
                              .save()
                              .then(async (returning) => {
                                return returning;
                              })
                              .catch(() => {
                                //
                              });
                          }
                        }

                        responseGlobal.code = resp.code;
                        responseGlobal.message =
                          HttpMsgTransaction.DESC_CODE_SUCCESS;
                        responseGlobal.transaction_classify =
                          'GET_CUSTOMER_POIN_HISTORY';
                        responseGlobal.payload = {
                          total_record: total,
                          page_size: limit,
                          page_number: skip == 0 ? 1 : limit / skip,
                          list_of_transactions: transactions,
                        };
                      } else {
                        responseGlobal.code = resp.code;
                        responseGlobal.message = resp.message;
                        responseGlobal.transaction_classify =
                          'GET_CUSTOMER_POIN_HISTORY';
                        responseGlobal.payload = resPayload;
                      }
                    } else {
                      responseGlobal.code = '';
                      responseGlobal.message = body.toString();
                      responseGlobal.transaction_classify =
                        'GET_CUSTOMER_POIN_HISTORY';
                      responseGlobal.payload = {};
                    }
                    resolve(responseGlobal);
                  }
                });
              });

              req.on('error', function (e) {
                responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                responseGlobal.message = e.message;
                responseGlobal.transaction_classify =
                  'GET_CUSTOMER_POIN_HISTORY';
                responseGlobal.payload = {
                  trace_id: false,
                };

                resolve(responseGlobal);
              });

              req.end();
            });

            return responseGlobal;
          } else {
            responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            responseGlobal.message = 'customer not found';
            responseGlobal.transaction_classify = 'GET_CUSTOMER_POIN_HISTORY';
            responseGlobal.payload = {
              trace_id: false,
            };
            return responseGlobal;
          }
        });
    } else {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'msisdn wrong format';
      responseGlobal.transaction_classify = 'GET_CUSTOMER_POIN_HISTORY';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
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

  async point_history_list(
    param: ViewPointHistoryParamDTO,
    query: ViewPointHistoryQueryDTO,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;
    const moment_tz = require('moment-timezone');

    const reformatMsisdn = msisdnCombineFormatted(param.msisdn); // check_member_core
    if (reformatMsisdn) {
      return await _this.customerService
        .getCustomerByMSISDN(reformatMsisdn, token)
        .then(async (customerDetail) => {
          if (customerDetail) {
            const limit = query.limit
              ? query.limit === '0'
                ? 999999
                : parseInt(query.limit)
              : 5;
            const skip = parseInt(query.skip) ? parseInt(query.skip) : 0;
            const fromDate = query.from
              ? query.from
              : this.getISODate(this.minDateMonth(3));
            const toDate = query.to ? query.to : this.getISODate(new Date());

            await new Promise(async (resolve, reject) => {
              const lovList = await this.lovService.getLovDetailByGroupName(
                'POINT_TYPE',
              );

              let filter = `"member_id":"${customerDetail.core_id}"`;

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
                  query.type[0].toUpperCase() +
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

              if (query.transaction_id) {
                filter = filter + `,"id":"${query.transaction_id}"`;
              }
              const options = {
                method: 'GET',
                hostname: _this.raw_core,
                port: _this.raw_port > 0 ? _this.raw_port : null,
                path: `/gateway/v3.0/transactions?from=${fromDate}&to=${toDate}&filter={${filter}}&sort={}&limit=${limit}&skip=${skip}&realm_id=${_this.realm}&branch_id=${_this.branch}&addon={"remark":1,"amount":1,"reward_item_id":1,"reward_instance_id":1}`,
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
                    if (isJson(body.toString())) {
                      const resp = JSON.parse(body.toString());
                      const resPayload = resp.payload['transactions'][0];

                      if (resp.code === 'S00000') {
                        const total = resPayload['total'][0]['count'];
                        const transactions = [];

                        if (resPayload['result']) {
                          for (
                            let i = 0;
                            i < resPayload['result'].length;
                            i++
                          ) {
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
                            const transaction = {
                              transaction_id: data['transaction_no'],
                              remark: data['remark'] ? data['remark'] : '',
                              transaction_type:
                                data['type'] + '-' + data['action'],
                              transaction_date: wibTimeHistory.format(
                                'YYYY-MM-DDTHH:mm:ss.SSSZZ',
                              ),
                              bucket_type: bucket_type,
                              // total:
                              //   data['amount'] < 0
                              //     ? Math.abs(data['amount'])
                              //     : data['amount'],
                              total: data['amount'] ? data['amount'] : 0,
                            };
                            transactions.push(transaction);

                            // store to local
                            const customerPoinHistoryDTO =
                              new CustomerPoinHistoryDto({
                                transaction_id: data['id'],
                                transaction_no: data['transaction_no'],
                                type: data['type'],
                                action: data['action'],
                                channel: data['channel'],
                                status: data['status'],
                                customer_id: customerDetail._id,
                                time: wibTimeHistory.format(
                                  'YYYY-MM-DDTHH:mm:ss.SSSZZ',
                                ),
                                total: data['amount'] ? data['amount'] : 0,
                              });

                            const customerPoinHistory =
                              new _this.customerPoinHistoryModel(
                                customerPoinHistoryDTO,
                              );
                            customerPoinHistory
                              .save()
                              .then(async (returning) => {
                                return returning;
                              })
                              .catch(() => {
                                //
                              });
                          }
                        }

                        const pageSize = Math.ceil(total / limit);
                        const pageNum = Math.floor(skip / limit + 1);

                        responseGlobal.code = resp.code;
                        responseGlobal.message =
                          HttpMsgTransaction.DESC_CODE_SUCCESS;
                        // responseGlobal.transaction_classify =
                        //   'GET_CUSTOMER_POIN_HISTORY';
                        responseGlobal.payload = {
                          total_record: total,
                          page_size: pageSize ? pageSize : 1,
                          page_number: pageNum ? pageNum : 1,
                          list_of_transactions: transactions,
                        };
                      } else {
                        responseGlobal.code = resp.code;
                        responseGlobal.message = resp.message;
                        // responseGlobal.transaction_classify =
                        //   'GET_CUSTOMER_POIN_HISTORY';
                        responseGlobal.payload = resPayload;
                      }
                    } else {
                      responseGlobal.code = '';
                      responseGlobal.message = body.toString();
                      // responseGlobal.transaction_classify =
                      //   'GET_CUSTOMER_POIN_HISTORY';
                      responseGlobal.payload = {};
                    }
                    resolve(responseGlobal);
                  }
                });
              });

              req.on('error', function (e) {
                responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                responseGlobal.message = e.message;
                // responseGlobal.transaction_classify =
                //   'GET_CUSTOMER_POIN_HISTORY';
                responseGlobal.payload = {
                  trace_id: false,
                };

                resolve(responseGlobal);
              });

              req.end();
            });

            return responseGlobal;
          } else {
            responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            responseGlobal.message = 'customer not found';
            // responseGlobal.transaction_classify = 'GET_CUSTOMER_POIN_HISTORY';
            responseGlobal.payload = {
              trace_id: false,
            };
            return responseGlobal;
          }
        });
    } else {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'msisdn wrong format';
      // responseGlobal.transaction_classify = 'GET_CUSTOMER_POIN_HISTORY';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }
  }

  async customer_point_balance(
    msisdn: string,
    query: ViewPointQueryDTO,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const now = Date.now();
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;
    const moment_tz = require('moment-timezone');

    // get lovs by point type for filter query bucket_type
    const lovDataBucketType = await this.lovService.getLovPrime({
      first: 0,
      rows: 5,
      sortField: 'created_at',
      sortOrder: 1,
      filters: {
        set_value: {
          value: query.bucket_type ? query.bucket_type : 'TelkomselPOIN',
          matchMode: 'contains',
        },
      },
    });

    const rwditmId =
      lovDataBucketType.payload.data[0]?.additional.split('|')[1];

    // query limit default 5
    query.limit =
      query.limit || query.limit === 0
        ? query.limit == 0
          ? 9999
          : query.limit
        : 5;

    const reformatMsisdn = msisdnCombineFormatted(msisdn); // check_member_core
    if (reformatMsisdn) {
      this.logger.verbose({
        method: 'kafka',
        statusCode: HttpStatus.OK,
        transaction_id: '',
        notif_customer: false,
        notif_operation: true,
        taken_time: Date.now() - now,
        param: {
          msisdn: reformatMsisdn,
          query: query,
        },
        step: `Checking: ${reformatMsisdn} to core`,
        service: 'FUNCTION',
        result: {
          msisdn: reformatMsisdn,
          url: '',
          user_id: token,
          result: {},
        },
      });
      return await _this.customerService
        .getCustomerByMSISDN(reformatMsisdn, token)
        .then(async (customerDetail) => {
          if (customerDetail) {
            await new Promise(async (resolve, reject) => {
              const options = {
                method: 'GET',
                hostname: _this.raw_core,
                port: _this.raw_port > 0 ? _this.raw_port : null,
                path: `/gateway/v3.0/members/${customerDetail.core_id}/wallet?merchant_id=${_this.merchant}`,
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
                    if (isJson(body.toString())) {
                      const resp = JSON.parse(body.toString());

                      const resPayload = resp.payload.wallet;

                      const listOfPoint = [];
                      const rwditm = resPayload.pocket.reward[rwditmId]
                        ? resPayload.pocket.reward[rwditmId]
                        : {};
                      const amount = findProp(rwditm, 'amount', []);
                      const expireDate = findProp(rwditm, 'expire_time', []);

                      const skip = query.skip
                        ? parseInt(String(query.skip))
                        : 0;
                      let length = amount.length;
                      if (query.limit && query.limit < amount.length) {
                        length = parseInt(String(query.limit)) + skip;
                      }

                      for (let i = skip; i < length; i++) {
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

                      const pageSize = Math.ceil(amount.length / query.limit);
                      const pageNum = Math.floor(query.skip / query.limit + 1);
                      const payload = {
                        total_record: amount.length,
                        page_size: pageSize ? pageSize : 1,
                        page_number: pageNum ? pageNum : 1,
                        list_of_point: listOfPoint,
                        msisdn: msisdn.replace(/^0/, '62'),
                        tier: customerDetail.loyalty_tier[0]
                          ? customerDetail.loyalty_tier[0].name
                          : 'Silver',
                        bucket_type: query.bucket_type
                          ? query.bucket_type
                          : 'TelkomselPOIN',
                        bucket_id: 50000,
                      };

                      if (resp.code === 'S00000') {
                        responseGlobal.code = resp.code;
                        responseGlobal.message =
                          HttpMsgTransaction.DESC_CODE_SUCCESS;
                        // responseGlobal.transaction_classify =
                        //   'GET_POINT_BALANCE';
                        responseGlobal.payload = payload;
                        _this.logger.verbose({
                          method: req.method,
                          statusCode: `${res.statusCode} - ${resp.code}`,
                          transaction_id: '',
                          notif_customer: false,
                          notif_operation: true,
                          taken_time: Date.now() - now,
                          param: {
                            msisdn: reformatMsisdn,
                            query: query,
                          },
                          step: `MSISDN result ${reformatMsisdn} from core`,
                          service: 'FUNCTION',
                          result: resp,
                        });
                      } else {
                        responseGlobal.code = resp.code;
                        responseGlobal.message = resp.message;
                        // responseGlobal.transaction_classify =
                        //   'GET_POINT_BALANCE';
                        responseGlobal.payload = payload;
                        _this.logger.error({
                          method: req.method,
                          statusCode: `${res.statusCode} - ${resp.code}`,
                          transaction_id: '',
                          notif_customer: false,
                          notif_operation: true,
                          taken_time: Date.now() - now,
                          param: {
                            msisdn: reformatMsisdn,
                            query: query,
                          },
                          step: resp.message,
                          service: 'FUNCTION',
                          result: resp,
                        });
                      }
                    } else {
                      responseGlobal.code = '';
                      responseGlobal.message = `${body.toString()} is not JSON format`;
                      // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
                      responseGlobal.payload = {};
                      _this.logger.verbose({
                        method: req.method,
                        statusCode: HttpStatus.BAD_REQUEST,
                        transaction_id: '',
                        notif_customer: false,
                        notif_operation: true,
                        taken_time: Date.now() - now,
                        param: {
                          msisdn: reformatMsisdn,
                          query: query,
                        },
                        step: `${body.toString()} is not JSON format`,
                        service: 'FUNCTION',
                        result: {},
                      });
                    }
                    resolve(responseGlobal);
                  }
                });
              });

              req.on('error', function (e: Error) {
                console.log(`Get into here ${e.message}`);
                responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                responseGlobal.message = e.message;
                // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
                responseGlobal.payload = {
                  trace_id: false,
                };

                _this.logger.error({
                  method: req.method,
                  statusCode: HttpStatus.BAD_REQUEST,
                  transaction_id: '',
                  notif_customer: false,
                  notif_operation: true,
                  taken_time: Date.now() - now,
                  param: {
                    msisdn: reformatMsisdn,
                    query: query,
                  },
                  step: e.message,
                  service: 'FUNCTION',
                  result: responseGlobal,
                });

                reject(responseGlobal);
              });

              req.end();
            });

            return responseGlobal;
          } else {
            responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            responseGlobal.message = 'member not found';
            // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
            responseGlobal.payload = {
              trace_id: false,
            };
            return responseGlobal;
          }
        })
        .catch((e: Error) => {
          console.log('Here?');
          console.log(e);
          responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
          responseGlobal.message = e.message;
          // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
          responseGlobal.payload = {
            trace_id: false,
          };
          return responseGlobal;
        });
    } else {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'msisdn wrong format';
      // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }
  }

  async customer_point_balance_v2(
    msisdn: string,
    query: ViewPointQueryDTO,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;

    const reformatMsisdn = msisdnCombineFormatted(msisdn); // check_member_core
    if (reformatMsisdn) {
      return await _this.customerService
        .getCustomerByMSISDN(reformatMsisdn, token)
        .then(async (customerDetail) => {
          if (customerDetail) {
            await new Promise(async (resolve, reject) => {
              const options = {
                method: 'GET',
                hostname: _this.raw_core,
                port: _this.raw_port > 0 ? _this.raw_port : null,
                path: `/gateway/v3.0/members/${customerDetail.core_id}/wallet?merchant_id=${_this.merchant}`,
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
                    if (isJson(body.toString())) {
                      const resp = JSON.parse(body.toString());
                      const resPayload = resp.payload.wallet;

                      const listOfPoint = [];
                      const amount = findProp(resPayload, 'amount', []);
                      const expireDate = findProp(
                        resPayload,
                        'expire_time',
                        [],
                      );

                      const skip = query.skip
                        ? parseInt(String(query.skip))
                        : 0;
                      let length = amount.length;
                      if (query.limit && query.limit < amount.length) {
                        length = parseInt(String(query.limit)) + skip;
                      }

                      for (let i = skip; i < length; i++) {
                        listOfPoint.push({
                          total_point: amount[i],
                          expired_date: expireDate[i]
                            ? new Date(expireDate[i]).toISOString().slice(0, 10)
                            : expireDate[i],
                        });
                      }

                      const pageSize = Math.ceil(amount.length / query.limit);
                      const pageNum = Math.floor(query.skip / query.limit + 1);
                      const payload = {
                        total_record: amount.length,
                        page_size: pageSize ? pageSize : 1,
                        page_number: pageNum ? pageNum : 1,
                        list_of_point: listOfPoint,
                        msisdn: msisdn,
                        tier: customerDetail.loyalty_tier[0]
                          ? customerDetail.loyalty_tier[0].name
                          : 'Silver',
                        bucket_type: query.bucket_type
                          ? query.bucket_type
                          : 'TelkomselPOIN',
                        bucket_id: 50000,
                        member_id: customerDetail._id.toHexString(),
                        member_core_id: customerDetail.core_id,
                        __v: resPayload.__v,
                      };

                      if (resp.code === 'S00000') {
                        responseGlobal.code = resp.code;
                        responseGlobal.message =
                          HttpMsgTransaction.DESC_CODE_SUCCESS;
                        responseGlobal.transaction_classify =
                          'GET_POINT_BALANCE';
                        responseGlobal.payload = payload;
                      } else {
                        responseGlobal.code = resp.code;
                        responseGlobal.message = resp.message;
                        responseGlobal.transaction_classify =
                          'GET_POINT_BALANCE';
                        responseGlobal.payload = payload;
                      }
                    } else {
                      responseGlobal.code = '';
                      responseGlobal.message = body.toString();
                      // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
                      responseGlobal.payload = {};
                    }
                    resolve(responseGlobal);
                  }
                });
              });

              req.on('error', function (e) {
                responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                responseGlobal.message = e.message;
                // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
                responseGlobal.payload = {
                  trace_id: false,
                };

                resolve(responseGlobal);
              });

              req.end();
            });

            return responseGlobal;
          } else {
            responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            responseGlobal.message = 'member not found';
            // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
            responseGlobal.payload = {
              trace_id: false,
            };
            return responseGlobal;
          }
        });
    } else {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'msisdn wrong format';
      // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }
  }

  async getCustomerTotalPointByCoreMemberId(
    core_member_id: string,
    token: string,
    point_type?: string,
  ): Promise<any> {
    let reward_item_id;

    if (point_type) {
      const lov = await this.lovService.getLovData(point_type);

      if (!lov) {
        return null;
      }

      reward_item_id = lov.additional.split('|')[1];
    }
    return await lastValueFrom(
      this.httpService
        .get(
          `${this.url}/members/${core_member_id}/wallet?merchant_id=${this.merchant}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
            },
          },
        )
        .pipe(
          map(async (res) => {
            let total = [];

            if (reward_item_id) {
              total = findProp(
                res.data.payload.wallet.pocket.reward[reward_item_id],
                'amount',
                [],
              );
            } else {
              total = findProp(res.data, 'amount', []);
            }

            return total.reduce((x, y) => x + y, 0);
          }),
          catchError(async (e: BadRequestException) => {
            throw new BadRequestException(e.message);
          }),
        ),
    );
  }

  async getCustomerTselPointBalance(
    msisdn: string,
    token: string,
  ): Promise<any> {
    const q = {
      limit: 10000,
      skip: 0,
      bucket_type: 'TelkomselPOIN',
      transaction_id: null,
      channel_id: null,
      filter: null,
      additional_param: null,
    };

    return await this.customer_point_balance(msisdn, q, token)
      .then(async (res) => {
        if (res && res.code == 'S00000') {
          return res.payload['list_of_point'].reduce((a, b) => {
            return a + b.total_point;
          }, 0);
        } else {
          // throw new Error(res.message);
          return 0;
        }
      })
      .catch((err: Error) => {
        console.log(err.message);
        throw new Error(err.message);
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

    const reformatMsisdn = msisdnCombineFormatted(param.msisdn); // check_member_core
    if (reformatMsisdn) {
      // const start = moment();
      // console.log(
      //   'Start PointHistory_GETCOREMEMBER - ' +
      //     start.format("YYYY-MM-DD HH:mm:ss'SSS"),
      // );

      return await _this.customerService
        .getCoreMemberByMsisdn(reformatMsisdn, token)
        .then(async (customerDetail) => {
          // console.log(
          //   'NFT PointHistory_GETCOREMEMBER - ' + moment().diff(start),
          // );

          if (customerDetail) {
            const core_id = customerDetail[0].id;
            const limit = query.limit
              ? query.limit === '0'
                ? 999999
                : parseInt(query.limit)
              : 5;
            const skip = parseInt(query.skip) ? parseInt(query.skip) : 0;
            const fromDate = query.from
              ? query.from
              : this.getISODate(this.minDateMonth(3));
            const toDate = query.to ? query.to : this.getISODate(new Date());

            return new Promise(async (resolve, reject) => {
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
                  query.type[0].toUpperCase() +
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
                        `"${
                          key === 'transaction_id' ? 'transaction_no' : key
                        }":"${resultFilter[key]}"`,
                    )
                    .join(',');
                  console.log(filterOutput, 'filterOutput');
                  filter = filter + `,${filterOutput}`;
                } catch (error) {
                  responseGlobal.code =
                    HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                  responseGlobal.message = error.message;
                  responseGlobal.payload = {
                    trace_id: false,
                  };
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

              console.log('CONFIG --> ', config);

              // const start = moment();
              // console.log(
              //   'Start PointHistory_GETLASTVALUE - ' +
              //     start.format("YYYY-MM-DD HH:mm:ss'SSS"),
              // );

              return await lastValueFrom(
                this.httpService.get(`${this.url}/transactions`, config).pipe(
                  map(async (response) => {
                    // console.log(
                    //   'NFT PointHistory_GETLASTVALUE - ' + moment().diff(start),
                    // );

                    const resp = response.data;
                    const resPayload = resp.payload['transactions'][0];
                    console.log('RESULT -->', resPayload);

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
                            // total:
                            //   data['amount'] < 0
                            //     ? Math.abs(data['amount'])
                            //     : data['amount'],
                            total: data['amount'] ? data['amount'] : 0,
                          };
                          transactions.push(transaction);

                          // store to local
                          const start = moment();
                          console.log(
                            'Start PointHistory_STORING - ' +
                              start.format("YYYY-MM-DD HH:mm:ss'SSS"),
                          );

                          // const customerPoinHistoryDTO =
                          //   new CustomerPoinHistoryDto({
                          //     transaction_id: data['id'],
                          //     transaction_no: data['transaction_no'],
                          //     type: data['type'],
                          //     action: data['action'],
                          //     channel: data['channel'],
                          //     status: data['status'],
                          //     core_id: core_id,
                          //     time: wibTimeHistory.format(
                          //       'YYYY-MM-DDTHH:mm:ss.SSSZZ',
                          //     ),
                          //     total: data['amount'] ? data['amount'] : 0,
                          //   });

                          // const customerPoinHistory =
                          //   new this.customerPoinHistoryModel(
                          //     customerPoinHistoryDTO,
                          //   );
                          // customerPoinHistory
                          //   .save()
                          //   .then(async (returning) => {
                          //     console.log("NFT PointHistory_STORING - " + moment().diff(start));

                          //     return returning;
                          //   })
                          //   .catch(() => {
                          //     //
                          //   });
                        }
                      }

                      const pageSize = Math.ceil(total / limit);
                      const pageNum = Math.floor(skip / limit + 1);

                      const responseGlobal = {
                        code: resp.code,
                        message: HttpMsgTransaction.DESC_CODE_SUCCESS,
                        payload: {
                          total_record: total,
                          page_size: pageSize ? pageSize : 1,
                          page_number: pageNum ? pageNum : 1,
                          list_of_transactions: transactions,
                        },
                      };

                      resolve(responseGlobal);
                    } else {
                      const responseGlobal = {
                        code: resp.code,
                        message: resp.message,
                        payload: resPayload,
                      };

                      resolve(responseGlobal);
                    }
                  }),
                  catchError(async (e) => {
                    console.log(e.data);
                    responseGlobal.code =
                      HttpCodeTransaction.CODE_INTERNAL_ERROR_500;
                    responseGlobal.message = e.message;
                    // responseGlobal.transaction_classify = 'GET_CUSTOMER_POIN_HISTORY';
                    responseGlobal.payload = {
                      trace_id: false,
                    };
                    return responseGlobal;
                  }),
                ),
              );
            });
          } else {
            responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            responseGlobal.message = 'customer not found';
            // responseGlobal.transaction_classify = 'GET_CUSTOMER_POIN_HISTORY';
            responseGlobal.payload = {
              trace_id: false,
            };
            return responseGlobal;
          }
        })
        .catch((e: Error) => {
          responseGlobal.code = HttpCodeTransaction.CODE_INTERNAL_ERROR_500;
          responseGlobal.message = e.message;
          responseGlobal.payload = {
            trace_id: false,
          };
          return responseGlobal;
        });
    } else {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'msisdn wrong format';
      // responseGlobal.transaction_classify = 'GET_CUSTOMER_POIN_HISTORY';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }
  }

  async new_customer_point_balance(
    msisdn: string,
    query: ViewPointQueryDTO,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    const _this = this;

    // get lovs by point type for filter query bucket_type
    // const lovDataBucketType = await this.lovService.getLovPrime({
    //   first: 0,
    //   rows: 5,
    //   sortField: 'created_at',
    //   sortOrder: 1,
    //   filters: {
    //     set_value: {
    //       value: query.bucket_type ? query.bucket_type : 'TelkomselPOIN',
    //       matchMode: 'contains',
    //     },
    //   },
    // });

    const lovDataBucketType = await this.lovService.getLovDetailByGroupAndValue(
      'POINT_TYPE',
      query.bucket_type ?? 'TelkomselPOIN',
    );

    console.log('lovDataBucketType', lovDataBucketType);

    // const rwditmId =
    //   lovDataBucketType.payload.data[0]?.additional.split('|')[1];
    const rwditmId = lovDataBucketType?.additional.split('|')[1];

    console.log('rwditmId', rwditmId);

    // query limit default 5
    query.limit =
      query.limit || query.limit === 0
        ? query.limit == 0
          ? 9999
          : query.limit
        : 5;

    const reformatMsisdn = msisdnCombineFormatted(msisdn); // check_member_core
    if (reformatMsisdn) {
      // get sistem config
      const is_ngix_cache = await this.applicationService.getConfig(
        CallApiConfig.NGINX_CACHE,
      );

      let localMember = null;
      if (!is_ngix_cache) {
        // Find account from local
        localMember = await this.customerModel.findOne({
          msisdn: reformatMsisdn,
        });
      }

      const config: AxiosRequestConfig = {
        params: {
          merchant_id: _this.merchant,
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
      };

      console.log(`Member local : ${localMember}`);

      if (localMember) {
        console.log(
          `get member ${reformatMsisdn} from core member detail by id`,
        );
        return await new Promise(async (resolve, reject) => {
          return await lastValueFrom(
            this.httpService
              .get(`${this.url}/members/${localMember['core_id']}`, config)
              .pipe(
                map(async (response) => {
                  const resp = response.data;
                  const resPayload = resp['payload'].member;

                  console.log(
                    `get member ${reformatMsisdn} detail customer by id`,
                    resPayload,
                  );

                  const listOfPoint = [];
                  const reward = resPayload?.wallet?.reward;
                  if (reward) {
                    const rwditm = reward[rwditmId] ? reward[rwditmId] : {};
                    const amount = findProp(rwditm, 'amount', []);
                    const expireDate = findProp(rwditm, 'expire_time', []);

                    const skip = query.skip ? parseInt(String(query.skip)) : 0;
                    let length = amount.length;
                    if (query.limit && query.limit < amount.length) {
                      length = parseInt(String(query.limit)) + skip;
                    }

                    for (let i = skip; i < length; i++) {
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

                    // const pageSize = Math.ceil(amount.length / query.limit);
                    // const pageNum = Math.floor(query.skip / query.limit + 1);

                    const pageSize = 1;
                    const pageNum = 1;

                    const payload = {
                      total_record: amount.length,
                      page_size: pageSize ? pageSize : 1,
                      page_number: pageNum ? pageNum : 1,
                      list_of_point: listOfPoint,
                      msisdn: msisdn.replace(/^0/, '62'),
                      // tier: resPayload['tier']
                      //   ? resPayload['tier']['current']['name']
                      //   : 'Silver',
                      tier:
                        resPayload['tier'] ??
                        (await this.applicationService.getConfig(
                          'DEFAULT_CUSTOMER_TIER',
                        )),
                      bucket_type: query.bucket_type
                        ? query.bucket_type
                        : 'TelkomselPOIN',
                      bucket_id: 50000,
                    };

                    if (resp['code'] === 'S00000') {
                      responseGlobal.code = resp['code'];
                      responseGlobal.message =
                        HttpMsgTransaction.DESC_CODE_SUCCESS;
                      // responseGlobal.transaction_classify =
                      //   'GET_POINT_BALANCE';
                      responseGlobal.payload = payload;
                    } else {
                      responseGlobal.code = resp['code'];
                      responseGlobal.message = resp['message'];
                      // responseGlobal.transaction_classify =
                      //   'GET_POINT_BALANCE';
                      responseGlobal.payload = payload;
                    }
                    resolve(responseGlobal);
                  } else {
                    responseGlobal.code = resp['code'];
                    responseGlobal.message =
                      HttpMsgTransaction.DESC_CODE_SUCCESS;
                    // responseGlobal.transaction_classify =
                    //   'GET_POINT_BALANCE';
                    responseGlobal.payload = {
                      total_record: 0,
                      page_size: 1,
                      page_number: 1,
                      list_of_point: [],
                      msisdn: msisdn.replace(/^0/, '62'),
                      tier: await this.applicationService.getConfig(
                        'DEFAULT_CUSTOMER_TIER',
                      ),
                      bucket_type: 'TelkomselPOIN',
                      bucket_id: 50000,
                    };

                    resolve(responseGlobal);
                  }
                }),
                catchError(async (e) => {
                  // console.log(`Status Code : ${e.response.statusCode}`);
                  // console.log(`Status : ${e.response.status}`);
                  if (e.response.status === HttpStatus.NOT_FOUND) {
                    // Member exist but wallet not found. Handle here
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
                      msisdn: msisdn.replace(/^0/, '62'),
                      tier: await this.applicationService.getConfig(
                        'DEFAULT_CUSTOMER_TIER',
                      ),
                      bucket_type: query.bucket_type
                        ? query.bucket_type
                        : 'TelkomselPOIN',
                      bucket_id: 50000,
                    };
                  } else {
                    // throw new BadRequestException(e.message);
                    console.log('<-- fail (no member local): get customer -->');
                    console.log(e.response);
                    console.log('<-- fail (no member local): get customer -->');

                    responseGlobal.code =
                      HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                    responseGlobal.message = e.message;
                    // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
                    responseGlobal.payload = {
                      trace_id: false,
                    };
                  }

                  resolve(responseGlobal);

                  // console.log('<-- fail (no member local): get customer -->');
                  // console.log(e);
                  // console.log('<-- fail (no member local): get customer -->');
                  //
                  // responseGlobal.code =
                  //   HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                  // responseGlobal.message = e.message;
                  // // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
                  // responseGlobal.payload = {
                  //   trace_id: false,
                  // };
                  //
                  // resolve(responseGlobal);
                }),
              ),
          );
        });
      } else {
        // If local member is exist
        console.log(
          `get member ${reformatMsisdn} from core member detail by msisdn`,
        );
        return await _this.customerService
          .getCoreMemberByMsisdn(reformatMsisdn, token, _this.merchant)
          .then(async (customerDetail) => {
            // console.log('< -- customer -- >');
            // console.log(customerDetail);
            // console.log('< -- customer -- >');
            console.log(
              `get member ${reformatMsisdn} detail customer by msisdn`,
              customerDetail,
            );
            if (customerDetail) {
              // console.log('< -- customer tier -- >');
              // console.log(customerDetail[0]['tier']['current']['name']);
              // console.log('< -- customer tier -- >');

              return await new Promise(async (resolve, reject) => {
                return await lastValueFrom(
                  this.httpService
                    .get(
                      `${this.url}/members/${customerDetail[0]['id']}/wallet`,
                      config,
                    )
                    .pipe(
                      map(async (response) => {
                        const resp = response.data;
                        const resPayload = resp['payload'].wallet;

                        console.log(
                          `get member ${reformatMsisdn} detail wallet`,
                          resPayload,
                        );

                        const listOfPoint = [];
                        const rwditm = resPayload.pocket.reward[rwditmId]
                          ? resPayload.pocket.reward[rwditmId]
                          : {};
                        const amount = findProp(rwditm, 'amount', []);
                        const expireDate = findProp(rwditm, 'expire_time', []);

                        const skip = query.skip
                          ? parseInt(String(query.skip))
                          : 0;
                        let length = amount.length;
                        if (query.limit && query.limit < amount.length) {
                          length = parseInt(String(query.limit)) + skip;
                        }

                        for (let i = skip; i < length; i++) {
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

                        const pageSize = Math.ceil(amount.length / query.limit);
                        const pageNum = Math.floor(
                          query.skip / query.limit + 1,
                        );
                        const payload = {
                          total_record: amount.length,
                          page_size: pageSize ? pageSize : 1,
                          page_number: pageNum ? pageNum : 1,
                          list_of_point: listOfPoint,
                          msisdn: msisdn.replace(/^0/, '62'),
                          // tier: customerDetail[0]['tier']
                          //   ? customerDetail[0]['tier']['current']['name']
                          //   : 'Silver',
                          tier:
                            customerDetail[0]['tier'] ??
                            (await this.applicationService.getConfig(
                              'DEFAULT_CUSTOMER_TIER',
                            )),
                          bucket_type: query.bucket_type
                            ? query.bucket_type
                            : 'TelkomselPOIN',
                          bucket_id: 50000,
                        };

                        if (resp['code'] === 'S00000') {
                          responseGlobal.code = resp['code'];
                          responseGlobal.message =
                            HttpMsgTransaction.DESC_CODE_SUCCESS;
                          // responseGlobal.transaction_classify =
                          //   'GET_POINT_BALANCE';
                          responseGlobal.payload = payload;
                        } else {
                          responseGlobal.code = resp['code'];
                          responseGlobal.message = resp['message'];
                          // responseGlobal.transaction_classify =
                          //   'GET_POINT_BALANCE';
                          responseGlobal.payload = payload;
                        }
                        resolve(responseGlobal);
                      }),
                      catchError(async (e) => {
                        // console.log(`Status Code : ${e.response.statusCode}`);
                        // console.log(`Status : ${e.response.status}`);
                        if (e.response.status === HttpStatus.NOT_FOUND) {
                          // Member exist but wallet not found. Handle here
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
                            msisdn: msisdn.replace(/^0/, '62'),
                            tier: await this.applicationService.getConfig(
                              'DEFAULT_CUSTOMER_TIER',
                            ),
                            bucket_type: query.bucket_type
                              ? query.bucket_type
                              : 'TelkomselPOIN',
                            bucket_id: 50000,
                          };
                        } else {
                          // throw new BadRequestException(e.message);
                          console.log(
                            '<-- fail (customer exists): get customer -->',
                          );
                          console.log(e.response);
                          console.log(
                            '<-- fail (customer exists): get customer -->',
                          );

                          responseGlobal.code =
                            HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
                          responseGlobal.message = e.message;
                          // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
                          responseGlobal.payload = {
                            trace_id: false,
                          };
                        }

                        resolve(responseGlobal);
                      }),
                    ),
                );
              });
            } else {
              const payload = {
                total_record: 0,
                page_size: 1,
                page_number: 1,
                list_of_point: [],
                msisdn: msisdn.replace(/^0/, '62'),
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

              // OLD CODE DEFAULT VALUE
              // throw new BadRequestException([
              //   { isNotFoundGeneral: 'Member not found' },
              // ]);
              // responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;

              // responseGlobal.message = 'member not found';
              // // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
              // responseGlobal.payload = {
              //   trace_id: false,
              // };
              return responseGlobal;
            }
          });
      }
    } else {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'msisdn wrong format';
      // responseGlobal.transaction_classify = 'GET_POINT_BALANCE';
      responseGlobal.payload = {
        trace_id: false,
      };
      return responseGlobal;
    }
  }

  async getCoreTransactionHistory(
    query: ViewPointHistoryCoreQueryDTO,
    token: string,
  ): Promise<any> {
    let response;
    console.log('<-- payload :: getCoreTransactionHistory -->');
    console.log('token : ', token);
    console.log('query : ', query);
    console.log('<-- payload ": getCoreTransactionHistory -->');

    let filter: any = {
      transaction_no: query.transaction_id,
    };
    filter = encodeURIComponent(JSON.stringify(filter));

    let addon: any = {
      remark: 1,
      amount: 1,
      reward_item_id: 1,
      reward_instance_id: 1,
    };
    addon = encodeURIComponent(JSON.stringify(addon));

    try {
      return await new Promise(async (resolve, reject) => {
        const options = {
          method: 'GET',
          hostname: this.raw_core,
          port: this.raw_port > 0 ? this.raw_port : null,
          path: `/gateway/v3.0/transactions?filter=${filter}&addon=${addon}`,
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
      console.log('<-- fail :: getCoreTransactionHistory -->');
      console.log(error);
      console.log('<-- fail :: getCoreTransactionHistory -->');
      return error;
    }
  }

  async notification_deduct(
    response: any,
    payload: any,
    fail = true,
    notification_template: string = null,
  ) {
    const step = response?.hasOwnProperty('step')
      ? response?.step
      : 'Deduct Process';
    const message = response?.hasOwnProperty('message')
      ? response?.message
      : response ?? '';

    if (fail) {
      // payload set origin success
      const origin = payload.origin + '.' + 'deduct_fail';
      payload.origin = origin;
      payload.error_message = message;

      if (notification_template) {
        payload.notification = await this.notifService.getNotificationTemplate(
          notification_template,
          payload,
        );
      } else {
        payload.notification = await this.notifService.getNotificationTemplate(
          NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER,
          payload,
        );
      }

      // Set Logging Failed
      this.save_to_logger({
        method: 'POST',
        statusCode: 400,
        service: 'DEDUCT_SYNC',
        payload: payload,
        step: `Step :: ${step}`,
        message: message,
        stack: response,
        is_success: false,
      });
    } else {
      // payload set origin success
      const origin = payload.origin + '.' + 'deduct_success';
      payload.origin = origin;

      if (notification_template) {
        payload.notification = await this.notifService.getNotificationTemplate(
          notification_template,
          payload,
        );
      } else {
        payload.notification = await this.notifService.getNotificationTemplate(
          NotificationTemplateConfig.REDEEM_SUCCESS_CUSTOMER,
          payload,
        );
      }

      // Set Logging Success
      // this.save_to_logger({
      //   payload : payload,
      //   statusStringCode : HttpStatusTransaction.CODE_SUCCESS,
      //   method: "POST",
      //   service : "DEDUCT_SYNC",
      //   step : `Step :: ${step}`,
      //   message : message,
      //   stack : response
      // })
    }

    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
  }

  async notification_refund(message: any, payload: any, fail = true) {
    if (fail) {
      // payload set origin success
      const origin = payload.origin + '.' + 'refund_fail';
      payload.origin = origin;
      payload.error_message = message;
      payload.notification = await this.notifService.getNotificationTemplate(
        'TRX_REFUND_FAILED',
        payload,
      );
    } else {
      // payload set origin success
      const origin = payload.origin + '.' + 'refund_success';
      payload.origin = origin;
      payload.notification = await this.notifService.getNotificationTemplate(
        'TRX_REFUND_SUCCESS',
        payload,
      );
    }

    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
  }

  async refundPointEmit(type, request, account, token) {
    return await this.point_refund(request, account, `Bearer ${token}`)
      .then(async (response) => {
        if (response.code === 'S00000') {
          const incoming: any = request;
          if (incoming) {
            incoming.point_refund = response?.payload['point_refund'];
          }

          const json = {
            transaction_classify: 'REFUND_POINT',
            origin: 'refund',
            program: response.payload['program'],
            keyword: response.payload['keyword'],
            customer: response.payload['customer'],
            endpoint: `/transactions/${type}/callback`,
            tracing_id: response.payload['trace_id'],
            tracing_master_id: response.payload['trace_id'],
            incoming: incoming,
            retry: {
              refund: {
                refund: 0,
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
            account: account,
            is_stock_deducted: true,
            submit_time: new Date().toISOString(),
            token: `Bearer ${token}`,
            payload: {
              refund: response.payload['core'],
            },
          };

          this.transactionMasterClient.emit(
            process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
            json,
          );
          this.clientRefundKafka.emit(process.env.KAFKA_REFUND_TOPIC, json);
        }

        return response;
      })
      .catch((e) => {
        return e;
      });
  }

  async save_to_logger(request: LoggingRequest) {
    // Need payload kafka
    // Set Request Validator Logging
    const result_default = {
      message: '-',
      stack: {},
    };

    result_default['message'] = request?.message;
    result_default['stack'] = request?.stack;

    request.payload = request?.payload ?? {};
    request.date_now = request?.date_now ?? Date.now();
    request.is_success = request?.is_success ?? true;
    request.step = request?.step ?? '';
    request.message = request?.message ?? '-';
    request.statusCode =
      request?.statusCode ?? request?.is_success
        ? HttpStatus.OK
        : HttpStatus.BAD_REQUEST;
    request.result = request?.result ? request?.result : result_default;
    request.status_trx = request.status_trx ?? '-';
    request.statusStringCode = request.statusStringCode ?? '';

    // Set Request Validator Logging

    const statusStringCode =
      request?.statusStringCode &&
      request?.statusStringCode != undefined &&
      request?.statusStringCode != 'undefined'
        ? request?.statusStringCode
        : request?.statusCode == 200
        ? HttpStatusTransaction.CODE_SUCCESS
        : '';
    const transaction_id = request.payload?.tracing_master_id;
    const account = request.payload?.account;
    const statusCode = `${request.statusCode} - ${statusStringCode}`;
    const url = request.payload?.endpoint;
    const msisdn = request.payload?.incoming?.msisdn;
    const param = {
      status_trx: request.status_trx,
      origin: request.payload?.origin,
      incoming: request.payload?.incoming,
      token: request.payload?.token,
      endpoint: request.payload?.endpoint,
      keyword: {
        eligibility: {
          name: request.payload?.keyword?.eligibility?.name,
          poin_value: request.payload?.keyword?.eligibility?.poin_value,
          poin_redeemed: request.payload?.keyword?.eligibility?.poin_redeemed,
        },
      },
      program: {
        name: request.payload?.program?.name,
      },
      account: account,
      notification: request.payload?.notification,
    };

    const logData: any = {
      method: request.method,
      statusCode: statusCode,
      transaction_id: transaction_id,
      notif_customer: false,
      notif_operation: false,
      taken_time: Date.now() - request.date_now,
      step: request.step,
      param: param,
      service: request.service,
      result: {
        msisdn: msisdn,
        url: url,
        result: request.result,
      },
    };

    if (request.is_success) {
      this.logger.verbose(logData);
    } else {
      this.logger.error(logData);
    }
  }

  /**
   * Earning to Core
   */
  async earning(payload: EarningPayloadDTO, token, retry = 0, isBatch = false) {
    const responseGlobal = new GlobalTransactionResponse();
    responseGlobal.payload = {};
    responseGlobal.message = '';
    responseGlobal.code = '';

    // Inject to target customer
    const payloadInject = {
      ...payload,
      realm_id: this.realm,
      branch_id: this.branch,
      merchant_id: this.merchant,
      __v: 0,
    };

    const targetUrl = `${this.tsel_url}/earn`;

    console.log('retry', retry);
    console.log('url', targetUrl);
    console.log('token', token);
    console.log('payloadInject', payloadInject);

    const start = new Date();
    return await lastValueFrom(
      this.httpService
        .post(`${this.tsel_url}/earn`, payloadInject, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        })
        .pipe(
          map(async (res) => {
            const resp = res.data;

            // print to logger
            const end = new Date();
            const takenTime = Math.abs(start.getTime() - end.getTime());
            await this.exceptionHandler.handle({
              statusCode: HttpStatus.OK,
              level: 'verbose',
              notif_operation: true,
              notif_customer: false,
              transaction_id: payload?.transaction_no,
              config: this.configService,
              taken_time: takenTime,
              payload: {
                transaction_id: payload?.transaction_no,
                statusCode: HttpStatus.OK,
                method: 'kafka',
                url: targetUrl,
                service: 'POIN',
                step: 'EARN TO CORE',
                taken_time: takenTime,
                param: {},
                result: {
                  statusCode: HttpStatus.OK,
                  level: 'verbose',
                  message: `Request BODY ${JSON.stringify(
                    payloadInject,
                  )}, Response : ${JSON.stringify(resp)}, Info : null`,
                  trace: payload?.transaction_no,
                },
              } satisfies LoggingData,
            });

            responseGlobal.code = resp['code'];
            responseGlobal.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
            responseGlobal.transaction_classify = 'INJECT_POINT';
            responseGlobal.payload = {
              trace_id: true,
            };

            if (isBatch) {
              await this.earningSuccessLog(
                payload,
                payloadInject,
                responseGlobal,
              );
            }

            return responseGlobal;
          }),
          catchError(async (e) => {
            console.error(`Failed earning`);
            console.log(e);

            // print to logger
            const end = new Date();
            const takenTime = Math.abs(start.getTime() - end.getTime());
            await this.exceptionHandler.handle({
              statusCode: HttpStatus.BAD_REQUEST,
              level: 'verbose',
              notif_operation: true,
              notif_customer: false,
              transaction_id: payload?.transaction_no,
              config: this.configService,
              taken_time: takenTime,
              payload: {
                transaction_id: payload?.transaction_no,
                statusCode: HttpStatus.BAD_REQUEST,
                method: 'kafka',
                url: targetUrl,
                service: 'POINT',
                step: 'EARN TO CORE FAILED',
                taken_time: takenTime,
                param: {},
                result: {
                  statusCode: HttpStatus.BAD_REQUEST,
                  level: 'verbose',
                  message: `Request BODY ${JSON.stringify(
                    payloadInject,
                  )}, Response : ${JSON.stringify(
                    e?.response?.data,
                  )}, Info : ${e}, Retry: ${retry}`,
                  trace: payload?.transaction_no,
                },
              } satisfies LoggingData,
            });

            if (!isBatch) {
              await this.earningFailedLog(payload, payloadInject, e);
            }

            const maxRetry =
              (await this.applicationService.getConfig(
                CallApiConfig.DEFAULT_CONST_MAX_RETRY_REQUEST_CORE,
              )) ?? 3;
            if (retry < maxRetry) {
              const hasRetry = retry + 1;
              return this.earning(payload, token, hasRetry);
            } else {
              await this.earningFailedLog(payload, payloadInject, e);
            }

            responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
            responseGlobal.message = e?.message;
            responseGlobal.payload = {
              trace_id: false,
            };

            return responseGlobal;
          }),
        ),
    );
  }

  async earningFailedLog(payload, payloadInject, error) {
    const transaction_id = payload?.transaction_no;

    const data = {
      msisdn: payload.msisdn,
      trx_id: transaction_id,
      transaction_name: PrepaidGranularTransactionEnum.EARN,
      status: PrepaidGranularLogEnum.FAIL,
      payload: payloadInject, // payload to core
      response: error?.response?.data, // error from core
      is_processed: false, // TODO
      processed_at: null, // TODO
    };

    await this.prepaidGranularLogModel
      .findOneAndUpdate(
        { trx_id: transaction_id },
        {
          ...data,
          updated_at: Date.now(),
        },
        { upsert: true, new: true },
      )
      .then((results) => {
        // console.log(results);
        return results;
      });
  }

  async earningSuccessLog(payload, payloadInject, response) {
    const transaction_id = payload?.transaction_no;

    const data = {
      msisdn: payload.msisdn,
      trx_id: transaction_id,
      transaction_name: PrepaidGranularTransactionEnum.EARN,
      status: PrepaidGranularLogEnum.SUCCESS,
      payload: payloadInject, // payload to core
      response: response, // error from core
      is_processed: true, // TODO
      processed_at: Date.now(),
    };

    await this.prepaidGranularLogModel
      .findOneAndUpdate(
        { trx_id: transaction_id },
        {
          ...data,
          updated_at: Date.now(),
        },
        { upsert: true, new: true },
      )
      .then((results) => {
        // console.log(results);
        return results;
      });
  }
}
