import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { log } from 'console';
import { randomUUID } from 'crypto';
import { Model, now } from 'mongoose';

import { Account } from '@/account/models/account.model';
import { ApplicationService } from '@/application/services/application.service';
import {
  allowedMSISDN,
  formatMsisdnCore, msisdnCombineFormatted,
} from '@/application/utils/Msisdn/formatter';
import { CustomerService } from '@/customer/services/customer.service';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { KeywordService } from '@/keyword/services/keyword.service';
import { LovService } from '@/lov/services/lov.service';
import { Merchant, MerchantDocument } from '@/merchant/models/merchant.model';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import {
  InjectCoupon,
  InjectCouponDocument,
} from '@/transaction/models/inject.coupon.model';

const http =
  process.env.CORE_BACK_END_HTTP_MODE === 'https'
    ? require('https')
    : require('http');

@Injectable()
export class Coupon2Service {
  private httpService: HttpService;
  private url: string;
  private realm: string;
  private branch: string;
  private merchant: string;
  private coupon_prefix: string;
  private coupon_product: string;
  private product: string;
  private raw_core: string;
  private raw_port: number;
  private logger = new Logger('HTTP');
  private programService: ProgramServiceV2;
  private keywordService: KeywordService;
  private lovService: LovService;

  constructor(
    @InjectModel(InjectCoupon.name)
    private injectCouponModel: Model<InjectCouponDocument>,
    @InjectModel(Merchant.name)
    private merchantModel: Model<MerchantDocument>,
    @Inject('COUPON_SERVICE_PRODUCER')
    private readonly clientCoupon: ClientKafka,
    @Inject('COUPON_HIGH_SERVICE_PRODUCER')
    private readonly clientCouponHigh: ClientKafka,
    @Inject('COUPON_LOW_SERVICE_PRODUCER')
    private readonly clientCouponLow: ClientKafka,
    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,

    @Inject('REPORTING_STATISTIC_PRODUCER')
    private readonly clientReporting: ClientKafka,
    
    programService: ProgramServiceV2,
    httpService: HttpService,
    configService: ConfigService,
    keywordService: KeywordService,
    lovService: LovService,
    private customerService: CustomerService,
    private transactionOptional: TransactionOptionalService,
    private applicationService: ApplicationService,
  ) {
    this.httpService = httpService;
    this.programService = programService;
    this.keywordService = keywordService;
    this.lovService = lovService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.coupon_prefix = `${configService.get<string>(
      'core-backend.coupon_prefix.id',
    )}`;
    this.coupon_product = `${configService.get<string>(
      'core-backend.coupon_product.id',
    )}`;
    this.product = `${configService.get<string>('core-backend.product.id')}`;
  }

  async inject_coupon(
    request: any,
    account: Account,
    token: string,
    path?: string,
    emit_action = true,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.transaction_classify = 'INJECT_COUPON';
    response.trace_custom_code = 'TRX';
    // create channel_id
    if (request.channel_id) {
      request.channel_id = request?.channel_id
        ? request?.channel_id.toUpperCase()
        : '';
      console.log('channel id coupon ', request.channel_id);
    }

    if (request?.keyword) {
      request.keyword = request.keyword.toUpperCase();
      console.log('Keyword uppercase: ', request.keyword);
    }

    const trace_id = this.transactionOptional.getTracingId(request, response);

    if (request.total_coupon < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Total Coupon Must +' },
      ]);
    }

    return await this.keywordService
      .findKeywordByNameWithRedis(request.keyword)
      .then(async (keyConf) => {
        if (keyConf) {
          response.code = HttpStatusTransaction.CODE_SUCCESS;

          let customer = {};
          const reformatMsisdn = msisdnCombineFormatted(request.msisdn);
          if (reformatMsisdn) {
            console.log(`Used token: ${token}`);
            customer = await this.customerService
              .getCustomerByMSISDN(reformatMsisdn, token)
              .then(async (customerDetail) => customerDetail)
              .catch((e) => {
                console.log(e);
              });
          }

          response.message = 'Success';
          response.payload = {
            trace_id: trace_id,
            core: request,
            keyword: keyConf,
            program: await this.programService.findProgramByIdWithRedis(
              keyConf.eligibility.program_id,
            ),
            customer: customer,
            campaign: null,
          };

          if (emit_action) {
            this.emit_process(response, {
              token: token,
              path: path,
              data: request,
              account,
              applicationService: null,
              client: this.clientCoupon,
              origin: 'inject_coupon',
              is_request_from_batch: false,
            });
          }
          // response.payload = {
          //   trace_id: trace_id,
          //   keyword: keyConf,
          //   customer: customer,
          // };
        } else {
          response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
          response.message = 'Failed, Data keyword is not found';
          response.transaction_classify = 'INJECT_COUPON';
          response.trace_custom_code = 'PGCR';
          response.payload = {
            core: '',
            reward: '',
            trace_id: trace_id,
          };
        }

        return response;
      })
      .catch((e) => {
        response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
        response.message = e.message;
        response.transaction_classify = 'INJECT_COUPON';
        response.trace_custom_code = 'CPN';
        response.payload = {
          core: '',
          reward: '',
          trace_id: trace_id,
        };

        return response;
      });
  }

  async inject_coupon_simple(
    request: any,
    account: Account,
    token: string,
    path?: string,
    emit_action = true,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();

    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.transaction_classify = 'INJECT_COUPON';
    response.trace_custom_code = 'TRX';

    const trace_id = this.transactionOptional.getTracingId(request, response);

    if (request.channel_id) {
      request.channel_id = request?.channel_id
        ? request?.channel_id.toUpperCase()
        : '';
    }

    if (request?.keyword) {
      request.keyword = request.keyword.toUpperCase();

      // cek keyword
      const keywordExist = await this.keywordService.checkKeywordNameExist(
        request.keyword,
      );
      if (!keywordExist) {
        response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
        response.message = 'Failed, Data keyword is not found';
        response.transaction_classify = 'INJECT_COUPON';
        response.trace_custom_code = 'PGCR';
        response.payload = {
          core: '',
          reward: '',
          trace_id: trace_id,
        };

        return response;
      }
    }

    if (request.total_coupon < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Total Coupon Must +' },
      ]);
    }

    try {
      // check keyword priority
      const priorityKeyword =
        await this.applicationService.checkKeywordPriority(request.keyword);

      const json = {
        trace_id: trace_id,
        tracing_master_id: trace_id,
        transaction_classify: 'INJECT_COUPON',
        trace_custom_code: 'CPN',
        origin: 'inject_coupon',
        program: null,
        keyword: null,
        customer: null,
        endpoint: path,
        tracing_id: trace_id,
        incoming: request,
        account: account,
        submit_time: new Date().toISOString(),
        token: token,
        retry: {
          deduct: {
            counter: 0,
            errors: [],
          },
          refund: {
            counter: 0,
            errors: [],
          },
          inject_point: {
            counter: 0,
            errors: [],
          },
          donation: {
            counter: 0,
            errors: [],
          },
          coupon: {
            counter: 0,
            errors: [],
          },
        },
        payload: {
          coupon: null,
          mbp: null,
        },
        campaign: null,
      };

      if (emit_action) {
        const key = randomUUID();
        console.log('KEY_KAFKA_EMIT --> ', key);

        const keyword_priority = priorityKeyword
          ? priorityKeyword?.priority?.toUpperCase()
          : 'DEFAULT';

        if (keyword_priority === 'HIGH') {
          this.clientCouponHigh.emit(process.env.KAFKA_COUPON_HIGH_TOPIC, {
            key: key,
            value: json,
          });
        } else if (keyword_priority === 'LOW') {
          this.clientCouponLow.emit(process.env.KAFKA_COUPON_LOW_TOPIC, {
            key: key,
            value: json,
          });
        } else {
          this.clientCoupon.emit(process.env.KAFKA_COUPON_TOPIC, {
            key: key,
            value: json,
          });
        }

        // this.clientCoupon.emit(process.env.KAFKA_COUPON_TOPIC, json);
        // this.transactionMasterClient.emit(
        //   process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
        //   json,
        // );
      }

      // response dibawah
      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Success';
      response.payload = {
        trace_id: trace_id,
      };

      return response;
    } catch (e) {
      response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      response.message = e.message;
      response.transaction_classify = 'INJECT_COUPON';
      response.trace_custom_code = 'CPN';
      response.payload = {
        core: '',
        reward: '',
        trace_id: trace_id,
      };

      return response;
    }
  }

  async payload_to_coupon(payload, bonus, request) {
    const merchant = payload.keyword.eligibility?.merchant
      ? await this.merchantModel.findById(payload.keyword.eligibility?.merchant)
      : null;
    const date = new Date();

    const msisdn = payload['customer'].msisdn
      ? payload['customer'].msisdn
      : request.msisdn;

    // TODO: add formating to replace 62 to 0
    return {
      locale: 'en-US',
      type: 'Coupon',
      transaction_no: payload['trace_id'],
      prefix: this.coupon_prefix ? this.coupon_prefix : 'CP',
      owner_phone: `${formatMsisdnCore(msisdn)}|ID|+62`,
      owner_id: payload['customer'].core_id,
      owner_name: msisdn.replace('62', '0'),
      product_name: `${this.coupon_prefix}_${date.toISOString()}`,
      remark: payload?.keyword?.eligibility?.name,
      merchant_name: merchant?.company_name ? merchant?.company_name : 'SL',
      expiry: {
        expire_type: 'endof',
        expire_endof: {
          value: 12,
          unit: 'month',
        },
      },
      product_id: this.coupon_product,
      realm_id: this.realm,
      branch_id: this.branch,
      merchant_id: this.merchant,
    };
  }

  async payload_to_mbp(payload, bonus, mbp) {
    const merchant = payload.keyword.eligibility?.merchan
      ? await this.merchantModel.findById(payload.keyword.eligibility?.merchant)
      : null;
    const date = new Date();

    return {
      locale: 'en-US',
      type: 'MBP',
      transaction_no: payload['trace_id'],
      prefix: 'MBP',
      owner_phone: `${formatMsisdnCore(payload['customer'].msisdn)}|ID|+62`,
      owner_id: payload['customer'].core_id,
      owner_name: payload['customer'].msisdn,
      product_name: `${this.coupon_prefix}_${date.toISOString()}`,
      merchant_name: merchant?.company_name ? merchant?.company_name : 'SL',
      bank_code: mbp['bank_code'],
      ip_address: mbp['ip_address'],
      length: mbp['digit_coupon'],
      combination: mbp['combination_coupon'],
      expiry: {
        expire_type: 'endof',
        expire_endof: {
          value: 12,
          unit: 'month',
        },
      },
      product_id: this.coupon_product,
      realm_id: this.realm,
      branch_id: this.branch,
      merchant_id: this.merchant,
    };
  }

  async emit_process(
    response,
    config: {
      token;
      path;
      data;
      account;
      applicationService;
      client;
      origin;
      is_request_from_batch: boolean;
    },
  ) {
    if (response.code === 'S00000') {
      let coupon = null;
      let mbp = null;
      const bonus = response.payload['keyword']['bonus'];

      response.payload['customer'].msisdn = config.data.msisdn;
      if (bonus.length > 0) {
        for (const single_bonus of bonus) {
          switch (single_bonus.bonus_type) {
            case 'lucky_draw':
              coupon = await this.payload_to_coupon(
                response.payload,
                single_bonus,
                config.data,
              );
              break;
            case 'mbp':
              mbp = await this.payload_to_mbp(
                response.payload,
                config.data,
                single_bonus,
              );
            default:
              break;
          }
        }
      }

      const program = response.payload['program'];
      const campaign = response.payload['campaign'];

      const json = {
        trace_id: response.payload['trace_id'],
        tracing_master_id: response.payload['trace_id'],
        transaction_classify: 'INJECT_COUPON',
        trace_custom_code: 'CPN',
        origin: 'inject_coupon',
        program: program,
        keyword: response.payload['keyword'],
        customer: response.payload['customer'],
        endpoint: config.path,
        tracing_id: await response.payload['trace_id'],
        incoming: config.data,
        account: config.account,
        submit_time: new Date().toISOString(),
        token: config.token,
        retry: {
          deduct: {
            counter: 0,
            errors: [],
          },
          refund: {
            counter: 0,
            errors: [],
          },
          inject_point: {
            counter: 0,
            errors: [],
          },
          donation: {
            counter: 0,
            errors: [],
          },
          coupon: {
            counter: 0,
            errors: [],
          },
        },
        payload: {
          coupon: coupon,
          mbp: mbp,
        },
        campaign: campaign,
      };

      if (config.is_request_from_batch === true) {
        this.clientCouponLow.emit(process.env.KAFKA_COUPON_LOW_TOPIC, json);
      } else {
        this.clientCoupon.emit(process.env.KAFKA_COUPON_TOPIC, json);
      }

      this.transactionMasterClient.emit('transaction_master', json);
    }

    delete response.payload['campaign'];
    return response;
  }

  async computeCouponSummary(msisdn, keyword = undefined) {
    // emit to reporting statistic
    const payload: any = {
      transaction_status: 'Success',
      transaction_classify: 'COUPON_SUMMARY',
      msisdn: msisdn,
    }
    if (keyword) {
      payload.keyword = keyword;
    }
    this.clientReporting.emit(process.env.KAFKA_REPORTING_STATISTIC_TOPIC, payload);
  }
}
