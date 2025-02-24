import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Parser } from 'csv-parse';
import { createReadStream } from 'fs';
import { Model } from 'mongoose';
import mongoose from 'mongoose';

import { Account } from '@/account/models/account.model';
import {
  BatchProcessEnum,
  BatchProcessLog,
  BatchProcessLogDocument,
} from '@/application/models/batch.log.model';
import { ApplicationService } from '@/application/services/application.service';
import {
  allowedIndihomeNumber,
  allowedMSISDN,
  formatMsisdnCore,
} from '@/application/utils/Msisdn/formatter';
import { formatMsisdnToID } from '@/application/utils/Msisdn/formatter';
import { validationKeywordPointValueRule } from '@/application/utils/Validation/keyword.validation';
import { CustomerService } from '@/customer/services/customer.service';
import { HttpMsgTransaction } from '@/dtos/global.http.status.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  KeywordNotification,
  KeywordNotificationDocument,
} from '@/keyword/models/keyword.notification.model';
import { KeywordService } from '@/keyword/services/keyword.service';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import { Merchant, MerchantDocument } from '@/merchant/models/merchant.model';
import { OTPService } from '@/otp/services/otp.service';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { ViewPointQueryDTO } from '@/transaction/dtos/point/view_current_balance/view.current.balance.property.dto';
import { RedeemDTO } from '@/transaction/dtos/redeem/redeem.dto';
import { VoucherBatchDto } from '@/transaction/dtos/voucher/voucher.batch.dto';
import { VoucherDTO } from '@/transaction/dtos/voucher/voucher.dto';
import { InjectPoint } from '@/transaction/models/point/inject.point.model';
import {
  CheckRedeem,
  CheckRedeemDocument,
} from '@/transaction/models/redeem/check.redeem.model';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';
import { VoteService } from '@/vote/services/vote.service';

import { MaxModeConstant } from '../../../../constants/constant';
import { DonationService } from '../donation/donation.service';
import { PointService } from '../point/point.service';

@Injectable()
export class RedeemService {
  private httpService: HttpService;
  private lovService: LovService;
  private keywordService: KeywordService;
  private programService: ProgramServiceV2;
  private pointService: PointService;
  private donationService: DonationService;
  private voteService: VoteService;

  private url: string;
  private branch: string;
  private realm: string;
  private merchant: string;
  private coupon_prefix: string;
  private coupon_product: string;
  private product: string;

  constructor(
    @InjectModel(BatchProcessLog.name)
    private batchProcessLog: Model<BatchProcessLogDocument>,
    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,
    @InjectModel(Merchant.name)
    private merchantModel: Model<MerchantDocument>,
    @InjectModel(KeywordNotification.name)
    private keywordNotificationModel: Model<KeywordNotificationDocument>,

    @InjectModel(CheckRedeem.name)
    private checkRedeem: Model<CheckRedeemDocument>,

    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,

    private customerService: CustomerService,
    httpService: HttpService,
    configService: ConfigService,
    programService: ProgramServiceV2,
    keywordService: KeywordService,
    lovService: LovService,
    pointService: PointService,
    donationService: DonationService,
    voteService: VoteService,
    private transactionOptional: TransactionOptionalService,
    private applicationService: ApplicationService,
    private otpService: OTPService,

    @Inject('DEDUCT_SERVICE_PRODUCER')
    private readonly clientDeduct: ClientKafka,

    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly clientTransactionMaster: ClientKafka,

    @Inject('ELIGIBILITY_SERVICE_PRODUCER')
    private readonly clientEligibility: ClientKafka,

    @Inject('REDEEM_HIGH_SERVICE_PRODUCER')
    private readonly clientRedeemHigh: ClientKafka,

    @Inject('REDEEM_LOW_SERVICE_PRODUCER')
    private readonly clientRedeemLow: ClientKafka,

    @Inject('REDEEM_SERVICE_PRODUCER')
    private readonly clientRedeem: ClientKafka,

    @Inject('REDEEM_FMC_SERVICE_PRODUCER')
    private readonly clientRedeemFmc: ClientKafka,

    @Inject('VOID_PRODUCER')
    private readonly clientVoid: ClientKafka,

    @Inject('NOTIFICATION_PRODUCER')
    private readonly clientNotification: ClientKafka,
  ) {
    this.httpService = httpService;
    this.keywordService = keywordService;
    this.programService = programService;
    this.lovService = lovService;
    this.pointService = pointService;
    this.donationService = donationService;
    this.voteService = voteService;

    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.coupon_prefix = `${configService.get<string>(
      'core-backend.coupon_prefix.id',
    )}`;
    this.coupon_product = `${configService.get<string>(
      'core-backend.coupon_product.id',
    )}`;
    this.product = `${configService.get<string>('core-backend.product.id')}`;
  }

  async redeem(
    request: any,
    account: Account,
    token = '',
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'REDEEM';
    response.trace_custom_code = 'TRX';

    const trace_id = this.transactionOptional.getTracingId(request, response);

    const newData = new this.redeemModel({
      ...request,
      tracing_id: trace_id.replace('TRX', 'RDM'),
      master_id: trace_id,
      created_by: account,
    });

    return await newData
      .save()
      .catch((e: BadRequestException) => {
        console.log(e.message);
        throw new BadRequestException(e.message); //Error untuk mongoose
      })
      .then(async (redeem) => {
        response.code = HttpStatusTransaction.CODE_SUCCESS;
        response.payload = {
          trace_id: trace_id,
          redeem: redeem,
        };

        // Eligibility check consider to be pass waiting for core subscriber profile module
        return await this.keywordService
          .findKeywordByName(request.keyword)
          .then(async (keyConf) => {
            if (keyConf) {
              // Kafka Register job to deduct
              // If bonus type is auction should register to specific consumer with high prior
              // Deduct point by what wallet?

              response.code = HttpStatusTransaction.CODE_SUCCESS;
              //Prepare for deduction
              const program = await this.programService.findProgramById(
                keyConf.eligibility.program_id,
              );
              const getRewardId = async () => {
                let additional = '';
                const data = {
                  reward_item_id: '',
                  reward_instance_id: '',
                  status: false,
                };
                const lov = await this.lovService.getLovData(
                  program.point_type.toString(),
                );

                additional = lov.additional ? lov.additional.split('|') : false;

                if (lov && additional) {
                  data.reward_item_id = additional[1];
                  data.reward_instance_id = additional[0];
                  data.status = true;
                }
                return data;
              };
              const coreRequest = await this.pointService
                .customer_point_balance(
                  request.msisdn,
                  new ViewPointQueryDTO(),
                  token,
                )
                .then(async (e: any) => {
                  const member_core_id = e.payload.core_id;
                  const __v = e.payload.core_v;
                  const reward_item_id = (await getRewardId()).reward_item_id;

                  let amount = request.total_redeem;
                  if (typeof request.total_redeem == 'undefined') {
                    amount = -1;
                  } else if (request.total_redeem === 0) {
                    amount = 0;
                  }

                  return {
                    locale: request.locale, //"id-ID"
                    type: 'reward',
                    channel: request.channel_id
                      ? request.channel_id
                      : 'Application',
                    reward_item_id: reward_item_id,
                    amount: amount,
                    member_id: member_core_id,
                    realm_id: this.realm,
                    branch_id: this.branch,
                    merchant_id: this.merchant,
                    __v: __v,
                  };
                });

              let customer = {};
              if (allowedMSISDN(request.msisdn)) {
                const reformatMsisdn = formatMsisdnCore(request.msisdn);
                customer = await this.customerService
                  .getCustomerByMSISDN(reformatMsisdn, token)
                  .then(async (customerDetail) => customerDetail);
              }

              // campaign
              let campaign = {};
              const hasRedeemNotification = keyConf?.notification?.find(
                (notif) =>
                  notif?.code_identifier_detail?.set_value ===
                  'Redeem Campaign', // 'Keyword Verification',
              );
              if (hasRedeemNotification) {
                campaign = {
                  template:
                    hasRedeemNotification?.code_identifier_detail
                      ?.notification_content,
                };
              }

              response.message = 'Success';
              response.payload = {
                trace_id: trace_id,
                core: coreRequest,
                keyword: keyConf,
                program: await this.programService.findProgramById(
                  keyConf.eligibility.program_id,
                ),
                customer: customer,
                redeem: redeem,
                campaign: campaign,
              };
            } else {
              response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
              response.message = 'Keyword is not found';
              response.transaction_classify = 'REDEEM';
              response.trace_custom_code = 'RDM';
              response.payload = {
                core: '',
                reward: '',
                trace_id: trace_id,
                redeem: redeem,
              };
            }
            return response;
          })
          .catch((e) => {
            response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
            response.message = e.message;
            response.transaction_classify = 'REDEEM';
            response.trace_custom_code = 'RDM';
            response.payload = {
              core: '',
              reward: '',
              trace_id: trace_id,
              redeem: redeem,
            };
            return response;
          });
      });
  }

  async redeem_v2_topic(
    request: RedeemDTO,
    account: Account,
    token = '',
    path = '',
    emit_action = true,
    overwrite_priority = null,
    additional_param = null,
  ) {
    if (request?.channel_id) {
      const channel_id = request?.channel_id ?? '';
      request.channel_id = channel_id.toUpperCase();
      console.log('request.channel_id : ', request?.channel_id);
    }

    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'REDEEM';
    response.trace_custom_code = 'TRX';

    // generate trace_id
    const trace_id = this.transactionOptional.getTracingId(request, response);

    response.payload = {
      trace_id: trace_id,
    };

    if (request.total_redeem < 0) {
      // response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      // response.message = 'total_redeem cannot be negative';
      // response.payload = {
      //   trace_id: trace_id,
      // };
      // return response;
      throw new BadRequestException([
        { isInvalidDataContent: 'Keyword parameter format is wrong!' },
      ]);
    }

    if (request?.total_bonus < 0) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Total bonus must be +' },
      ]);
    }

    if (
      !request.hasOwnProperty('send_notification') ||
      request.send_notification === undefined
    ) {
      request.send_notification = true;
    }

    //this.clientRedeem.emit('redeem', {
    //  data: request,
    //  account: account,
    //  token: token,
    //  transaction_id: trace_id,
    //  path: path,
    //});

    // Keyword Priority
    const priorityKeyword = await this.applicationService.checkKeywordPriority(
      request.keyword,
    );

    let keyword_priority = priorityKeyword
      ? priorityKeyword?.priority?.toUpperCase()
      : 'DEFAULT';

    if (overwrite_priority) {
      keyword_priority = overwrite_priority.toUpperCase();
    }

    const is_v2 = additional_param?.is_v2 == true;
    if (emit_action && !is_v2) {
      this.emitToTopic(
        {
          data: request,
          account: account,
          token: token,
          transaction_id: trace_id,
          path: path,
          keyword_priority: keyword_priority,
        },
        keyword_priority,
      ).then((_) => {
        //
      });
    } else if (emit_action && is_v2) {
      if (additional_param?.redeem_fmc_switch) {
        const isIndihome = allowedIndihomeNumber(request.msisdn);

        // If not indihome and tsel id is not set then emit to redeem
        if (!isIndihome && !additional_param?.request.tsel_id) {
          this.emitToTopic(
            {
              data: request,
              account: account,
              token: token,
              transaction_id: trace_id,
              path: path,
              keyword_priority: keyword_priority,
            },
            keyword_priority,
          ).then((_) => {
            //
          });
        } else {
          // FMC redeem
          this.emitToTopicFmc({
            data: request,
            account: account,
            token: token,
            transaction_id: trace_id,
            path: path,
            keyword_priority: keyword_priority,
          }).then();
        }
      } else {
        this.emitToTopicFmc({
          data: request,
          account: account,
          token: token,
          transaction_id: trace_id,
          path: path,
          keyword_priority,
        }).then();
      }
    }

    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';

    return response;
  }

  async emitToTopic(data: any, keyword_priority = null) {
    const key = randomUUID();
    console.log('KEY_KAFKA_EMIT_BAU --> ', key);

    if (keyword_priority === 'HIGH') {
      this.clientRedeemHigh.emit(process.env.KAFKA_REDEEM_HIGH_TOPIC, {
        key: key,
        value: data,
      });
    } else if (keyword_priority === 'LOW') {
      this.clientRedeemLow.emit(process.env.KAFKA_REDEEM_LOW_TOPIC, {
        key: key,
        value: data,
      });
    } else {
      this.clientRedeem.emit(process.env.KAFKA_REDEEM_TOPIC, {
        key: key,
        value: data,
      });
    }
  }

  async emitToTopicFmc(data: any) {
    const key = randomUUID();
    console.log('KEY_KAFKA_EMIT_FMC --> ', key);

    this.clientRedeemFmc.emit(process.env.KAFKA_REDEEM_FMC_TOPIC, {
      key: key,
      value: data,
    });
  }

  async redeem_v2(request: RedeemDTO, account: Account, token = '', path = '') {
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'REDEEM';
    response.trace_custom_code = 'TRX';

    // generate trace_id
    const trace_id = this.transactionOptional.getTracingId(request, response);

    if (request.total_redeem < 0) {
      response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      response.message = 'total_redeem cannot be negative';
      response.payload = {
        trace_id: trace_id,
      };
      return response;
    }

    const count = await this.pointService.checkTraceIDInjectPoint(trace_id);
    if (count == 0) {
      return await this.pointService
        .getSelectedData(request, token, {
          customer: true,
        })
        .then((value: any) => {
          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';

          // create remark
          const _eligibility = value?.keyword?.eligibility;
          const remark = [
            _eligibility?.program_title_expose
              ? _eligibility?.program_title_expose
              : '',
            _eligibility.name,
            _eligibility?.program_experience
              ? _eligibility?.program_experience.toString()
              : '',
          ].join('|');

          // create channel_id
          const channel_id = request.channel_id ? request.channel_id : '';

          const newData = new this.redeemModel({
            ...request,
            tracing_id: trace_id.replace('TRX', 'RDM'),
            master_id: trace_id,
            created_by: (account as any)._id,
          });

          return newData
            .save()
            .catch((e: BadRequestException) => {
              console.log(e.message);
              throw new BadRequestException(e.message); //Error untuk mongoose
            })
            .then(async (redeem) => {
              // config amount for deduct
              let amount = request.total_redeem;
              if (typeof request.total_redeem == 'undefined') {
                amount = -1;
              } else if (request.total_redeem === 0) {
                amount = 0;
              }

              // campaign
              let campaign = {};
              const hasRedeemNotification = value.keyword?.notification?.find(
                (notif) =>
                  notif?.code_identifier_detail?.set_value ===
                  'Redeem Campaign', // 'Keyword Verification',
              );
              if (hasRedeemNotification) {
                campaign = {
                  template:
                    hasRedeemNotification?.code_identifier_detail
                      ?.notification_content,
                };
              }

              const coreRequest = {
                locale: request.locale, //"id-ID"
                type: 'reward',
                channel: channel_id,
                reward_item_id: value?.reward_item_id,
                reward_instance_id: value?.reward_instance_id,
                amount: amount,
                remark: remark,
                member_id: value.customer_core
                  ? value.customer_core[0]?.id
                  : null,
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
                redeem: redeem,
                campaign: campaign,
              };

              return response;
            });
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
    } else {
      response.code = HttpStatusTransaction.ERR_DATA_EXISTS;
      response.message =
        'Transaction_id was used before, please input another transaction_id';
      response.payload = {
        trace_id: trace_id,
      };
      return response;
    }
  }

  async redeem_v2_notification(request: any) {
    return await this.keywordNotificationModel.aggregate([
      {
        $lookup: {
          from: 'lovs',
          let: { code_id: '$code_identifier' },
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
                            input: '$$code_id',
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
                _id: false,
                __v: false,
                created_by: false,
                created_at: false,
                updated_at: false,
                deleted_at: false,
              },
            },
          ],
          as: 'code_identifier_detail',
        },
      },
      {
        $unwind: '$code_identifier_detail',
      },
      {
        $project: {
          via: {
            $map: {
              input: '$via',
              as: 'via_detail',
              in: {
                $toObjectId: '$$via_detail',
              },
            },
          },

          keyword: true,
          bonus_type_id: true,
          keyword_name: true,
          code_identifier: true,
          notification_content: true,
          start_period: true,
          end_period: true,
          notif_type: true,

          code_identifier_detail: true,
        },
      },
      {
        $lookup: {
          from: 'lovs',
          let: { via_id: '$via' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$via_id'],
                },
              },
            },
          ],
          as: 'via_detail',
        },
      },

      // keyword
      {
        $lookup: {
          from: 'keywords',
          let: { keyword_id: '$keyword' },
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
                            input: '$$keyword_id',
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
                _id: false,
                __v: false,
                created_by: false,
                created_at: false,
                updated_at: false,
                deleted_at: false,
              },
            },
          ],
          as: 'keyword_detail',
        },
      },
      {
        $unwind: '$keyword_detail',
      },

      // program
      {
        $lookup: {
          from: 'programv2',
          let: { program_id: '$keyword_detail.eligibility.program_id' },
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
                _id: false,
                __v: false,
                created_by: false,
                created_at: false,
                updated_at: false,
                deleted_at: false,
              },
            },
          ],
          as: 'program_detail',
        },
      },
      {
        $unwind: '$program_detail',
      },
      {
        $match: {
          keyword_name: request.keyword,
        },
      },
    ]);
  }

  async get_msisdn_redeemer(
    keyword: string,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    const data = await this.redeemModel.findOne({
      keyword: keyword,
    });

    if (!data) {
      // response.code = HttpStatusTransaction.ERR_CONTENT_DATA_INVALID;
      // response.message = 'Keyword is not found';
      // response.transaction_classify = 'REDEEM';
      // response.trace_custom_code = 'RDM';

      // return response;
      throw new BadRequestException([
        { isInvalidDataContent: 'Keyword is not found' },
      ]);
    }

    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.transaction_classify = 'REDEEM';
    response.trace_custom_code = 'RDM';
    response.payload = data;

    return response;
  }

  async payload_to_telco_prepaid(payload) {
    return {
      transaction_id: payload['trace_id'],
      channel: 'i1',
      language: 'id',
      service_id_a: payload['customer'].msisdn,
      offer_id: '00001234',
      adn: '777',
      keyword: payload['keyword'].eligibility.name,
      order_type: 'ACT',
      purchase_mode: 'SELF',
      payment_method: 'POIN',
      payment_name: 'POIN',
      poin: `${payload['keyword'].eligibility.poin_redeemed}`,
      subscription_flag: '0',
      callback_url: null,
      version: 'v2',
    };
  }

  async payload_to_telco_postpaid(payload) {
    return {
      transaction_id: payload['trace_id'],
      channel: 'i1',
      language: 'id',
      service_id_a: payload['customer'].msisdn,
      offer_id: '00001234',
      adn: '777',
      keyword: payload['keyword'].eligibility.name,
      order_type: 'REN',
      purchase_mode: 'SELF',
      payment_method: 'POIN',
      payment_name: 'POIN',
      poin: `${payload['keyword'].eligibility.poin_redeemed}`,
      subscription_flag: '0',
      callback_url: null,
      version: 'v2',
    };
  }

  // fungsi untuk multi bonus bonus type
  async calculateNominalByBonusType(payload, type) {
    const bonuses = payload['keyword'].bonus;
    let totalNominal = 0;

    for (let i = 0; i < bonuses.length; i++) {
      const bonus = bonuses[i];
      if (bonus.bonus_type === type) {
        totalNominal += parseInt(bonus.nominal);
      }
    }
    return totalNominal;
  }

  async payload_to_link_aja_main(payload) {
    const nominal = this.calculateNominalByBonusType(payload, 'linkaja_main');
    return {
      customerNumber: formatMsisdnToID(payload['customer'].msisdn),
      amount: nominal,
      partnerTrxID: payload['trace_id'],
      partnerTrxDate: new Date(),
    };
  }

  async payload_to_link_aja_bonus(payload) {
    const nominal = this.calculateNominalByBonusType(payload, 'linkaja_bonus');
    return {
      trxid: payload['trace_id'],
      msisdn: formatMsisdnToID(payload['customer'].msisdn),
      amount: nominal,
    };
  }

  async payload_to_link_aja_voucher(payload) {
    return {
      msisdn: formatMsisdnToID(payload['customer'].msisdn),
      partner_voucher_id: payload['keyword'].bonus[0].partner_voucher_id
        ? payload['keyword'].bonus[0].partner_voucher_id
        : '',
      expiryDate: payload['keyword'].bonus[0].expiry_date
        ? payload['keyword'].bonus[0].expiry_date
        : '',
    };
  }

  async payload_to_ngrs(payload, bonus) {
    return {
      transaction: {
        transaction_id: payload['trace_id'],
        channel: '2',
      },
      service: {
        organization_code: '9161455',
        service_id: payload['customer'].msisdn,
      },
      recharge: {
        amount: payload['keyword'].eligibility.total_budget,
        stock_type: 'BULK',
        element1: 'NzM5NjIw',
      },
      merchant_profile: {
        third_party_id: 'POS_Broker',
        third_party_password: 'UXVnM2Y4NllzOTFodWRORw==',
        delivery_channel: '5262',
        organization_short_code: 'POIN01',
      },
    };
  }

  async payload_to_coupon(payload, bonus) {
    const merchant = payload.keyword.eligibility?.merchant
      ? await this.merchantModel.findById(payload.keyword.eligibility?.merchant)
      : null;
    const date = new Date();
    return {
      locale: 'en-US',
      type: 'Coupon',
      transaction_no: payload['trace_id'],
      prefix: this.coupon_prefix ? this.coupon_prefix : 'CP',
      owner_phone: `${formatMsisdnCore(payload['customer'].msisdn)}|ID|+62`,
      owner_id: payload['customer'].core_id,
      owner_name: payload['customer'].msisdn,
      product_name: `${this.coupon_prefix}_${date.toISOString()}`,
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
      owner_phone: `${payload['customer'].msisdn}|ID|+62`,
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

  async payload_to_direct_redeem(payload: any, bonus: any) {
    return {
      msisdn: payload['customer'].msisdn,
      keyword: payload['keyword']._id,
      merchant: payload['core'].merchant_id,
      stock_type: bonus.stock_type,
      threshold: bonus.threshold,
      merchandise: bonus.merchandise,
      keyword_schedule: payload['keyword'].eligibility.keyword_schedule,
      keyword_shift: payload['keyword'].eligibility.keyword_shift,
    };
  }

  async payload_to_void(payload: any) {
    return {
      msisdn: payload['customer']?.msisdn ?? '',
      keyword: payload['keyword']?.eligibility?.name ?? '',
    };
  }

  // Function: getVoucherPayload
  // Example Return:
  // {
  //   "incoming": {
  //     "batch_no": "VCR01_2022-12-22T03:55:42.175Z",
  //     "combination": "Alphabet",
  //     "digit_length": 5,
  //     "prefix": "VCR",c
  //     "voucher_type": "Generate",
  //     "stock": 2,
  //     "exp_voucher": "2",
  //     "type": "stock"
  //   },
  //   "voucher": {
  //       "locale": "id-ID",
  //       "batch_no": "VCR01_2022-12-22T03:55:42.175Z",
  //       "batch_size": 2,
  //       "type": "Product",
  //       "name": "Product Voucher Example",
  //       "status": "Active",
  //       "product_name": "Product Voucher",
  //       "prefix": "VCR",
  //       "combination": "Alphabet",
  //       "desc": "",
  //       "merchant_name": "Telkomsel",
  //       "product_id": "prodct-63a1ae98bbfabc0ea4afad45"
  //   }
  // }

  async getVoucherPayload(payload, data: RedeemDTO) {
    const keyword = payload['keyword'];

    // diambil dari program title expose
    const voucher_desc = keyword?.eligibility?.program_title_expose
      ? keyword?.eligibility?.program_title_expose
      : '';

    // create remark
    const _eligibility = keyword?.eligibility;
    const remark = [
      _eligibility?.program_title_expose
        ? _eligibility?.program_title_expose
        : '',
      _eligibility.name,
      _eligibility?.program_experience
        ? _eligibility?.program_experience.toString()
        : '',
    ].join('|');

    // create channel_id
    console.log(payload.incoming);
    const channel_id = payload.incoming?.channel_id
      ? payload.incoming?.channel_id
      : '';

    // Incoming
    const incoming = new VoucherDTO();
    const date = new Date();
    const voucher = keyword.bonus.filter(
      (e) => e.bonus_type == 'discount_voucher',
    )[0];

    if (voucher) {
      let batch_no = `${keyword.eligibility.name}_${date.toISOString()}`;
      batch_no = batch_no.replace(/[.:]/g, '-');

      incoming.batch_no = batch_no;
      incoming.keyword_id = keyword['_id'];
      incoming.keyword_name = keyword.eligibility.name;
      incoming.combination = voucher['voucher_combination'];
      incoming.digit_length = voucher['jumlah_total_voucher'];
      incoming.prefix = voucher['voucher_prefix'];
      incoming.voucher_type = voucher['voucher_type'];
      incoming.file = voucher['file'];
      incoming.stock = voucher['stock_location']
        ? voucher['stock_location'].reduce((acc, item) => acc + item.stock, 0)
        : 0;
      incoming.exp_voucher = voucher['exp_voucher'];
      incoming.type = incoming.stock > 0 ? 'stock' : 'non_stock';
      incoming.merchant_id = keyword.eligibility.merchant;

      // const voucher_desc = await this.applicationService.getConfig(
      //   'DEFAULT_VOUCHER_DESCRIPTION', //get id from lov (where set_value : "Keyword Verification")
      // );

      const voucher_name = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_NAME', //get id from lov (where set_value : "Keyword Verification")
      );

      const voucher_product_name = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_PRODUCT_NAME', //get id from lov (where set_value : "Keyword Verification")
      );

      const voucher_type = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_TYPE', //get id from lov (where set_value : "Keyword Verification")
      );

      const voucher_merchant_name = await this.applicationService.getConfig(
        'DEFAULT_VOUCHER_MERCHANT_NAME', //get id from lov (where set_value : "Keyword Verification")
      );

      // Payload to Core
      const corePayload = new VoucherBatchDto();
      corePayload.remark = remark;
      corePayload.channel = channel_id;
      corePayload.locale = data.locale ? data.locale : 'id-ID';
      corePayload.batch_no = incoming.batch_no;
      corePayload.batch_size = incoming.stock;
      corePayload.type = voucher_type ? voucher_type : 'Product';
      corePayload.name = voucher_name
        ? voucher_name
        : 'Product Voucher Telkomsel';
      corePayload.status = 'Redeem';
      corePayload.product_name = voucher_product_name
        ? voucher_product_name
        : `Product Voucher Telkomsel`;
      if (incoming.prefix) {
        corePayload.prefix = incoming.prefix;
      }
      corePayload.combination = incoming.combination;
      corePayload.length = incoming.digit_length;
      corePayload.desc = voucher_desc;
      corePayload.merchant_name = voucher_merchant_name
        ? voucher_merchant_name
        : 'Telkomsel';
      corePayload.product_id = this.product;
      corePayload.start_time = date;
      corePayload.end_time = date;
      corePayload.transaction_no = payload['trace_id'];

      if (
        incoming.voucher_type == 'Generate' ||
        // (incoming.voucher_type == 'Upload' && incoming.file)
        incoming.voucher_type == 'Upload'
      ) {
        if (incoming.voucher_type == 'Upload') {
          // if (incoming.voucher_type == 'Upload' && incoming.file) {
          // to get this function need async
          // corePayload.batch_size = await this.countDataFileCsv(
          //   `./uploads/voucher/${incoming.file.filename}`,
          // );
          incoming.stock = 1;
        }
        return {
          incoming: incoming,
          core: corePayload,
        };
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  async getDonationPayload(req, payload) {
    const keyword = payload['keyword'];

    // payload
    const donationPayload = {
      keyword: keyword._id,
      start_time: keyword.eligibility.start_period,
      end_time: keyword.eligibility.end_period,
      trace_id: payload.trace_id.replace('TRX', 'DON'),
      master_id: payload.trace_id,
      msisdn: req.msisdn,
      total_redeem: validationKeywordPointValueRule(payload, req?.total_redeem),
      time: new Date().toISOString(),
    };

    // save
    // await this.donationService.inject_donation(keyword, donationPayload);

    return donationPayload;
  }

  async getPoinPayload(account, payload, token, request) {
    // payload
    const keyword = payload['keyword'];
    const totalPoin = keyword.bonus.filter(
      (e) => e.bonus_type == 'loyalty_poin',
    )[0];
    const pointPayload = {
      locale: request.locale,
      total_point: totalPoin?.earning_poin ? totalPoin?.earning_poin : 0,
      msisdn: payload['customer'].msisdn,
      keyword: payload['keyword'].eligibility.name,
      channel_id: request.channel_id ? request.channel_id : '',
    };
    // save
    return await this.pointService.point_inject(
      <InjectPoint>pointPayload,
      account,
      token,
      false,
    );
  }

  async isValidVoteKeyword(request, payload) {
    const voting = payload['keyword'].bonus.filter(
      (e) => e.bonus_type == 'voting',
    );

    if (voting.length > 0) {
      const votingPayload = await this.getVotingPayload(request, payload);
      if (!votingPayload) {
        return false;
      }

      const optionAvailable =
        await this.voteService.checkVoteOptionAvailableFromVote(
          payload['keyword'],
          votingPayload.option,
        );
      if (!optionAvailable) {
        return false;
      }
    }

    return true;
  }

  private async countDataFileCsv(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let count = 0;
      // Buat stream untuk membaca file CSV
      const stream = createReadStream(filePath);

      // Buat parser untuk mengolah data CSV
      const parser = new Parser({});

      // Tambahkan listener untuk setiap baris yang dibaca
      parser.on('data', () => {
        count++;
      });

      // Tambahkan listener untuk event end untuk menyelesaikan proses pembacaan
      parser.on('end', () => {
        // Kembalikan jumlah baris yang dibaca
        const c = count - 1;
        resolve(c);
        return c;
      });

      // Mulai membaca file CSV
      stream.pipe(parser);
    });
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
    },
  ) {
    if (response.code === 'S00000') {
      let telco_prepaid = null;
      let telco_postpaid = null;
      let link_aja_bonus = null;
      let link_aja_main = null;
      let link_aja_voucher = null;
      let ngrs = null;
      let coupon = null;
      let donation = null;
      let direct_redeem = null;
      let voucher = null;
      let payload_void = null;
      let loyalty_poin = null;
      let mbp = null;
      let bonus_type = null;
      let voting = null;
      const campaign = null;

      const bonus = response.payload['keyword']['bonus'];

      if (bonus.length > 0) {
        for (const single_bonus of bonus) {
          bonus_type = single_bonus.bonus_type;
          switch (single_bonus.bonus_type) {
            case 'telco_postpaid':
              telco_postpaid = await this.payload_to_telco_postpaid(
                response.payload,
              );
              break;
            case 'telco_prepaid':
              telco_prepaid = await this.payload_to_telco_prepaid(
                response.payload,
              );
              break;
            case 'linkaja_main':
              link_aja_main = await this.payload_to_link_aja_main(
                response.payload,
              );
              break;
            case 'linkaja_bonus':
              link_aja_bonus = await this.payload_to_link_aja_bonus(
                response.payload,
              );
              break;
            case 'linkaja_voucher':
              link_aja_voucher = await this.payload_to_link_aja_voucher(
                response.payload,
              );
              break;
            case 'ngrs':
              ngrs = await this.payload_to_ngrs(response.payload, single_bonus);
              break;
            case 'lucky_draw':
              coupon = await this.payload_to_coupon(
                response.payload,
                single_bonus,
              );
              break;
            case 'direct_redeem':
              direct_redeem = await this.payload_to_direct_redeem(
                response.payload,
                single_bonus,
              );
              break;
            case 'discount_voucher':
              voucher = await this.getVoucherPayload(
                response.payload,
                config.data,
              );
              break;
            case 'void':
              payload_void = await this.payload_to_void(response.payload);
              break;
            case 'donation':
              donation = await this.getDonationPayload(
                config.data,
                response.payload,
              );
              break;
            case 'loyalty_poin':
              loyalty_poin = await this.getPoinPayload(
                config.account,
                response.payload,
                config.token,
                config.data,
              );

              loyalty_poin = loyalty_poin?.payload?.core;
              break;
            case 'mbp':
              mbp = await this.payload_to_mbp(
                response.payload,
                config.data,
                single_bonus,
              );
              break;
            case 'voting':
              voting = await this.getVotingPayload(
                config.data,
                response.payload,
              );
              break;
            default:
              break;
          }
        }
      }

      const tracing_id_voucher =
        this.transactionOptional.getTracingIdWithLength(
          25,
          config.data,
          response,
        );

      const json = {
        transaction_classify: 'REDEEM',
        trace_custom_code: 'RDM',
        origin: config.origin,
        program: response.payload['program'],
        keyword: response.payload['keyword'],
        customer: response.payload['customer'],
        endpoint: config.path,
        redeem: response.payload['redeem'],
        tracing_id: response.payload['trace_id'],
        tracing_id_voucher: tracing_id_voucher,
        tracing_master_id: response.payload['trace_id'],
        incoming: config.data,
        account: config.account,
        submit_time: new Date().toISOString(),
        token: config.token,
        bonus_type: bonus_type,
        is_stock_deducted: false,
        is_whitelist_deducted: false,
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
          outbound: {
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
        payload: {
          deduct: response.payload['core'],
          telco_postpaid: telco_postpaid,
          telco_prepaid: telco_prepaid,
          link_aja_bonus: link_aja_bonus,
          link_aja_main: link_aja_main,
          link_aja_voucher: link_aja_voucher,
          ngrs: ngrs,
          coupon: coupon,
          donation: donation,
          voucher: voucher,
          direct_redeem: direct_redeem,
          void: payload_void,
          inject_point: loyalty_poin,
          mbp: mbp,
          voting: voting,
        },
      };

      // const noConfig = await this.applicationService.getConfig(
      //   'PROGRAM_NO_RULE_MECHANISM',
      // );

      // await this.client.emit('deduct', json);

      // if (
      //   response.payload['program'].program_mechanism.toString() ===
      //   noConfig.toString()
      // ) {
      //   json.origin = 'redeem.norule';
      //   this.clientDeduct.emit('deduct', json);
      //   console.log('to deduct');
      // } else {
      this.clientEligibility.emit('eligibility', json);
      // await this.client.emit('donation', json);
      // TODO : If ready emit to eligi
      // this.clientDeduct.emit('deduct', json);
      console.log('should be eligi');
      // }

      // save to transaction master
      this.clientTransactionMaster.emit('transaction_master', json);
    }

    // keyword (master) not found?
    console.log({ response, config });
    if (response.code === HttpStatusTransaction.ERR_KEYWORD_UTAMA_FOUND) {
      const keywordNotifications = await this.redeem_v2_notification(
        config.data,
      );
      const program = await this.programService.getProgramByKeywordRegistration(
        config?.data?.keyword,
      );

      // reject jika lebih dari satu
      console.log(keywordNotifications);
      console.log(keywordNotifications.length);
      if (keywordNotifications.length > 1) {
        response.code = HttpStatusTransaction.ERR_KEYWORD_NOT_FOUND;
        response.message = 'More than one Notification Keyword!';
        // response.transaction_classify = 'REDEEM';
        // response.trace_custom_code = 'RDM';
        // response.payload = {};

        return response;
      } else if (program?.keyword_registration?.length) {
        // Handle Keyword Registration
        await this.handleKeywordRegistration({
          response,
          config,
          program: { ...program?._doc },
        });
      } else {
        // proses void
        const keywordNotif = keywordNotifications[0];
        if (
          keywordNotif?.program_detail?.name &&
          keywordNotif?.keyword_detail
        ) {
          const payloadToVoid = {
            origin: 'redeem2.notificationkeyword',
            msisdn: config.data.msisdn,
            program_name: keywordNotif?.program_detail.name,

            incoming: config.data,
            keyword: keywordNotif?.keyword_detail,
            keyword_notification: keywordNotif,
            customer: {
              msisdn: config.data.msisdn,
            },
          };

          await this.clientVoid.emit(
            process.env.KAFKA_VOID_TOPIC,
            payloadToVoid,
          );

          response.code = HttpStatusTransaction.CODE_SUCCESS;
          response.message = 'Success';
        } else {
          throw new BadRequestException([{ isNotFound: 'Keyword Not Found' }]);
        }
      }
    }
    return response;
  }

  async handleKeywordRegistration(params: {
    response;
    config;
    program;
  }): Promise<void> {
    const { response, config, program: programParams } = params;

    console.log('=== Keyword Registration ===');

    const NO_RULE = await this.applicationService.getConfig(
      'PROGRAM_NO_RULE_MECHANISM',
    );

    const bonus_type = 'void';
    const program = { ...programParams, program_mechanism: NO_RULE };
    const keyword = {
      eligibility: {
        name: program?.registration_keyword,
        poin_redeemed: program?.point_registration ?? 0,
        poin_value: 'Flexible',
      },
      bonus: [
        {
          bonus_type: 'void',
          stock_location: [],
        },
      ],
    };
    const customer = {};
    const redeem = {};

    const lov = await this.lovService.getLovData(program?.point_type);
    const reward_item_id = lov?.additional?.split('|')?.[1];

    const payload_deduct = {
      locale: 'id-ID',
      type: 'reward',
      channel: 'Application',
      reward_item_id: reward_item_id,
      remark: '',
      member_id: null,
      realm_id: this.realm,
      branch_id: this.branch,
      merchant_id: this.merchant,
      amount: program?.point_registration ?? 0,
    };
    const payload_void = {
      keyword: program?.registration_keyword,
      msisdn: config?.data?.msisdn,
    };

    const json = {
      is_keyword_registration: true,
      transaction_classify: 'REDEEM',
      trace_custom_code: 'RDM',
      origin: 'redeem',
      program: program,
      keyword: keyword,
      customer: customer,
      endpoint: config.path,
      redeem: redeem,
      tracing_id: response.payload['trace_id'],
      tracing_master_id: response.payload['trace_id'],
      incoming: config.data,
      account: config.account,
      submit_time: new Date().toISOString(),
      token: config.token,
      bonus_type: bonus_type,
      is_stock_deducted: false,
      retry: {
        void: {
          counter: 0,
          errors: [],
        },
      },
      payload: {
        deduct: payload_deduct,
        void: payload_void,
      },
    };

    console.log({ json });

    // emit eligibility
    this.clientEligibility.emit('eligibility', json);

    // save to transaction master
    this.clientTransactionMaster.emit('transaction_master', json);
  }

  async save_batch_process_log(
    origin_name: string,
    transaction: string,
    identifier: string,
  ) {
    const newData = new this.batchProcessLog({
      origin_name,
      internal_name: null,
      transaction: transaction,
      status: BatchProcessEnum.WAITING,
      identifier: identifier,
    });

    await newData.save().catch((e: Error) => {
      console.log(e);
      console.log(`Error Save Log ${e.message}`);
    });

    return newData;
  }

  async findExistingBatchProcess(filename: string): Promise<BatchProcessLog> {
    return await this.batchProcessLog.findOne({ origin_name: filename });
  }

  async updateStatusBatchProcess(
    id: string,
    status: BatchProcessEnum,
    error: string = null,
  ): Promise<void> {
    const updatedPayload = error === null ? { status } : { status, error };

    await this.batchProcessLog.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      updatedPayload,
    );
  }

  /**
   * This function as check avail to process redeem
   * @param program
   * @param keyword
   * @param maxMode
   * @param maxRedeemCounter
   * @param date
   * @param from
   * @param to
   */
  async maxRedeemHandler(
    program: string,
    keyword: string,
    maxMode: MaxModeConstant,
    maxRedeemCounter: number,
    date: Date,
    from?: Date,
    to?: Date,
    msisdn?: string,
    keyword_shift?: any,
    program_time_zone?: any,
    cust_time_zone?: any,
    submitTime?: any,
  ) {
    try {
      const today = new Date();
      const getYear = today.getFullYear();
      const year = today.getFullYear();
      const month = today.getMonth();

      const payload = {
        program: program,
        keyword: keyword,
        max_mode: maxMode,
        from: from,
        to: to,
        counter: 1,
      };
      console.log('maxMode : ', maxMode);
      console.log('MaxModeConstant.SHIFT : ', MaxModeConstant.SHIFT);
      let checkRedeemFindByOne = null;
      switch (maxMode.toLowerCase()) {
        case (maxMode = MaxModeConstant.DAY):
          // from
          const dayDown = new Date(today.setUTCHours(0, 0, 0));
          const formattedDateDown = dayDown.toISOString().split('.')[0];

          // to
          const dayUp = new Date(today.setUTCHours(23, 59, 59));
          const formattedDateUp = dayUp.toISOString().split('.')[0];

          checkRedeemFindByOne = await this.checkRedeem
            .findOne({
              msisdn: msisdn,
              program: program,
              keyword: keyword,
              max_mode: payload.max_mode,
              from: formattedDateDown,
              to: formattedDateUp,
            })
            .exec();
          const dayCheckDate = date >= dayDown && date <= dayUp;
          return await this.redeemProcess(
            checkRedeemFindByOne,
            dayCheckDate,
            payload,
            maxRedeemCounter,
            formattedDateDown,
            formattedDateUp,
            msisdn,
          );

        case (maxMode = MaxModeConstant.MONTH):
          // from
          const firstDayOfMonth = new Date(year, month, 1);
          const formattedDayUp = firstDayOfMonth.toISOString().split('.')[0];

          // to
          const lastDayOfMonth = new Date(year, month + 1);
          const formattedDayDown = lastDayOfMonth.toISOString().split('.')[0];

          checkRedeemFindByOne = await this.checkRedeem
            .findOne({
              msisdn: msisdn,
              program: program,
              keyword: keyword,
              max_mode: payload.max_mode,
              from: formattedDayUp,
              to: formattedDayDown,
            })
            .exec();
          const monthCheckDate =
            date >= firstDayOfMonth && date <= lastDayOfMonth;
          // console.log('monthCheckDate : ', monthCheckDate);
          // console.log('checkRedeemFindByOne : ', checkRedeemFindByOne);
          // console.log('formattedDayUp : ', formattedDayUp);
          // console.log('formattedDayDown : ', formattedDayDown);
          // console.log('firstDayOfMonth : ', firstDayOfMonth);
          // console.log('lastDayOfMonth : ', lastDayOfMonth);
          // console.log('date : ', date);
          // console.log('date >= firstDayOfMonth : ', date >= firstDayOfMonth);
          // console.log('date <= lastDayOfMonth : ', date <= lastDayOfMonth);
          // console.log('msisdn : ', msisdn);
          return await this.redeemProcess(
            checkRedeemFindByOne,
            monthCheckDate,
            payload,
            maxRedeemCounter,
            formattedDayUp,
            formattedDayDown,
            msisdn,
          );

        case (maxMode = MaxModeConstant.YEAR):
          // from
          const firstMonth = new Date(getYear, 0, 1);
          const formattedMonthUp = firstMonth.toISOString().split('.')[0];

          // to
          const lastMonth = new Date(getYear, 12, 1);
          const formattedMonthDown = lastMonth.toISOString().split('.')[0];

          checkRedeemFindByOne = await this.checkRedeem
            .findOne({
              msisdn: msisdn,
              program: program,
              keyword: keyword,
              max_mode: payload.max_mode,
              from: formattedMonthUp,
              to: formattedMonthDown,
            })
            .exec();

          const yearCheckDate = date >= firstMonth && date <= lastMonth;

          // console.log('yearCheckDate : ', yearCheckDate);
          // console.log('checkRedeemFindByOne : ', checkRedeemFindByOne);
          // console.log('formattedMonthUp : ', formattedMonthUp);
          // console.log('formattedMonthDown : ', formattedMonthDown);
          // console.log('firstMonth : ', firstMonth);
          // console.log('lastMonth : ', lastMonth);
          // console.log('date : ', date);
          // console.log('date >= firstMonth : ', date >= firstMonth);
          // console.log('date <= lastMonth : ', date <= lastMonth);
          // console.log('msisdn : ', msisdn);
          return await this.redeemProcess(
            checkRedeemFindByOne,
            yearCheckDate,
            payload,
            maxRedeemCounter,
            formattedMonthUp,
            formattedMonthDown,
            msisdn,
          );

        case (maxMode = MaxModeConstant.PROGRAM):
          checkRedeemFindByOne = await this.checkRedeem
            .findOne({
              msisdn: msisdn,
              program: program,
              max_mode: payload.max_mode,
              from: '',
              to: '',
            })
            .exec();

          return await this.redeemProcess(
            checkRedeemFindByOne,
            true,
            payload,
            maxRedeemCounter,
            '',
            '',
            msisdn,
          );

        case (maxMode = MaxModeConstant.SHIFT):
          // let custTime = 7;
          // let programTime = 0;

          console.log('keyword_shift : ', keyword_shift);
          console.log('program_time_zone : ', program_time_zone);
          console.log('cust_time_zone : ', cust_time_zone);

          // Fungsi untuk menambahkan jam berdasarkan zona waktu
          function addHoursToTime(dateString, hours) {
            const date = new Date(dateString);
            date.setHours(date.getHours() + hours);
            return date.toISOString();
          }

          const todayDate = new Date().toISOString().slice(0, 10);

          submitTime = addHoursToTime(submitTime, 7);

          const time = new Date(submitTime);
          const submitHours = time.getUTCHours();
          const submitMinutes = time.getUTCMinutes();

          function convertOffsetTo07(array) {
            return array.map((shift) => {
              return {
                from: shift.from.replace(/\+\d{2}:\d{2}$/, '+00:00'),
                to: shift.to.replace(/\+\d{2}:\d{2}$/, '+00:00'),
              };
            });
          }

          const convertedData = convertOffsetTo07(keyword_shift);

          const keyword_shift_result = await Promise.all(
            convertedData.map(async (keyword_shiftItem) => {
              const from = new Date(keyword_shiftItem.from);
              const fromHours = from.getUTCHours();
              const fromMinutes = from.getUTCMinutes();

              const to = new Date(keyword_shiftItem.to);
              const toHours = to.getUTCHours();
              const toMinutes = to.getUTCMinutes();

              console.log(`${submitHours} : ${submitMinutes}`, 'submit');
              console.log(`${fromHours} : ${fromMinutes}`, 'from');
              console.log(`${toHours} : ${toMinutes}`, 'to');

              const submitTimeInMinutes = submitHours * 60 + submitMinutes;
              const fromTimeInMinutes = fromHours * 60 + fromMinutes;
              const toTimeInMinutes = toHours * 60 + toMinutes;

              console.log(
                submitTimeInMinutes,
                'submitTimeInMinutes shift max redeem',
              );
              console.log(fromTimeInMinutes, 'fromTimeInMinutes max redeem');
              console.log(toTimeInMinutes, 'toTimeInMinutes max redeem');

              console.log(
                'result 1 : ',
                submitTimeInMinutes >= fromTimeInMinutes,
              );

              console.log(
                'result 2 : ',
                submitTimeInMinutes <= toTimeInMinutes,
              );

              const checkRedeemFindByOne = await this.checkRedeem
                .findOne({
                  msisdn: msisdn,
                  program: program,
                  keyword: keyword,
                  max_mode: payload.max_mode, // MaxModeConstant.SHIFT,
                  from: `${todayDate}|${fromHours}:${fromMinutes}`,
                  to: `${todayDate}|${toHours}:${toMinutes}`,
                })
                .exec();

              if (
                submitTimeInMinutes >= fromTimeInMinutes &&
                submitTimeInMinutes <= toTimeInMinutes
              ) {
                console.log('checkRedeemFindByOne : ', checkRedeemFindByOne);
                return await this.redeemProcess(
                  checkRedeemFindByOne,
                  true,
                  payload,
                  maxRedeemCounter,
                  `${todayDate}|${fromHours}:${fromMinutes}`,
                  `${todayDate}|${toHours}:${toMinutes}`,
                  msisdn,
                );
              } else {
                return false;
              }
            }),
          );

          console.log('keyword_shift_result : ', keyword_shift_result);

          const isValid = keyword_shift_result.some(
            (value) => value.eligible === true,
          );
          console.log('isValid : ', isValid);

          const payloadData = {
            eligible: isValid,
          };
          return payloadData;

        default:
          console.log('Not defined');
      }
    } catch (e) {
      throw new Error(e);
    }
  }

  async getCustomerRedeem(keyword: any) {
    const customers = await this.redeemModel.aggregate([
      { $match: { keyword: { $in: keyword } } },
      {
        $group: {
          _id: {
            keyword: '$keyword',
            msisdn: '$msisdn',
          },
        },
      },
    ]);

    const formatCustomers = [];
    for (let index = 0; index < customers.length; index++) {
      formatCustomers[index] = customers[index]._id;
    }

    return formatCustomers;
  }

  async getAllRedeem() {
    const data = await this.redeemModel.find().exec();
    return data;
  }

  /**
   * This function as store data to checkRedeem collection
   * @param checkRedeemFindByOne
   * @param isCanRedeem
   * @param payload
   * @param maxRedeemCounter
   */
  async redeemProcess(
    checkRedeemFindByOne: CheckRedeem,
    isCanRedeem: boolean,
    payload: any,
    maxRedeemCounter: number,
    fromDate?: any,
    toDate?: any,
    msisdn?: string,
  ) {
    let reason = '';
    // const isBooked = false;

    if (!isCanRedeem) {
      return {
        eligible: false,
        payload: payload,
      };
    }

    const session = await this.checkRedeem.startSession();
    session.startTransaction();

    try {
      if (!checkRedeemFindByOne) {
        const newData = new this.checkRedeem({
          msisdn: msisdn,
          program: payload.program,
          keyword: payload.max_mode === 'Program' ? '' : payload.keyword,
          max_mode: payload.max_mode,
          from: fromDate,
          to: payload.max_mode === 'Program' ? '' : toDate,
          counter: 1,
        });

        const savedData = await newData.save({ session });
        await session.commitTransaction();
        session.endSession();
        return {
          eligible: true,
          payload: savedData,
        };
      }

      const criteria: any = {
        msisdn: msisdn,
        program: payload.program,
        max_mode: payload.max_mode,
        counter: { $lt: maxRedeemCounter },
      };

      if (payload.max_mode !== 'Program') {
        criteria['keyword'] = payload.keyword;
        criteria['from'] = fromDate;
        criteria['to'] = toDate;
      }

      const currentVersion = await this.checkRedeem
        .findOne(criteria)
        .session(session);

      if (!currentVersion) {
        reason = 'Concurrent update conflict or invalid version';
      } else {
        const updateResult = await this.checkRedeem.findOneAndUpdate(
          criteria,
          { $inc: { counter: 1, __v: 1 }, updated_at: new Date() },
          { new: true, session },
        );

        if (!updateResult) {
          reason = 'Max redeem reached or update failed';
        } else {
          await session.commitTransaction();
          session.endSession();
          return {
            eligible: true,
            payload: updateResult,
          };
        }
      }
    } catch (error) {
      await session.abortTransaction();
      reason = 'Transaction error';
    } finally {
      session.endSession();
    }

    return {
      eligible: false,
      payload: checkRedeemFindByOne,
      reason: reason,
    };
  }

  async is_bulk_redeem_coupon_confirmation_keyword(
    keyword: string,
    response: any,
  ): Promise<boolean> {
    if (response.code != HttpStatusTransaction.ERR_KEYWORD_UTAMA_FOUND) {
      return false;
    }

    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_CONFIRMATION_CODE_IDENTIFIER',
    );
    const bulk_redeem_confirm_notif = await this.keywordNotificationModel
      .findOne({ keyword_name: keyword, code_identifier: lov_id })
      .lean();

    if (
      bulk_redeem_confirm_notif &&
      bulk_redeem_confirm_notif.notification_content != ''
    ) {
      return true;
    }

    return false;
  }

  async is_bulk_redeem_coupon_approval_keyword(
    keyword: string,
  ): Promise<boolean> {
    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_APPROVAL_CODE_IDENTIFIER',
    );
    const bulk_redeem_confirm_notif = await this.keywordNotificationModel
      .findOne({ keyword_name: keyword, code_identifier: lov_id })
      .lean();

    if (
      bulk_redeem_confirm_notif &&
      bulk_redeem_confirm_notif.notification_content != ''
    ) {
      return true;
    }

    return false;
  }

  async process_bulk_redeem_coupon_confirmation_keyword(
    payload: RedeemDTO,
    account: any,
    token: any,
  ): Promise<any> {
    const lov_id = await this.applicationService.getConfig(
      'BULK_REDEEM_COUPON_CONFIRMATION_CODE_IDENTIFIER',
    );
    const bulk_redeem_confirm_notif = await this.keywordNotificationModel
      .findOne({ keyword_name: payload.keyword, code_identifier: lov_id })
      .lean();
    const parent_keyword = await this.keywordService.getKeywordByID(
      bulk_redeem_confirm_notif.keyword,
    );

    payload.keyword = parent_keyword.eligibility.name;
    payload.total_redeem = 0;
    payload.send_notification = true;

    return await this.redeem_v2(payload, account, token).then(async (res) => {
      res['payload']['keyword'].bonus = [
        {
          bonus_type: 'void',
        },
      ];

      return res;
    });
  }

  async process_bulk_redeem_coupon_approval_keyword(
    payload: RedeemDTO,
    response: any,
    account: Account,
    token = '',
    otp: string,
  ): Promise<any> {
    try {
      const msisdn = payload.msisdn;
      const o = await this.otpService.claimOTP(msisdn, otp);

      if (!o) {
        response.code = HttpStatusTransaction.ERR_OTP_MISMATCH;
        response.message = HttpMsgTransaction.DESC_ERR_OTP_MISMATCH_400;

        throw new Error(response);
      }

      const total_point_owned =
        await this.pointService.getCustomerTselPointBalance(msisdn, token);
      const keyword = await this.keywordService.getKeywordByID(o.keyword);
      const total_redeem = Math.floor(
        Number(total_point_owned) / Number(keyword.eligibility.poin_redeemed),
      );

      payload.keyword = keyword.eligibility.name;
      payload.total_redeem = total_redeem;
      payload.send_notification = false;

      return await this.redeem_v2(payload, account, token).then(async (res) => {
        res['payload']['keyword'].eligibility.poin_value = 'Fixed Multiple';
        this.clientNotification.emit(process.env.KAFKA_VOID_TOPIC, payload);

        return res;
      });
    } catch (e) {
      throw new BadRequestException(e);
    }
  }

  async getVotingPayload(request, payload) {
    const additional_param = request?.additional_param;

    if (!additional_param) return null;

    return {
      keyword: payload['keyword'].eligibility.name,
      option: additional_param.vote_option,
    };
  }
}
