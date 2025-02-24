import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { ApplicationService } from '@/application/services/application.service';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  VoucherListFMCParamDTO,
  VoucherListFMCQueryDTO,
} from '@/transaction/dtos/voucher/voucher-list.fmc.dto';
import {
  Voucher,
  VoucherDocument,
} from '@/transaction/models/voucher/voucher.model';
const moment = require('moment-timezone');

import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';
import { Model } from 'mongoose';
import { catchError, lastValueFrom, map } from 'rxjs';

import { Account } from '@/account/models/account.model';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  FMC_reformatMsisdnCore,
  formatIndihomeNumberCore,
  formatMsisdnCore,
  msisdnCombineFormatted,
  msisdnCombineFormatToId,
} from '@/application/utils/Msisdn/formatter';
import { validateCustomerIdentifierNumber } from '@/application/utils/Msisdn/formatter';
import { CrmbRequestBodyDto } from '@/crmb/dtos/crmb.request.body.dto';
import { MainCrmbService } from '@/crmb/services/main.crmb.service';
import { CustomerService } from '@/customer/services/customer.service';
import { HttpCodeTransaction } from '@/dtos/global.http.status.transaction.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import {
  KeywordNotification,
  KeywordNotificationDocument,
} from '@/keyword/models/keyword.notification.model';
import { Outlet, OutletDocument } from '@/merchant/models/outlet.model';
import { MerchantV2Service } from '@/merchant/services/merchant.service.v2';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { FmcIdenfitiferType } from '@/transaction/dtos/point/fmc.member.identifier.type';
import { RedeemDTO } from '@/transaction/dtos/redeem/redeem.dto';
import { VerificationVoucherDTO } from '@/transaction/dtos/voucher/verification/verification.voucher.dto';
import {
  VerificationVoucher,
  VerificationVoucherDocument,
} from '@/transaction/models/voucher/verification.voucher.model';

import { RedeemService } from '../redeem/redeem.service';

@Injectable()
export class VoucherFmcService {
  private merchant: string;
  private notificationContentService: NotificationContentService;
  private customerService: CustomerService;
  private merchantService: MerchantV2Service;
  private redeemService: RedeemService;
  private client: ClientKafka;
  private httpService: HttpService;
  private url: string;
  constructor(
    @InjectModel(Voucher.name)
    private voucherModel: Model<VoucherDocument>,
    @InjectModel(KeywordNotification.name)
    private keywordNotificationModel: Model<KeywordNotificationDocument>,
    private applicationService: ApplicationService,
    private readonly callApiConfigService: CallApiConfigService,
    private mainCrmService: MainCrmbService,
    @InjectModel(Outlet.name)
    private outletModel: Model<OutletDocument>,
    private transactionOptional: TransactionOptionalService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    notificationContentService: NotificationContentService,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,
    customerService: CustomerService,
    merchantService: MerchantV2Service,
    @InjectModel(VerificationVoucher.name)
    private verificationVoucherModel: Model<VerificationVoucherDocument>,
    redeemService: RedeemService,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    httpService: HttpService,
  ) {
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.customerService = customerService;
    this.merchantService = merchantService;
    this.redeemService = redeemService;
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.notificationContentService = notificationContentService;
  }

  async voucher_list(
    //baru
    paramDto: VoucherListFMCParamDTO,
    queryDto: VoucherListFMCQueryDTO,
    token: string,
  ): Promise<GlobalTransactionResponse> {
    const responseGlobal = new GlobalTransactionResponse();
    const { isValid, message } = validateCustomerIdentifierNumber(
      paramDto.msisdn,
      queryDto.identifier,
    );

    if (!isValid) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = message;
      responseGlobal.payload = [
        {
          trace_id: false,
        },
      ];
      return responseGlobal;
    }

    let custNumbers = [
      { msisdn: paramDto.msisdn, ownership: '', binding_level: '' },
    ];

    if (queryDto.identifier?.toUpperCase() == FmcIdenfitiferType.TSEL_ID) {
      try {
        const services =
          await this.mainCrmService.getWalletSiblingsFromCoreMember(
            paramDto.msisdn,
            token,
          );
        if (
          services.message !== 'Success' ||
          services.payload['members'] == undefined
        ) {
          responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
          responseGlobal.message = services.message;
          responseGlobal.payload = [
            {
              trace_id: false,
            },
          ];
          return responseGlobal;
        }

        custNumbers = services.payload['members'][0]['result'].map((a: any) => {
          const msisdn = a.phone ?? '';
          const reformatMsisdn = msisdnCombineFormatToId(msisdn.split('|')[0]);
          const ownership = a.ownership_flag ?? '';
          const binding_level = a.binding_level ?? '';
          return {
            msisdn: reformatMsisdn,
            ownership: ownership,
            binding_level: binding_level,
          };
        });
      } catch (error) {
        console.log('[VOUCHER - CRMB LOG]');
        console.log(error);
        custNumbers = [];

        responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
        responseGlobal.payload = [
          {
            trace_id: false,
          },
        ];
        responseGlobal.message = 'Member not found';

        return responseGlobal;
      }

      // Below is for stub needs
      // const services = {
      //   responseCode: '0000',
      //   responseMessage: 'Success',
      //   transactionId: 'ESB041020192230220001',
      //   SiebelMessage: {
      //     MessageId: '',
      //     MessageType: '',
      //     IntObjectName: ' TSELSSOServicesTypeList',
      //     IntObjectFormat: 'Siebel Hierarchical',
      //     TSELSSOServicesTypeList: [
      //       {
      //         type: 'Postpaid',
      //         TSELSSOServicesList: [
      //           {
      //             serviceId: '199887766559',
      //             bindingLevel: '2',
      //             ownershipFlag: 'Owner',
      //             mainFlag: 'Y',
      //             bindDate: '20231009 22:34:24',
      //           },
      //           {
      //             serviceId: '6282276077304',
      //             bindingLevel: '1',
      //             ownershipFlag: '',
      //             mainFlag: '',
      //             bindDate: '20231009 22:34:24',
      //           },
      //         ],
      //       },
      //       {
      //         type: 'Orbit',
      //         TSELSSOServicesList: [
      //           {
      //             serviceId: '6281214558896',
      //             bindingLevel: '1',
      //             ownershipFlag: '',
      //             mainFlag: '',
      //             bindDate: '20231009 22:34:24',
      //           },
      //         ],
      //       },
      //     ],
      //   },
      // };
    }

    const reformatMsisdn = msisdnCombineFormatted(paramDto.msisdn);
    await this.customerService
      .getCoreMemberByMsisdn(reformatMsisdn, token, '', false)
      .then(async (customerDetail) => {
        if (customerDetail) {
          const ownership = customerDetail[0]['ownership_flag'] ?? '';
          const binding_level = customerDetail[0]['binding_level'] ?? '';
          custNumbers = [
            {
              msisdn: paramDto.msisdn,
              ownership: ownership,
              binding_level: binding_level,
            },
          ];
        } else {
          console.log(
            'Customer not found for get fields ownership & binding_level',
          );
        }
      })
      .catch((e: Error) => {
        console.log('error e2e to core ${e}');
      });

    const s1 = Date.now();
    console.log('=== Voucher List start ===');
    console.log('| Msisdn: ', paramDto.msisdn);

    const filters = queryDto.filter;

    if (queryDto.limit < 0) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'Limit Must More Than 1';
      responseGlobal.payload = [
        {
          trace_id: false,
        },
      ];
      return responseGlobal;
    } else if (queryDto.limit == 0) {
      const configLimit = await this.callApiConfigService.callConfig(
        'DEFAULT_LIMIT_PAGINATION',
      );
      queryDto.limit = configLimit ? configLimit : 5;
    }

    if (queryDto.skip < 0) {
      responseGlobal.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      responseGlobal.message = 'Skip Must be a Non-Negative Number';
      responseGlobal.payload = [
        {
          trace_id: false,
        },
      ];
      return responseGlobal;
    }

    const skip = Number(queryDto.skip ?? 0);
    const limit = Number(
      queryDto.limit && queryDto.limit != 0 ? queryDto.limit : 5,
    );

    const match = {
      // msisdn: { $in: [...custNumbers, '6282276077304'] },
      // master_id: queryDto.transaction_id ?? /.*/,
      $or: ['Redeem', 'Verified'].map((status) => ({ status })),
    };

    // if (queryDto?.channel_id) {
    //   match['responseBody.channel'] = queryDto.channel_id;
    // }

    const today = new Date();
    const threeMonthsAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 3,
      today.getDate(),
    );

    const endDate = new Date();
    match['start_time'] = {
      $gte: threeMonthsAgo,
      $lte: endDate,
    };

    const s2 = Date.now();
    if (filters) {
      const filterParse = JSON.parse(filters);

      // Filter based on voucher_status
      if (filterParse.hasOwnProperty('voucher_status')) {
        match['status'] = this.unConvertVoucherStatus(
          filterParse['voucher_status'],
        );
      }

      // Filter based on keyword_redeem
      if (filterParse.hasOwnProperty('keyword_redeem')) {
        match['keyword_name'] = filterParse['keyword_redeem'];
      }

      // Filter based on expired_date
      if (filterParse.hasOwnProperty('expired_date')) {
        match['end_time'] = {
          $gte: new Date(filterParse['expired_date']),
          $lte: new Date(filterParse['expired_date']),
        };
      }

      // Filter based on verfied date
      if (filterParse.hasOwnProperty('verified_date')) {
        match['verified_date'] = {
          $gte: new Date(filterParse['verified_date']),
          $lte: new Date(filterParse['verified_date']),
        };
      }

      // Filter range date on redeemed_date
      if (typeof filterParse['redeemed_date'] == 'object') {
        if (
          filterParse['redeemed_date'][0] &&
          filterParse['redeemed_date'][1]
        ) {
          if (
            filterParse['redeemed_date'][0] == filterParse['redeemed_date'][1]
          ) {
            const date = new Date(filterParse['redeemed_date'][1]);
            match['start_time'] = {
              $gte: new Date(filterParse['redeemed_date'][0]),
              $lt: new Date(date.setDate(date.getDate() + 1)),
            };
          } else {
            match['start_time'] = {
              $gte: new Date(filterParse['redeemed_date'][0]),
              $lte: new Date(filterParse['redeemed_date'][1]),
            };
          }
        }
      } else {
        // Filter based on redeemed_date
        if (filterParse.hasOwnProperty('redeemed_date')) {
          match['start_time'] = {
            $gte: new Date(filterParse['redeemed_date']),
            $lte: new Date(filterParse['redeemed_date']),
          };
        }
      }
    }

    const query: any = [];
    const filter_builder = { $and: [] };
    const filterSet = filters as any;

    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const condition = {};
        if (filterSet[a].matchMode === 'contains') {
          condition[a] = {
            $regex: new RegExp(`${filterSet[a].value}`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'notContains') {
          condition[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          };
        } else if (filterSet[a].matchMode === 'endsWith') {
          condition[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          };
        } else if (filterSet[a].matchMode === 'equals') {
          condition[a] = {
            $eq: filterSet[a].value,
          };
        } else if (filterSet[a].matchMode === 'notEquals') {
          condition[a] = {
            $ne: filterSet[a].value,
          };
        }

        filter_builder.$and.push(condition);
      }
    }
    console.log('| Query Builder (filter): ', this.getTime(s2));

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

    const s3 = Date.now();

    const facetQuery = {};
    for (let i = 0; i < custNumbers.length; i++) {
      match['msisdn'] = custNumbers[i]['msisdn'];
      facetQuery[custNumbers[i]['msisdn']] = [
        ...query,
        { $match: { ...match } },
      ];
    }
    const msisdnList = custNumbers.map((res) => res['msisdn']);
    const allData = await this.voucherModel.aggregate(
      [{ $match: { msisdn: { $in: msisdnList } } }, { $facet: facetQuery }],
      (err, result) => {
        if (err) {
          console.error(err);
        }
        console.log(result);
        return result;
      },
    );

    let allDataCount = {};
    if (allData.length > 0) {
      allDataCount = allData[0];
    }

    //const allData = await this.voucherModel.aggregate(
    //  [
    //    ...query,
    //    {
    //      $count: 'all',
    //    },
    //  ],
    //  (err, result) => {
    //    if (err) {
    //      console.error(err);
    //    }
    //    return result;
    //  },
    //);

    // const dataCount = allData.length > 0 ? allData[0].all : 0;

    //query.push({ $skip: skip });
    //query.push({ $limit: limit });
    for (let i = 0; i < custNumbers.length; i++) {
      facetQuery[custNumbers[i]['msisdn']].push({ $skip: skip });
      facetQuery[custNumbers[i]['msisdn']].push({ $limit: limit });
    }

    // console.log(query);
    const data = await this.voucherModel.aggregate(
      [{ $match: { msisdn: { $in: msisdnList } } }, { $facet: facetQuery }],
      (err, result) => {
        if (err) {
          console.error(err);
        }
        return result;
      },
    );

    console.log('| Query:', this.getTime(s3));
    console.log('=== QUERY ===', JSON.stringify(facetQuery));
    const maskLength = Number(
      (await this.applicationService.getConfig(
        `DEFAULT_VOUCHER_CODE_MASK_LENGTH`,
      )) ?? 0,
    );

    const s4 = Date.now();
    const responsePayload = [];
    if (data.length > 0) {
      for (let i = 0; i < custNumbers.length; i++) {
        const itemData = data[0][custNumbers[i]['msisdn']];
        const dataCount = allDataCount[custNumbers[i]['msisdn']].length;

        responsePayload.push({
          msisdn: custNumbers[i]['msisdn'],
          ownership: custNumbers[i]['ownership'],
          binding_level: custNumbers[i]['binding_level'],
          total_record: dataCount,
          page_size: Math.ceil(dataCount / limit),
          page_number: Math.floor(skip / limit + 1),
          list_of_voucher: itemData.map((item) => {
            const status = this.convertVoucherStatus(item.status);
            const voucher_code = item.responseBody.voucher_code;

            return {
              transaction_id: item.master_id,
              keyword_redeem: item.keyword_name,
              voucher_status: status,
              // Mask "Voucher Code" if voucher need to be verified.
              voucher_code:
                item.need_verification && item.status == 'Redeem'
                  ? this.maskText(voucher_code, maskLength)
                  : voucher_code,
              voucher_desc: item.responseBody.desc,
              redeemed_date: this.convertDate(item?.start_time),
              verified_date: this.convertDate(item?.verified_date),
              expired_date: this.convertDate(item?.end_time),
            };
          }),
        });
      }
    }

    const response = new GlobalTransactionResponse();
    // response.transaction_classify = 'VOUCHER_LIST';
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    response.payload = responsePayload;

    console.log('| Response:', this.getTime(s4));
    console.log('| Total execution time: ', this.getTime(s1));
    console.log('=== Voucher List End ===');

    return response;
  }

  async voucher_verification(
    request: VerificationVoucherDTO,
    account: Account,
    authToken: string,
    path: string,
  ) {
    // toString
    let endTime: Date;
    const startTime = new Date();
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'VOUCHER_VERIFICATION';
    response.trace_custom_code = 'TRX';

    const { isValid, message } = validateCustomerIdentifierNumber(
      request.msisdn,
      request.identifier,
    );

    if (!isValid) {
      response.code = HttpCodeTransaction.ERR_CUSTOMER_TYPE_400;
      response.message = message;
      response.payload = {
        trace_id: false,
      };
      return response;
    }

    const trace_id = this.transactionOptional.getTracingId(request, response);

    await this.loggerVoucherVerification(
      account,
      request,
      trace_id,
      `[${trace_id} - ${
        request.msisdn
      }] Start voucher verification. Data: ${JSON.stringify(request)}`,
      startTime,
    );

    // console.log('resquest : ', request);
    if (!request.msisdn) {
      response.code = HttpStatusTransaction.ERR_MSISDN_INVALID;
      response.message = 'MSISDN not found.';
      response.transaction_classify = 'VOUCHER_VERIFICATION';
      response.payload = {
        trace_id: trace_id,
      };
      await this.loggerVoucherVerification(
        account,
        request,
        trace_id,
        `[${trace_id} - ${request.msisdn}] MSISDN not found !`,
        startTime,
        true,
      );

      return response;
    }

    if (!request.merchant_id) {
      response.code = HttpStatusTransaction.ERR_MERCHANT_CODE_INVALID;
      response.message = 'Merchant not found.';
      response.transaction_classify = 'VOUCHER_VERIFICATION';
      response.payload = {
        trace_id: trace_id,
      };
      await this.loggerVoucherVerification(
        account,
        request,
        trace_id,
        `[${trace_id} - ${request.msisdn}] Merchant not found !`,
        startTime,
        true,
      );

      return response;
    }

    let payloadEmitNotif;
    if (request.keyword_verification) {
      const outletRes: any = await this.outletModel
        .findOne({ outlet_code: request.merchant_id })
        .exec();

      // console.log(outletRes);

      await this.loggerVoucherVerification(
        account,
        request,
        trace_id,
        `[${trace_id} - ${
          request.msisdn
        }] Checking outlet. Data: ${JSON.stringify(outletRes)}`,
        startTime,
      );

      if (outletRes) {
        const isKeywordVerifExist = await this.keywordNotificationModel.findOne(
          {
            keyword_name: request.keyword_verification,
          },
        );
        // console.log('isKeywordVerifExist : ', isKeywordVerifExist);
        // console.log('Keyword not found : ', !isKeywordVerifExist);
        if (!isKeywordVerifExist) {
          response.code = HttpStatusTransaction.ERR_KEYWORD_NOT_FOUND;
          response.message = 'Keyword not found.';
          response.transaction_classify = 'VOUCHER_VERIFICATION';
          response.payload = {
            trace_id: trace_id,
          };
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] Keyword not found!`,
            startTime,
            true,
          );

          return response;
        } else {
          console.log('');
        }

        const isMsisdnExist = await this.voucherModel.findOne({
          msisdn: request.msisdn,
          need_verification: true,
        });

        if (!isMsisdnExist) {
          response.code = HttpStatusTransaction.ERR_MSISDN_INVALID;
          response.message = 'MSISDN not found.';
          response.transaction_classify = 'VOUCHER_VERIFICATION';
          response.payload = {
            trace_id: trace_id,
          };
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] MSISDN not found !`,
            startTime,
            true,
          );

          return response;
        }
        // const merchantRes = await this.merchantOutletModel
        //   .findOne({ outlet: { $in: [outletRes._id.toString()] } })
        //   .exec();

        // const merchant_id = merchantRes.merchant.toString();
        let merchant_id = this.merchant;
        if (outletRes?.merchant_id) {
          merchant_id = outletRes?.merchant_id;
        } else {
          merchant_id = outletRes?.merchant_detail?._id.toString();
        }

        // const url = this.url + 'vouchers/verify';
        // let merchant = '';
        // if (merchant_id) {
        //   merchant = merchant_id;
        // } else {
        //   merchant = this.merchant;
        // }

        // const postData = {
        //   locale: request.locale,
        //   voucher_codes: [request.voucher_code],
        //   merchant_flag: true,
        //   __v: 0,
        //   owner_id: 'member-635668a6b27be98f136413c5',
        //   realm_id: this.realm,
        //   branch_id: this.branch,
        //   merchant_id: merchant,
        // };

        // check voucher
        const findPayload = {
          keyword_verification: request.keyword_verification,
          msisdn: request.msisdn,
          need_verification: true,
          status: 'Redeem',
          end_time: {
            $gte: moment().utc().toDate(),
          },
        };

        if (
          request.voucher_code !== 'null' &&
          request.voucher_code !== '' &&
          request.voucher_code !== null &&
          request.voucher_code !== undefined
        ) {
          findPayload['responseBody.voucher_code'] = request.voucher_code;

          const getVoucherCode = await this.voucherModel.findOne({
            'responseBody.voucher_code': request.voucher_code,
          });

          if (getVoucherCode) {
            if (getVoucherCode.status === 'Verified') {
              response.code =
                HttpStatusTransaction.ERR_VOUCHER_ALREADY_VERIFIED;
              response.message = 'Voucher Already Verified';

              response.payload = {
                keyword_verification: request.keyword_verification,
                msisdn: request.msisdn,
                trace_id: trace_id,
              };

              // === SEND NOTIF ===
              const notificationNotFound =
                await this.notificationContentService.getNotificationTemplate(
                  NotificationTemplateConfig?.VOUCHER_VER_NOT_FOUND,
                  {
                    keyword: {
                      notification: [],
                    },
                  },
                );

              this.notificationClient.emit(
                process.env.KAFKA_NOTIFICATION_TOPIC,
                {
                  origin: 'voucher.voucher_verification_fail',
                  // program: {},
                  keyword: {}, // TODO : dont delete <<<
                  customer: {}, // TODO : dont delete <<<
                  keyword_verification: request.keyword_verification,
                  endpoint: path,
                  tracing_id: trace_id,
                  tracing_master_id: trace_id,
                  account: account,
                  submit_time: new Date(),
                  token: authToken,
                  incoming: request,
                  notification: notificationNotFound,
                },
              );
              // === END SEND NOTIF ===

              return response;
            } else if (getVoucherCode.status === 'Expired') {
              response.code = HttpStatusTransaction.ERR_VOUCHER_ALREADY_EXPIRED;
              response.message = 'Voucher Expired';

              response.payload = {
                keyword_verification: request.keyword_verification,
                msisdn: request.msisdn,
                trace_id: trace_id,
              };

              // === SEND NOTIF ===
              const notificationNotFound =
                await this.notificationContentService.getNotificationTemplate(
                  NotificationTemplateConfig?.VOUCHER_VER_NOT_FOUND,
                  {
                    keyword: {
                      notification: [],
                    },
                  },
                );

              this.notificationClient.emit(
                process.env.KAFKA_NOTIFICATION_TOPIC,
                {
                  origin: 'voucher.voucher_verification_fail',
                  // program: {},
                  keyword: {}, // TODO : dont delete <<<
                  customer: {}, // TODO : dont delete <<<
                  keyword_verification: request.keyword_verification,
                  endpoint: path,
                  tracing_id: trace_id,
                  tracing_master_id: trace_id,
                  account: account,
                  submit_time: new Date(),
                  token: authToken,
                  incoming: request,
                  notification: notificationNotFound,
                },
              );
              // === END SEND NOTIF ===
              return response;
            }
          } else {
            response.code = HttpStatusTransaction.ERR_VOUCHER_MISSING;
            response.message = 'Voucher Not Registered';

            response.payload = {
              keyword_verification: request.keyword_verification,
              msisdn: request.msisdn,
              trace_id: trace_id,
            };

            // === SEND NOTIF ===
            const notificationNotFound =
              await this.notificationContentService.getNotificationTemplate(
                NotificationTemplateConfig?.VOUCHER_VER_NOT_FOUND,
                {
                  keyword: {
                    notification: [],
                  },
                },
              );

            this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, {
              origin: 'voucher.voucher_verification_fail',
              // program: {},
              keyword: {}, // TODO : dont delete <<<
              customer: {}, // TODO : dont delete <<<
              keyword_verification: request.keyword_verification,
              endpoint: path,
              tracing_id: trace_id,
              tracing_master_id: trace_id,
              account: account,
              submit_time: new Date(),
              token: authToken,
              incoming: request,
              notification: notificationNotFound,
            });
            // === END SEND NOTIF ===
            return response;
          }
        }

        console.log('findPayload voucher : ', findPayload);
        await this.loggerVoucherVerification(
          account,
          request,
          trace_id,
          `[${trace_id} - ${
            request.msisdn
          }] Find Voucher Payload: ${JSON.stringify(findPayload)}`,
          startTime,
        );

        const vouchers = await this.voucherModel
          .find(findPayload, { end_time: 1 })
          .sort({ end_time: 1 })
          .limit(1);

        console.log('vouchers  : ', vouchers);

        // console.log(vouchers, 'vouchers voucher');
        await this.loggerVoucherVerification(
          account,
          request,
          trace_id,
          `[${trace_id} - ${request.msisdn}] Voucher result (${
            vouchers.length
          }): ${JSON.stringify(vouchers)}`,
          startTime,
        );

        if (vouchers.length === 0) {
          if (
            request.voucher_code !== 'null' &&
            request.voucher_code !== '' &&
            request.voucher_code !== null &&
            request.voucher_code !== undefined
          ) {
            const getVoucherCode = await this.voucherModel.findOne({
              'responseBody.voucher_code': request.voucher_code,
            });

            // console.log('getVoucherCode : ', getVoucherCode);

            // if (getVoucherCode.status === 'Verifed') {
            //   response.code = HttpStatusTransaction.ERR_VOUCHER_MISSING;
            //   response.transaction_classify = 'VOUCHER_VERIFICATION';
            //   response.message = 'Voucher not registered';
            //   response.payload = {
            //     keyword_verification: request.keyword_verification,
            //     msisdn: request.msisdn,
            //     trace_id: trace_id,
            //   };
            // } else if (getVoucherCode.status === 'Expired') {
            // }

            if (vouchers.length === 0) {
              response.code = HttpStatusTransaction.ERR_VOUCHER_MISSING;
            } else {
              response.code =
                getVoucherCode.status === 'Verified'
                  ? HttpStatusTransaction.ERR_VOUCHER_ALREADY_VERIFIED
                  : getVoucherCode.status === 'Expired'
                  ? HttpStatusTransaction.ERR_VOUCHER_ALREADY_EXPIRED
                  : HttpStatusTransaction.ERR_VOUCHER_MISSING;
            }

            response.transaction_classify = 'VOUCHER_VERIFICATION';

            if (vouchers.length === 0) {
              response.message = 'Voucher Not Registered';
            } else {
              response.message =
                getVoucherCode.status === 'Verified'
                  ? 'Voucher Already Verified'
                  : getVoucherCode.status === 'Expired'
                  ? 'Voucher Expired'
                  : 'Voucher Not Registered';
            }

            response.payload = {
              keyword_verification: request.keyword_verification,
              msisdn: request.msisdn,
              trace_id: trace_id,
            };

            // === SEND NOTIF ===
            const notificationNotFound =
              await this.notificationContentService.getNotificationTemplate(
                NotificationTemplateConfig?.VOUCHER_VER_NOT_FOUND,
                {
                  keyword: {
                    notification: [],
                  },
                },
              );

            this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, {
              origin: 'voucher.voucher_verification_fail',
              // program: {},
              keyword: {}, // TODO : dont delete <<<
              customer: {}, // TODO : dont delete <<<
              keyword_verification: request.keyword_verification,
              endpoint: path,
              tracing_id: trace_id,
              tracing_master_id: trace_id,
              account: account,
              submit_time: new Date(),
              token: authToken,
              incoming: request,
              notification: notificationNotFound,
            });
            // === END SEND NOTIF ===

            endTime = new Date();
            console.log(
              `NFT_VerificationVouhcerService.voucher_verification = ${
                endTime.getTime() - startTime.getTime()
              } ms`,
            );

            await this.loggerVoucherVerification(
              account,
              request,
              trace_id,
              `[${request.msisdn}] ${response.message}! ${JSON.stringify(
                response,
              )}`,
              startTime,
              true,
            );

            return response;
          }

          response.code = HttpStatusTransaction.ERR_VOUCHER_MISSING;
          response.transaction_classify = 'VOUCHER_VERIFICATION';
          response.message = 'Voucher not registered';
          response.payload = {
            keyword_verification: request.keyword_verification,
            msisdn: request.msisdn,
            trace_id: trace_id,
          };

          // === SEND NOTIF ===
          const notificationNotFound =
            await this.notificationContentService.getNotificationTemplate(
              NotificationTemplateConfig?.VOUCHER_VER_NOT_FOUND,
              {
                keyword: {
                  notification: [],
                },
              },
            );

          this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, {
            origin: 'voucher.voucher_verification_fail',
            // program: {},
            keyword: {}, // TODO : dont delete <<<
            customer: {}, // TODO : dont delete <<<
            keyword_verification: request.keyword_verification,
            endpoint: path,
            tracing_id: trace_id,
            tracing_master_id: trace_id,
            account: account,
            submit_time: new Date(),
            token: authToken,
            incoming: request,
            notification: notificationNotFound,
          });
          // === END SEND NOTIF ===

          endTime = new Date();
          console.log(
            `NFT_VerificationVouhcerService.voucher_verification = ${
              endTime.getTime() - startTime.getTime()
            } ms`,
          );

          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${
              request.msisdn
            }] Voucher Verification not found! ${JSON.stringify(response)}`,
            startTime,
            true,
          );

          return response;
        }

        // check expired
        const firstVoucher = vouchers[0];
        const getVoucherbyId = await this.voucherModel.findOne({
          _id: firstVoucher._id,
        });
        const getKeyword = await this.keywordModel.findOne({
          'eligibility.name': getVoucherbyId.keyword_name,
        });
        // const reformatMsisdn = formatMsisdnCore(getVoucherbyId.msisdn);
        const reformatMsisdn = FMC_reformatMsisdnCore(getVoucherbyId.msisdn);
        const getCustomer = await this.customerService.getCustomerByMSISDN(
          reformatMsisdn,
          authToken,
        );

        const getMerchant = await this.merchantService.detail(
          getKeyword.eligibility.merchant,
        );
        const isExpired = await this.isExpired(firstVoucher._id);
        // console.log('isExpired', isExpired);
        await this.loggerVoucherVerification(
          account,
          request,
          trace_id,
          `[${trace_id} - ${request.msisdn}] Voucher isExpired? ${isExpired}`,
          startTime,
        );

        payloadEmitNotif = {
          keyword: getKeyword,
          keyword_verification: request.keyword_verification,
          outlet_name: outletRes?.outlet_name,
          payload: {
            coupon: getMerchant,
            voucher: {
              core: getVoucherbyId.responseBody,
            },
          },
          redeem: {
            send_notification: true,
          },
          customer: getCustomer,
          incoming: {
            locale: 'en-US',
            channel_id: request?.channel_id,
            msisdn: getCustomer.msisdn,
            identifier: request.identifier?.toUpperCase(),
            keyword: getKeyword.eligibility.name,
            send_notification: true,
          },
          tracing_id: trace_id,
          tracing_master_id: trace_id,
          submit_time: new Date().toISOString(),
        };

        // await this.loggerVoucherVerification(
        //   account,
        //   request,
        //   trace_id,
        //   `[${
        //     request.msisdn
        //   }] Payload for base notification. Data: ${JSON.stringify(
        //     payloadEmitNotif,
        //   )}`,
        //   startTime,
        // );

        if (isExpired) {
          // console.log('expire agung : ', getVoucherbyId);
          await this.voucherModel.findByIdAndUpdate(firstVoucher._id, {
            $set: {
              status: 'Expired',
              outlet_code: outletRes?.outlet_code,
              outlet_name: outletRes?.outlet_name,
            },
          });

          await this.updateVoucherStatus(getVoucherbyId, authToken, 'Expire');

          const notification_group_expired =
            NotificationTemplateConfig?.VOUCHER_VER_EXPIRED;
          const dataNotifExpired =
            await this.notificationContentService.getNotificationTemplate(
              notification_group_expired,
              {
                keyword: {
                  notification: [],
                },
              },
            );

          payloadEmitNotif.notification = dataNotifExpired;

          this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, {
            origin: 'voucher.voucher_verification_fail',
            ...payloadEmitNotif,
          });

          // console.log('Berhasil Kirim Notif And Update Status Expired');

          response.code = HttpStatusTransaction.ERR_VOUCHER_EXPIRE;
          response.transaction_classify = 'VOUCHER_VERIFICATION';
          response.message = 'Sorry, the voucher has expired';
          response.payload = {
            keyword_verification: request.keyword_verification,
            msisdn: request.msisdn,
            trace_id: trace_id,
          };

          endTime = new Date();
          console.log(
            `NFT_VerificationVouhcerService.voucher_verification = ${
              endTime.getTime() - startTime.getTime()
            } ms`,
          );

          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] Voucher is expired!`,
            startTime,
            true,
          );

          return response;
          // throw new BadRequestException([{ isExpired: 'Voucher is Expired' }]);
        }

        if (merchant_id && request.keyword_verification && request.msisdn) {
          // console.log('1. Verifying using merchant id, keyword, msisdn');
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] 1. Verifying using merchant id, keyword, msisdn`,
            startTime,
          );

          const merchantCheck = await this.keywordModel.findOne({
            'eligibility.merchant': merchant_id.toString(),
          });
          // console.log(`Searching for keyword ${merchantCheck}`);
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] Searching for keyword: ${merchantCheck?.eligibility.name}`,
            startTime,
          );

          // const outletCheck = await this.merchantOutletModel.findOne({
          //   outlet: merchant_id,
          // });
          if (merchantCheck) {
            // console.log('1a. Verifying using merchant id');
            await this.loggerVoucherVerification(
              account,
              request,
              trace_id,
              `[${trace_id} - ${request.msisdn}] 1a. Verifying using merchant id`,
              startTime,
            );

            // const voucherUpdate = await this.voucherModel
            //   .findOneAndUpdate(
            //     {
            //       keyword_verification: request.keyword_verification,
            //       msisdn: request.msisdn,
            //       merchant_id: merchant_id,
            //       need_verification: true,
            //       status: 'Redeem',
            //     },
            //     {
            //       $set: { status: 'Verified', verified_date: new Date() },
            //     },
            //     {
            //       sort: { end_time: 1 },
            //     },
            //   )
            const voucherUpdate = await this.voucherModel
              .findByIdAndUpdate(firstVoucher._id, {
                $set: {
                  status: 'Verified',
                  verified_date: new Date(),
                  outlet_code: outletRes?.outlet_code,
                  outlet_name: outletRes?.outlet_name,
                },
              })
              .then(async (result) => {
                // console.log('result agung verif : ', result);
                await this.updateVoucherStatus(result, authToken, 'Use');
                // console.log('1.b Add Voucher Verification Database');
                await this.loggerVoucherVerification(
                  account,
                  request,
                  trace_id,
                  `[${trace_id} - ${request.msisdn}] 1b. Add Voucher Verification Database`,
                  startTime,
                );

                // add to database
                new this.verificationVoucherModel({
                  ...request,
                  voucher_code: result.responseBody['voucher_code'],
                  master_id: trace_id,
                  voucher_id: result._id,
                }).save();

                // bonus redemption
                if (request.keyword_bonus) {
                  // console.log('1.c Redemption');
                  await this.loggerVoucherVerification(
                    account,
                    request,
                    trace_id,
                    `[${trace_id} - ${request.msisdn}] 1c. Redemtion with ${request.keyword_bonus}`,
                    startTime,
                  );

                  const data_redeem: RedeemDTO = {
                    locale: '',
                    msisdn: '',
                    keyword: '',
                    total_redeem: 0,
                    total_bonus: null,
                    redeem_type: '',
                    adn: '',
                    send_notification: false,
                    transaction_id: '',
                    channel_id: undefined,
                    callback_url: '',
                    additional_param: {},
                    transaction_source: '',
                    package_name: '',
                  };

                  data_redeem.msisdn = request.msisdn;
                  data_redeem.keyword = request.keyword_bonus;

                  const redeem = await this.redeemService
                    .redeem_v2(data_redeem, account, authToken)
                    .then(async (res) => {
                      await this.redeemService.emit_process(res, {
                        path: path,
                        token: authToken,
                        data: data_redeem,
                        account,
                        applicationService: this.applicationService,
                        client: this.client,
                        origin: 'redeem',
                      });

                      response.code = HttpStatusTransaction.CODE_SUCCESS;
                      response.message = 'Success';
                      response.transaction_classify = 'VOUCHER_VERIFICATION';
                      response.payload = {
                        voucher_code: result.responseBody['voucher_code'],
                        msisdn: result.msisdn,
                        merchant_id: result['merchant_id'],
                        trace_id: trace_id,
                        transaction_date: result.updated_at,
                      };

                      await this.loggerVoucherVerification(
                        account,
                        request,
                        trace_id,
                        `[${
                          request.msisdn
                        }] 1c. Redemtion success! ${JSON.stringify(response)}`,
                        startTime,
                      );

                      return response;
                    });
                  return redeem;
                }

                const notification_group_success =
                  NotificationTemplateConfig?.VOUCHER_VER_SUCCESS;
                const dataNotifSuccess =
                  await this.notificationContentService.getNotificationTemplate(
                    notification_group_success,
                    {
                      keyword: getKeyword,
                    },
                  );

                payloadEmitNotif.notification = dataNotifSuccess;

                await this.notificationClient.emit(
                  process.env.KAFKA_NOTIFICATION_TOPIC,
                  {
                    origin: 'voucher.voucher_verification_success',
                    ...payloadEmitNotif,
                  },
                );

                response.code = HttpStatusTransaction.CODE_SUCCESS;
                response.message = 'Success';
                response.transaction_classify = 'VOUCHER_VERIFICATION';
                response.payload = {
                  voucher_code: result.responseBody['voucher_code'],
                  msisdn: result.msisdn,
                  merchant_id: result['merchant_id'],
                  trace_id: trace_id,
                  transaction_date: result.updated_at,
                };

                await this.loggerVoucherVerification(
                  account,
                  request,
                  trace_id,
                  `[${
                    request.msisdn
                  }] 1d. Verification success! ${JSON.stringify(response)}`,
                  startTime,
                );

                return response;
              })
              .catch(async (err) => {
                await this.loggerVoucherVerification(
                  account,
                  request,
                  trace_id,
                  `[${trace_id} - ${
                    request.msisdn
                  }] 1. An error occured! ${JSON.stringify(err)}`,
                  startTime,
                  true,
                );

                throw new BadRequestException([
                  { isNotFound: 'Keyword Not Found' },
                ]);
              });

            endTime = new Date();

            console.log(
              `NFT_VerificationVouhcerService.voucher_verification = ${
                endTime.getTime() - startTime.getTime()
              } ms`,
            );

            return voucherUpdate;
            /*
          } else if (outletCheck) {
            console.log('1b. Verifying using outlet id');
            const voucherUpdate = await this.voucherModel
              .findOneAndUpdate(
                {
                  keyword_verification: request.keyword_verification,
                  msisdn: request.msisdn,
                  merchant_id: outletCheck.merchant,
                  need_verification: true,
                  status: 'Redeem',
                },
                {
                  $set: { status: 'Verified', verified_date: new Date() },
                },
                {
                  sort: { end_time: 1 },
                },
              )
              .then(async (result) => {
                // add to database
                new this.verificationVoucherModel({
                  ...request,
                  voucher_code: result.responseBody['voucher_code'],
                  master_id: trace_id,
                  voucher_id: result._id,
                }).save();

                // bonus redemption
                if (request.keyword_bonus) {
                  console.log('1.c Redemption');
                  const data_redeem: RedeemDTO = {
                    locale: '',
                    msisdn: '',
                    keyword: '',
                    total_redeem: 0,
                    redeem_type: '',
                    adn: '',
                    send_notification: false,
                    transaction_id: '',
                    channel_id: undefined,
                    callback_url: '',
                    additional_param: {},
                  };
                  data_redeem.msisdn = request.msisdn;
                  data_redeem.keyword = request.keyword_bonus;

                  const redeem = await this.redeemService
                    .redeem_v2(data_redeem, account, authToken)
                    .then(async (res) => {
                      await this.redeemService.emit_process(res, {
                        path: path,
                        token: authToken,
                        data: data_redeem,
                        account,
                        applicationService: this.applicationService,
                        client: this.client,
                        origin: 'redeem',
                      });

                      response.code = HttpStatusTransaction.CODE_SUCCESS;
                      response.message = 'Success';
                      response.transaction_classify = 'VOUCHER_VERIFICATION';
                      response.payload = {
                        voucher_code: result.responseBody['voucher_code'],
                        msisdn: result.msisdn,
                        merchant_id: result['merchant_id'],
                        trace_id: trace_id,
                        transaction_date: result.updated_at,
                      };
                      return response;
                    });
                  return redeem;
                }

                response.code = HttpStatusTransaction.CODE_SUCCESS;
                response.message = 'Success';
                response.transaction_classify = 'VOUCHER_VERIFICATION';
                response.payload = {
                  voucher_code: result.responseBody['voucher_code'],
                  msisdn: result.msisdn,
                  merchant_id: result['merchant_id'],
                  trace_id: trace_id,
                  transaction_date: result.updated_at,
                };
                return response;
              })
              .catch((err) => {
                response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
                response.message = 'Failed';
                response.transaction_classify = 'VOUCHER_VERIFICATION';
                response.payload = {
                  err: err,
                  trace_id: trace_id,
                };
                return response;
              });

            return voucherUpdate;
          */
          } else {
            throw new BadRequestException([
              { isMerchantNotFound: 'Merchant Not Found' },
            ]);
          }
        } else if (request.keyword_verification && request.msisdn) {
          // console.log('2. Verifying using keyword and msisdn');
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] 2. Verifying using keyword and msisdn`,
            startTime,
          );

          const voucherUpdate = await this.voucherModel
            .findByIdAndUpdate(firstVoucher._id, {
              $set: {
                status: 'Verified',
                verified_date: new Date(),
                outlet_code: outletRes?.outlet_code,
                outlet_name: outletRes?.outlet_name,
              },
            })
            .then(async (result) => {
              // console.log('result agung verif 1 : ', result);
              await this.updateVoucherStatus(result, authToken, 'Use');
              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${request.msisdn}] 2b. Add voucher verification database`,
                startTime,
              );

              // add to database
              new this.verificationVoucherModel({
                ...request,
                voucher_code: result.responseBody['voucher_code'],
                master_id: trace_id,
                voucher_id: result._id,
              }).save();

              // bonus redemption
              if (request.keyword_bonus) {
                // console.log('1.c Redemption');
                await this.loggerVoucherVerification(
                  account,
                  request,
                  trace_id,
                  `[${trace_id} - ${request.msisdn}] 2c. Redemtion with ${request.keyword_bonus}`,
                  startTime,
                );

                const data_redeem: RedeemDTO = {
                  locale: '',
                  msisdn: '',
                  keyword: '',
                  total_redeem: 0,
                  total_bonus: null,
                  redeem_type: '',
                  adn: '',
                  send_notification: false,
                  transaction_id: '',
                  channel_id: undefined,
                  callback_url: '',
                  additional_param: {},
                  transaction_source: '',
                  package_name: '',
                };

                data_redeem.msisdn = request.msisdn;
                data_redeem.keyword = request.keyword_bonus;

                const redeem = await this.redeemService
                  .redeem_v2(data_redeem, account, authToken)
                  .then(async (res) => {
                    await this.redeemService.emit_process(res, {
                      path: path,
                      token: authToken,
                      data: data_redeem,
                      account,
                      applicationService: this.applicationService,
                      client: this.client,
                      origin: 'redeem',
                    });

                    response.code = HttpStatusTransaction.CODE_SUCCESS;
                    response.message = 'Success';
                    response.transaction_classify = 'VOUCHER_VERIFICATION';
                    response.payload = {
                      voucher_code: result.responseBody['voucher_code'],
                      msisdn: result.msisdn,
                      merchant_id: result['merchant_id'],
                      trace_id: trace_id,
                      transaction_date: result.updated_at,
                    };

                    await this.loggerVoucherVerification(
                      account,
                      request,
                      trace_id,
                      `[${
                        request.msisdn
                      }] 2c. Redemtion success! ${JSON.stringify(response)}`,
                      startTime,
                    );

                    return response;
                  });
                return redeem;
              }

              const notification_group_success =
                NotificationTemplateConfig?.VOUCHER_VER_SUCCESS;
              const dataNotifSuccess =
                await this.notificationContentService.getNotificationTemplate(
                  notification_group_success,
                  {
                    keyword: getKeyword,
                  },
                );

              payloadEmitNotif.notification = dataNotifSuccess;

              await this.notificationClient.emit(
                process.env.KAFKA_NOTIFICATION_TOPIC,
                {
                  origin: 'voucher.voucher_verification_success',
                  ...payloadEmitNotif,
                },
              );

              response.code = HttpStatusTransaction.CODE_SUCCESS;
              response.message = 'Success';
              response.transaction_classify = 'VOUCHER_VERIFICATION';
              response.payload = {
                voucher_code: result.responseBody['voucher_code'],
                msisdn: result.msisdn,
                merchant_id: result['merchant_id'],
                trace_id: trace_id,
                transaction_date: result.updated_at,
              };

              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${
                  request.msisdn
                }] 2d. Verification success! ${JSON.stringify(response)}`,
                startTime,
              );

              return response;
            })
            .catch(async (err) => {
              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${
                  request.msisdn
                }] 2. An error occured! ${JSON.stringify(err)}`,
                startTime,
                true,
              );

              throw new BadRequestException([
                { isNotFound: 'Keyword Not Found' },
              ]);
            });

          endTime = new Date();
          console.log(
            `NFT_VerificationVouhcerService.voucher_verification = ${
              endTime.getTime() - startTime.getTime()
            } ms`,
          );

          return voucherUpdate;
        } else if (
          request.keyword_verification &&
          request.voucher_code !== 'null' &&
          request.voucher_code !== '' &&
          request.voucher_code !== null &&
          request.voucher_code !== undefined
        ) {
          // console.log('3. Verifying using keyword and voucher code');
          await this.loggerVoucherVerification(
            account,
            request,
            trace_id,
            `[${trace_id} - ${request.msisdn}] 3. Verifying using keyword and voucher code`,
            startTime,
          );

          // const voucherUpdate = await this.voucherModel
          //   .findOneAndUpdate(
          //     {
          //       keyword_verification: request.keyword_verification,
          //       'responseBody.voucher_code': request.voucher_code,
          //       need_verification: true,
          //       status: 'Redeem',
          //     },
          //     {
          //       $set: { status: 'Verified', verified_date: new Date() },
          //     },
          //     {
          //       sort: { end_time: 1 },
          //     },
          //   )
          const voucherUpdate = await this.voucherModel
            .findByIdAndUpdate(firstVoucher._id, {
              $set: {
                status: 'Verified',
                verified_date: new Date(),
                outlet_code: outletRes?.outlet_code,
                outlet_name: outletRes?.outlet_name,
              },
            })
            .then(async (result) => {
              // console.log('result agung verif 2 : ', result);
              await this.updateVoucherStatus(result, authToken, 'Use');
              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${request.msisdn}] 3b. Add voucher verification database`,
                startTime,
              );

              // add to database
              new this.verificationVoucherModel({
                ...request,
                voucher_code: result.responseBody['voucher_code'],
                master_id: trace_id,
                voucher_id: result._id,
              }).save();

              // bonus redemption
              if (request.keyword_bonus) {
                // console.log('1.c Redemption');
                await this.loggerVoucherVerification(
                  account,
                  request,
                  trace_id,
                  `[${trace_id} - ${request.msisdn}] 3c. Redemtion with ${request.keyword_bonus}`,
                  startTime,
                );

                const data_redeem: RedeemDTO = {
                  locale: '',
                  msisdn: '',
                  keyword: '',
                  total_redeem: 0,
                  total_bonus: null,
                  redeem_type: '',
                  adn: '',
                  send_notification: false,
                  transaction_id: '',
                  channel_id: undefined,
                  callback_url: '',
                  additional_param: {},
                  transaction_source: '',
                  package_name: '',
                };

                data_redeem.msisdn = result.msisdn;
                data_redeem.keyword = request.keyword_bonus;

                const redeem = await this.redeemService
                  .redeem_v2(data_redeem, account, authToken)
                  .then(async (res) => {
                    await this.redeemService.emit_process(res, {
                      path: path,
                      token: authToken,
                      data: data_redeem,
                      account,
                      applicationService: this.applicationService,
                      client: this.client,
                      origin: 'redeem',
                    });

                    response.code = HttpStatusTransaction.CODE_SUCCESS;
                    response.message = 'Success';
                    response.transaction_classify = 'VOUCHER_VERIFICATION';
                    response.payload = {
                      voucher_code: result.responseBody['voucher_code'],
                      msisdn: result.msisdn,
                      merchant_id: result['merchant_id'],
                      trace_id: trace_id,
                      transaction_date: result.updated_at,
                    };

                    await this.loggerVoucherVerification(
                      account,
                      request,
                      trace_id,
                      `[${
                        request.msisdn
                      }] 3c. Redemtion success! ${JSON.stringify(response)}`,
                      startTime,
                    );

                    return response;
                  });
                return redeem;
              }

              const notification_group_success =
                NotificationTemplateConfig?.VOUCHER_VER_SUCCESS;
              const dataNotifSuccess =
                await this.notificationContentService.getNotificationTemplate(
                  notification_group_success,
                  {
                    keyword: getKeyword,
                  },
                );

              payloadEmitNotif.notification = dataNotifSuccess;

              await this.notificationClient.emit(
                process.env.KAFKA_NOTIFICATION_TOPIC,
                {
                  origin: 'voucher.voucher_verification_success',
                  ...payloadEmitNotif,
                },
              );

              response.code = HttpStatusTransaction.CODE_SUCCESS;
              response.message = 'Success';
              response.transaction_classify = 'VOUCHER_VERIFICATION';
              response.payload = {
                voucher_code: result.responseBody['voucher_code'],
                msisdn: result.msisdn,
                merchant_id: result['merchant_id'],
                trace_id: trace_id,
                transaction_date: result.updated_at,
              };

              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${
                  request.msisdn
                }] 3d. Verification success! ${JSON.stringify(response)}`,
                startTime,
              );

              return response;
            })
            .catch(async (err) => {
              await this.loggerVoucherVerification(
                account,
                request,
                trace_id,
                `[${trace_id} - ${
                  request.msisdn
                }] 1. An error occured! ${JSON.stringify(err)}`,
                startTime,
                true,
              );

              throw new BadRequestException([
                { isNotFound: 'Keyword Not Found' },
              ]);
            });

          endTime = new Date();
          console.log(
            `NFT_VerificationVouhcerService.voucher_verification = ${
              endTime.getTime() - startTime.getTime()
            } ms`,
          );

          return voucherUpdate;
        }
      } else {
        response.code = HttpStatusTransaction.ERR_MERCHANT_CODE_INVALID;
        response.message = 'Outlet Code does not Registered.';
        response.transaction_classify = 'VOUCHER_VERIFICATION';
        response.payload = {
          trace_id: trace_id,
        };

        await this.loggerVoucherVerification(
          account,
          request,
          trace_id,
          `[${trace_id} - ${request.msisdn}] Outlet code not registered!`,
          startTime,
          true,
        );

        return response;
      }
    } else {
      response.code = HttpStatusTransaction.ERR_KEYWORD_NOT_FOUND;
      response.message = 'Keyword not found.';
      response.transaction_classify = 'VOUCHER_VERIFICATION';
      response.payload = {
        trace_id: trace_id,
      };

      endTime = new Date();
      console.log(
        `NFT_VerificationVouhcerService.voucher_verification = ${
          endTime.getTime() - startTime.getTime()
        } ms`,
      );

      await this.loggerVoucherVerification(
        account,
        request,
        trace_id,
        `[${trace_id} - ${request.msisdn}] Keyword does not registered!`,
        startTime,
        true,
      );

      return response;
    }
  }

  async loggerVoucherVerification(
    account: any,
    payload: any,
    tracing_id: any,
    message: any,
    start: any,
    isError: any = false,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());

    console.log(message);

    await this.exceptionHandler.handle({
      level: isError ? 'warn' : 'verbose',
      notif_operation: true,
      notif_customer: false,
      transaction_id: tracing_id,
      config: this.configService,
      taken_time: takenTime,
      statusCode: isError ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
      payload: {
        transaction_id: tracing_id,
        statusCode: isError ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
        method: 'POST',
        url: '/v1/voucher/verification',
        service: 'GATEWAY',
        step: message,
        param: payload,
        taken_time: takenTime,
        result: {
          statusCode: isError ? HttpStatus.BAD_REQUEST : HttpStatus.OK,
          level: isError ? 'error' : 'verbose',
          message: message,
          trace: tracing_id,
          msisdn: payload.msisdn,
          user_id: new IAccount(account ?? null),
        },
      } satisfies LoggingData,
    });
  }

  async updateVoucherStatus(payload: any, authToken: string, status: any) {
    const response = new GlobalTransactionResponse();

    const data = await this.getVoucherId(payload, authToken);
    console.log('data voucher : ', data?.voucher);

    const payloadPatch = {
      merchant_id: data?.voucher?.merchant_id,
      status: status,
      __v: data?.voucher?.__v,
    };

    return await lastValueFrom(
      await this.httpService
        .patch<any>(`${this.url}/vouchers/${data?.voucher?.id}`, payloadPatch, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        })
        .pipe(
          map(async (result) => {
            const resultData = result.data;
            console.log('agung voucher data  response : ', resultData);
            return resultData;
          }),
          catchError(async (e) => {
            // console.log('agung 1 error  :', e);
            response.code = e?.response?.data.code;
            response.message = e?.response?.data.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };
            return response;
          }),
        ),
    );
  }

  async getVoucherId(payload: any, authToken: string) {
    const response = new GlobalTransactionResponse();
    const query = [
      `projection={"voucher_code" : 1}`,
      `realm_id=${payload.responseBody.realm_id}`,
      `branch_id=${payload.responseBody.branch_id}`,
      `merchant_id=${payload.responseBody.merchant_id}`,
    ];

    console.log(
      'url get voucher : ',
      `${this.url}/vouchers/${payload.id}?${query.join('&')}`,
    );

    return await lastValueFrom(
      this.httpService
        .get(`${this.url}/vouchers/${payload.id}?${query.join('&')}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: authToken,
          },
        })
        .pipe(
          map(async (res) => {
            return res.data.payload;
          }),
          catchError(async (e) => {
            // console.log('agung 1 error  :', e);
            response.code = e?.response?.data.code;
            response.message = e?.response?.data.message;
            response.transaction_classify = 'VOUCHER';
            response.payload = {
              trace_id: false,
            };
            return response;
          }),
        ),
    );
  }

  private convertVoucherStatus(status: string): string {
    switch (status) {
      case 'Available':
        return 'A'; // Active
      case 'Active':
        return 'A'; // Active
      case 'Redeem':
        return 'R'; // Redeem
      case 'Verified':
        return 'V'; // Verified -> V, On core that status is "Use"
      case 'Expire':
        return 'E'; // Expire
      default:
        return status;
    }
  }

  private unConvertVoucherStatus(status: string): string {
    switch (status) {
      // case 'A':
      //   return 'Available'; // Active
      case 'A':
        return 'Active'; // Active
      case 'R':
        return 'Redeem'; // Redeem
      case 'V':
        return 'Verified'; // Verified -> V, On core that status is "Use"
      case 'E':
        return 'Expire'; // Expire
      default:
        return status;
    }
  }

  private getTime(start) {
    const end = Date.now();
    return `Execution time: ${end - start} ms`;
  }

  private convertDate(date: string): Date {
    if (date == null) return null;

    const timezone = 'Asia/Jakarta';
    return moment
      .tz(moment.utc(date), timezone)
      .format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  }

  private maskText(text: string, length: number): string {
    return text?.replace(
      new RegExp(`.{${length}}$`),
      [...Array(length).keys()].map(() => 'X').join(''),
    );
  }

  private async isExpired(id) {
    const voucher = await this.voucherModel.findById(id);
    const voucherEndDate = moment.utc(voucher.end_time);
    const today = moment.utc();
    const diff = voucherEndDate.diff(today, 'milliseconds');

    console.log('today', today.format());
    console.log('voucherEndDate', voucherEndDate.format());
    console.log(
      `Voucher Expiration -> Comparing ${today.format(
        'DD-MM-YYYY HH:mm:ss',
      )} with ${voucherEndDate.format(
        'DD-MMM-YYYY HH:mm:ss.SSS',
      )} with diff ${diff} seconds`,
    );

    if (diff <= 0) {
      return true;
    }
    return false;
  }
}
