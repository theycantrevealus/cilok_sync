import { CallApiConfig } from '@configs/call-api.config';
import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { CacheStore } from '@nestjs/cache-manager';
import {
  BadRequestException,
  CACHE_MANAGER,
  ForbiddenException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices/client/client-kafka';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { SlRedisService } from '@slredis/slredis.service';
import { Queue } from 'bull';
import { plainToInstance, Type } from 'class-transformer';
import { writeFileSync } from 'fs';
import * as fs from 'fs';
import mongoose, { Model, Types } from 'mongoose';
import { filter } from 'rxjs';
import { create as xmlCreate } from 'xmlbuilder';

import { Account } from '@/account/models/account.model';
import { AccountService } from '@/account/services/account.service';
import {
  SystemConfig,
  SystemConfigDocument,
} from '@/application/models/system.config.model';
import { ApplicationService } from '@/application/services/application.service';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import { LocalFileDto } from '@/application/utils/FilterDT/file.dto';
import { getProductID } from '@/application/utils/Product/product';
import { Bank, BankDocument } from '@/bank/models/bank.model';
import {
  SftpOutgoingLog,
  SftpOutgoingLogDocument,
} from '@/cron/sftp/model/sftp.outgoing.log';
import {
  CustomerBadge,
  CustomerBadgeDocument,
} from '@/customer/models/customer.badge.model';
import { CustomerService } from '@/customer/services/customer.service';
import { GlobalResponse } from '@/dtos/response.dto';
import { KeywordUploadFileDto } from '@/keyword/dto/keyword.upload.file.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import {
  KeywordNotification,
  KeywordNotificationDocument,
} from '@/keyword/models/keyword.notification.model';
import { Location, LocationDocument } from '@/location/models/location.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { LovService } from '@/lov/services/lov.service';
import { NotificationFirebaseAddDto } from '@/notification/dto/notification.firebase.add.dto';
import { NotificationNonTransactionDto } from '@/notification/dto/notification-non-transaction.dto';
import { NotificationGeneralMessageBuild } from '@/notification/services/notification.message.service';
import { NotificationService } from '@/notification/services/notification.service';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { StockResponse } from '@/stock/dto/stock.reponse';
import { StockReserveDTO } from '@/stock/dto/stock-reserve.dto';
import { StockThreshold } from '@/stock/models/stock-threshold.model';
import { StockService } from '@/stock/services/stock.service';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { MaxRedeemThresholds } from '@/transaction/models/redeem/max_redeem.treshold.model';
import { MaxRedeemTresholdsService } from '@/transaction/services/redeem/max_redeem.tresholds.service';
import { VoucherService } from '@/transaction/services/voucher/voucher.service';
import { VoteService } from '@/vote/services/vote.service';

import { SftpService } from '../../../../../sftp/src/sftp.service';
import { KeywordApprovalDTOResponse } from '../dto/keyword.approval.dto';
import { KeywordChangeOwnerDTO } from '../dto/keyword.change.owner.dto';
import {
  KeywordIsDraftEditDTO,
  KeywordIsDraftEditDTOResponse,
} from '../dto/keyword.edit.isdraft.dto';
import {
  ImageAuctionAddDTO,
  ImageAuctionDTOResponse,
} from '../dto/keyword.image.auction.add.dto';
import { KeywordRejectDTOResponse } from '../dto/keyword.reject.dto';
import { RewardCatalogFilterDTO } from '../dto/reward.catalog.filter';
import {
  KeywordApprovalLog,
  KeywordApprovalLogDocument,
} from '../models/keyword.approval.log';
import { KeywordDirectRedeem } from '../models/keyword.direct.redeem.model';
import { KeywordMobileBanking } from '../models/keyword.mobile.banking.model';
import { KeywordStockLocation } from '../models/keyword.stock.location.model';
import { KeywordType, KeywordTypeDocument } from '../models/keyword.type';

const moment = require('moment-timezone');

@Injectable()
export class KeywordService {
  protected keywordQueue: Queue;
  private stock_added: number;
  private bonus_type: string;
  private product_id: string;
  private type_stock: any;
  private stock_location_reset: KeywordStockLocation[];
  private bonus: any;
  private stock_all = 0;
  private stock_status = false;
  private start_date_stock: any;
  private end_date_stock: any;
  private stock_added_flashsale: number;
  private type_stock_before: any;

  constructor(
    @InjectModel(KeywordApprovalLog.name)
    private keywordApprovalLogModel: Model<KeywordApprovalLogDocument>,
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,
    @InjectModel(KeywordNotification.name)
    private keywordNotificationModel: Model<KeywordNotificationDocument>,
    @InjectModel(KeywordType.name)
    private keywordType: Model<KeywordTypeDocument>,
    @InjectModel(Bank.name)
    private bankModel: Model<BankDocument>,
    @InjectModel(ProgramV2.name)
    private programModel: Model<ProgramV2Document>,
    @InjectModel(CustomerBadge.name)
    private customerBadgeModel: Model<CustomerBadgeDocument>,
    @InjectModel(SftpOutgoingLog.name)
    private sftpOutgoingLogModel: Model<SftpOutgoingLogDocument>,
    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,
    @InjectModel(SystemConfig.name)
    private systemConfigModel: Model<SystemConfigDocument>,
    private appsService: ApplicationService,
    private notificationService: NotificationService,
    private accountService: AccountService,
    @Inject(forwardRef(() => StockService))
    private serviceStock: StockService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    private voucherService: VoucherService,
    private lovService: LovService,
    private transactionOptional: TransactionOptionalService,
    private sftpService: SftpService,
    @Inject('NOTIFICATION_GENERAL_PRODUCER')
    private readonly notificationGeneralClient: ClientKafka,
    private readonly programService: ProgramServiceV2,

    @Inject(SlRedisService)
    private readonly slRedisService: SlRedisService,

    private readonly maxRedeemTresholdsService: MaxRedeemTresholdsService,
    private readonly callApiConfigService: CallApiConfigService,

    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,

    @Inject(VoteService)
    private readonly voteService: VoteService,
  ) {
    //
  }

  async all_old(param: any, credential: any): Promise<any> {
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
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const allowed_search = ['name', 'desc'];
    const query = [];
    if (search_param !== '') {
      const parseSearch = {
        $match: { $or: [] },
      };
      for (const a in allowed_search) {
        const identifier = {};
        if (identifier[allowed_search[a]] === undefined) {
          identifier[allowed_search[a]] = {
            $regex: new RegExp(`${search_param}`, 'i'),
          };
        }

        parseSearch.$match.$or.push(identifier);
      }
      query.push(parseSearch);
    }

    console.log(credential.account_location.location_detail);

    const location_type = new mongoose.Types.ObjectId(
      credential.account_location.location_detail.type,
    );
    const location_name = credential.account_location.location_detail;

    query.push({
      $lookup: {
        from: 'keywordbonus',
        let: { bonus_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$keyword', '$$bonus_id'] }],
              },
            },
          },
          {
            $lookup: {
              from: 'lovs',
              localField: 'bonus_type',
              foreignField: '_id',
              as: 'bonus_type_detail',
            },
          },
          {
            $unwind: '$bonus_type_detail',
          },
          {
            $lookup: {
              from: 'locations',
              localField: 'location',
              foreignField: '_id',
              as: 'location_detail',
            },
          },
          {
            $unwind: '$location_detail',
          },
          {
            $lookup: {
              from: 'locationbuckets',
              localField: 'bucket',
              foreignField: '_id',
              as: 'bucket_detail',
            },
          },
          {
            $unwind: '$bucket_detail',
          },
          {
            $project: {
              _id: false,
              keyword: false,
              bonus_type: false,
              location: false,
              bucket: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'keyword_bonus',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { keyword_type_id: '$eligibility.keyword_type' },
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
                          input: '$$keyword_type_id',
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
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'eligibility.keyword_type_info',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { point_type_id: '$eligibility.point_type' },
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
                          input: '$$point_type_id',
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
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'eligibility.point_type_info',
      },
    });

    query.push({
      $lookup: {
        from: 'merchantv2',
        let: { merchant_id: '$eligibility.merchant' },
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
                          input: '$$merchant_id',
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
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
              __v: false,
            },
          },
        ],
        as: 'eligibility.merchant_info',
      },
    });

    query.push({
      $lookup: {
        from: 'programv2',
        let: { program_id: '$eligibility.program_id' },
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
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
              __v: false,
            },
          },
        ],
        as: 'eligibility.program_id_info',
      },
    });

    query.push({
      $lookup: {
        from: 'programv2',
        let: { program_id: '$eligibility.multiwhitelist_program' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$program_id'],
              },
            },
          },
          {
            $project: {
              _id: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
              __v: false,
            },
          },
        ],
        as: 'eligibility.multiwhitelist_program_info',
      },
    });

    query.push({
      $lookup: {
        from: 'keywordapprovallogs',
        let: { keyword_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
              },
            },
          },
          { $sort: { created_at: 1 } },
          {
            $lookup: {
              from: 'lovs',
              let: { status: '$status' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$status'] }],
                    },
                  },
                },
                {
                  $project: {
                    group_name: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'status',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { account: '$processed_by' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$account'] }],
                    },
                  },
                },
                {
                  $project: {
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'processed_by',
            },
          },
          {
            $project: {
              keyword: false,
              __v: false,
            },
          },
        ],
        as: 'approval_log',
      },
    });

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { superior_hq_id: '$created_by.superior_hq' },
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
                            input: '$$superior_hq_id',
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
              $lookup: {
                from: 'accountlocations',
                let: { account: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ['$account', '$$account'] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'locations',
                      let: { location: '$location' },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [{ $eq: ['$_id', '$$location'] }],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: false,
                          },
                        },
                      ],
                      as: 'location_detail',
                    },
                  },
                  {
                    $unwind: {
                      path: '$location_detail',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: false,
                      account: false,
                      __v: false,
                    },
                  },
                ],
                as: 'account_location',
              },
            },
            {
              $unwind: {
                path: '$account_location',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                created_at: false,
                email: false,
                role: false,
                phone: false,
                job_title: false,
                job_level: false,
                deleted_at: false,
                type: false,
                updated_at: false,
                user_id: false,
                superior_hq: false,
                superior_local: false,
                __v: false,
              },
            },
          ],
          as: 'created_by.superior_hq',
        },
      },
      {
        $unwind: {
          path: '$created_by.superior_hq',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { superior_local_id: '$created_by.superior_local' },
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
                            input: '$$superior_local_id',
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
              $lookup: {
                from: 'accountlocations',
                let: { account: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ['$account', '$$account'] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'locations',
                      let: { location: '$location' },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [{ $eq: ['$_id', '$$location'] }],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: false,
                          },
                        },
                      ],
                      as: 'location_detail',
                    },
                  },
                  {
                    $unwind: {
                      path: '$location_detail',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: false,
                      account: false,
                      __v: false,
                    },
                  },
                ],
                as: 'account_location',
              },
            },
            {
              $unwind: {
                path: '$account_location',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                created_at: false,
                email: false,
                role: false,
                phone: false,
                job_title: false,
                job_level: false,
                deleted_at: false,
                type: false,
                updated_at: false,
                user_id: false,
                superior_hq: false,
                superior_local: false,
                __v: false,
              },
            },
          ],
          as: 'created_by.superior_local',
        },
      },
      {
        $unwind: {
          path: '$created_by.superior_local',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push({
      $lookup: {
        from: 'systemconfigs',
        let: {
          location_type_id: '$created_by.account_location.location_detail.type',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [
                      {
                        $convert: {
                          input: '$param_value',
                          to: 'objectId',
                          onNull: '',
                          onError: '',
                        },
                      },
                      '$$location_type_id',
                    ],
                  },
                ],
              },
            },
          },
          {
            $project: {
              _id: false,
              param_value: false,
              param_key: false,
              __v: false,
            },
          },
        ],
        as: 'isHQ',
      },
    });

    query.push({
      $set: {
        isHQ: {
          $cond: [
            {
              $eq: ['$isHQ', []],
            },
            false,
            true,
          ],
        },
      },
    });

    if (location_name.name !== 'HQ') {
      query.push({
        $match: {
          $and: [
            {
              'created_by.account_location.location_detail.type': location_type,
            },
          ],
        },
      });
    }

    query.push({ $sort: sort_set });

    query.push({
      $match: filter_builder,
    });

    query.push({ $skip: skip });

    query.push({ $limit: limit });

    const data = await this.keywordModel.aggregate(query, (err, result) => {
      return result;
    });

    // const data = await this.programModel.find({
    //   $text: {
    //     $search: search_param,
    //   },
    // });

    return {
      data: data,
      total: data.length,
    };
  }

  /**
   * Get keyword by segmentation
   * @param param
   * @param credential
   */
  async segmentation(param, credential: any): Promise<unknown> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};
    // const location_type = new mongoose.Types.ObjectId(
    //   credential.account_location.location_detail.type,
    // );
    // const location_name = credential.account_location.location_detail;

    query.push({
      $lookup: {
        from: 'keywordapprovallogs',
        let: { keyword_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
              },
            },
          },
          { $sort: { created_at: 1 } },
          {
            $lookup: {
              from: 'lovs',
              let: { status: '$status' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$status'] }],
                    },
                  },
                },
                {
                  $project: {
                    group_name: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'status',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { account: '$processed_by' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$account'] }],
                    },
                  },
                },
                {
                  $project: {
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'processed_by',
            },
          },
          {
            $project: {
              keyword: false,
              __v: false,
            },
          },
        ],
        as: 'approval_log',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { keyword_type_id: '$eligibility.keyword_type' },
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
                          input: '$$keyword_type_id',
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
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'eligibility.keyword_type_info',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { point_type_id: '$eligibility.point_type' },
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
                          input: '$$point_type_id',
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
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'eligibility.point_type_info',
      },
    });

    query.push({
      $lookup: {
        from: 'merchantv2',
        let: { merchant_id: '$eligibility.merchant' },
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
                          input: '$$merchant_id',
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
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
              __v: false,
            },
          },
        ],
        as: 'eligibility.merchant_info',
      },
    });

    query.push(
      {
        $lookup: {
          from: 'programv2',
          let: { program_id: '$eligibility.program_id' },
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
                created_by: false,
                created_at: false,
                updated_at: false,
                deleted_at: false,
                __v: false,
              },
            },
          ],
          as: 'eligibility.program_id_info',
        },
      },
      {
        $unwind: {
          path: '$eligibility.program_id_info',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push({
      $addFields: {
        'eligibility.start_period': {
          $switch: {
            branches: [
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIT',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.start_period',
                    { $multiply: [60 * 60 * 1000, -9] },
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WITA',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.start_period',
                    { $multiply: [60 * 60 * 1000, -8] },
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIB',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.start_period',
                    { $multiply: [60 * 60 * 1000, -7] },
                  ],
                },
              },
            ],
            default: '$eligibility.start_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
          },
        },
        'eligibility.end_period': {
          $switch: {
            branches: [
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIT',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.end_period',
                    { $multiply: [60 * 60 * 1000, -9] },
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WITA',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.end_period',
                    { $multiply: [60 * 60 * 1000, -8] },
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WITA',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.end_period',
                    { $multiply: [60 * 60 * 1000, -7] },
                  ],
                },
              },
            ],
            default: '$eligibility.end_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
          },
        },
        'eligibility.program_id_info.start_period': {
          $switch: {
            branches: [
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIT',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.program_id_info.start_period',
                    { $multiply: [60 * 60 * 1000, -9] },
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WITA',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.program_id_info.start_period',
                    { $multiply: [60 * 60 * 1000, -8] },
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIB',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.program_id_info.start_period',
                    { $multiply: [60 * 60 * 1000, -7] },
                  ],
                },
              },
            ],
            default: '$eligibility.program_id_info.start_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
          },
        },
        'eligibility.program_id_info.end_period': {
          $switch: {
            branches: [
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIT',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.program_id_info.end_period',
                    { $multiply: [60 * 60 * 1000, -9] },
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WITA',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.program_id_info.end_period',
                    { $multiply: [60 * 60 * 1000, -8] },
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WITA',
                  ],
                },
                then: {
                  $add: [
                    '$eligibility.program_id_info.end_period',
                    { $multiply: [60 * 60 * 1000, -7] },
                  ],
                },
              },
            ],
            default: '$eligibility.program_id_info.end_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
          },
        },
      },
    });

    query.push({
      $lookup: {
        from: 'programv2',
        let: { program_id: '$eligibility.multiwhitelist_program' },
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
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
              __v: false,
            },
          },
        ],
        as: 'eligibility.multiwhitelist_program_info',
      },
    });

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { superior_hq_id: '$created_by.superior_hq' },
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
                            input: '$$superior_hq_id',
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
              $lookup: {
                from: 'accountlocations',
                let: { account: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ['$account', '$$account'] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'locations',
                      let: { location: '$location' },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [{ $eq: ['$_id', '$$location'] }],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: false,
                          },
                        },
                      ],
                      as: 'location_detail',
                    },
                  },
                  {
                    $unwind: {
                      path: '$location_detail',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: false,
                      account: false,
                      __v: false,
                    },
                  },
                ],
                as: 'account_location',
              },
            },
            {
              $unwind: {
                path: '$account_location',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                created_at: false,
                email: false,
                role: false,
                phone: false,
                job_title: false,
                job_level: false,
                deleted_at: false,
                type: false,
                updated_at: false,
                user_id: false,
                superior_hq: false,
                superior_local: false,
                __v: false,
              },
            },
          ],
          as: 'created_by.superior_hq',
        },
      },
      {
        $unwind: {
          path: '$created_by.superior_hq',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { superior_local_id: '$created_by.superior_local' },
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
                            input: '$$superior_local_id',
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
              $lookup: {
                from: 'accountlocations',
                let: { account: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ['$account', '$$account'] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'locations',
                      let: { location: '$location' },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [{ $eq: ['$_id', '$$location'] }],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: false,
                          },
                        },
                      ],
                      as: 'location_detail',
                    },
                  },
                  {
                    $unwind: {
                      path: '$location_detail',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: false,
                      account: false,
                      __v: false,
                    },
                  },
                ],
                as: 'account_location',
              },
            },
            {
              $unwind: {
                path: '$account_location',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                created_at: false,
                email: false,
                role: false,
                phone: false,
                job_title: false,
                job_level: false,
                deleted_at: false,
                type: false,
                updated_at: false,
                user_id: false,
                superior_hq: false,
                superior_local: false,
                __v: false,
              },
            },
          ],
          as: 'created_by.superior_local',
        },
      },
      {
        $unwind: {
          path: '$created_by.superior_local',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push(
      {
        $lookup: {
          from: 'systemconfigs',
          let: {
            location_type_id:
              '$created_by.account_location.location_detail.type',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        {
                          $convert: {
                            input: '$param_value',
                            to: 'objectId',
                            onNull: '',
                            onError: '',
                          },
                        },
                        '$$location_type_id',
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: false,
                param_value: false,
                __v: false,
              },
            },
          ],
          as: 'isHQ',
        },
      },
      {
        $unwind: {
          path: '$isHQ',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push({
      $set: {
        isHQ: {
          $cond: {
            if: { $ne: ['$isHQ.param_key', 'DEFAULT_LOCATION_HQ'] },
            then: false,
            else: true,
          },
        },
      },
    });

    // filter location by login account
    // if (location_name.name !== 'HQ') {
    //   const userLocation = credential.account_location.location;
    //   const locationParent = userLocation;
    //   const listIdLocation = [userLocation];
    //   const listChild = await this.locationModel
    //     .find({ parent: locationParent }, '_id')
    //     .exec();
    //   if (listChild.length !== 0) {
    //     for (const loop in listChild) {
    //       listIdLocation.push(listChild[loop]._id);
    //     }
    //     query.push({
    //       $match: {
    //         'created_by.account_location.location': { $in: listIdLocation },
    //       },
    //     });
    //   }
    // }

    // if (location_name.name !== 'HQ') {
    //   query.push({
    //     $match: {
    //       $and: [
    //         {
    //           'created_by.account_location.location_detail.type': location_type,
    //         },
    //       ],
    //     },
    //   });
    // }
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
          if (a === 'created_at') {
            const start =
              moment(filterSet[a].start_date)
                .subtract(1, 'days')
                .format('YYYY-MM-DDT') + '17:00:00.000Z';
            const end =
              moment(filterSet[a].end_date).format('YYYY-MM-DDT') +
              '17:00:00.000Z';
            autoColumn[a] = {
              $gte: new Date(start),
              $lt: new Date(end),
            };
          } else {
            if (filterSet[a].value.constructor === Array) {
              if (filterSet[a].value.length > 0) {
                autoColumn[a] = {
                  $in: filterSet[a].value,
                };
              }
            } else {
              autoColumn[a] = {
                $regex: new RegExp(`${filterSet[a].value}`, 'i'),
              };
            }
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
          if (a === 'keyword_approval') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'created_by._id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'created_by.account_location.location') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === '_id') {
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
        } else if (filterSet[a].matchMode === 'length') {
          autoColumn[a] = {
            $size: filterSet[a].value,
          };
        } else {
          autoColumn[a] = filterSet[a];
        }

        if (
          autoColumn[a] &&
          Object.keys(autoColumn[a]).length === 0 &&
          Object.getPrototypeOf(autoColumn[a]) === Object.prototype
        ) {
          console.log(autoColumn);
        } else {
          filter_builder.$and.push(autoColumn);
        }
      }
    }

    console.log(filter_builder);

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

    query.push({ $group: { _id: '$_id', doc: { $first: '$$ROOT' } } });
    query.push({
      $replaceRoot: {
        newRoot: { $mergeObjects: ['$doc'] },
      },
    });

    const allNoFilter = await this.keywordModel.aggregate(
      query,
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

    const data = await this.keywordModel.aggregate(query, (err, result) => {
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

  async all(param, credential: any, token = ''): Promise<unknown> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: token,
    });

    const location_type = new mongoose.Types.ObjectId(
      accountSet.account_location.location_detail.type,
    );
    // const location_name = accountSet.account_location.location_detail;

    const defaultLocationHQ = await this.appsService.getConfig(
      'DEFAULT_LOCATION_HQ',
    );

    const defaultLocationRegion = await this.appsService.getConfig(
      'DEFAULT_STATUS_LOCATION_REGION',
    );

    const defaultLocationBranch = await this.appsService.getConfig(
      'DEFAULT_STATUS_LOCATION_BRANCH',
    );

    const defaultLocationArea = await this.appsService.getConfig(
      'DEFAULT_STATUS_LOCATION_AREA',
    );

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
          if (a === 'created_at') {
            const start =
              moment(filterSet[a].start_date)
                .subtract(1, 'days')
                .format('YYYY-MM-DDT') + '17:00:00.000Z';
            const end =
              moment(filterSet[a].end_date).format('YYYY-MM-DDT') +
              '17:00:00.000Z';
            autoColumn[a] = {
              $gte: new Date(start),
              $lt: new Date(end),
            };
          } else if (a === 'bonus.bonus_type') {
            autoColumn[a] = `${filterSet[a].value}`;
          } else if (a === 'bonus.voucher_type') {
            autoColumn[a] = `${filterSet[a].value}`;
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
          if (a === 'keyword_approval') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'created_by._id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'created_by.account_location.location') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === '_id') {
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
        } else if (filterSet[a].matchMode === 'gte') {
          if (a === 'eligibility.end_period') {
            const end =
              moment(filterSet[a].value).format('YYYY-MM-DDT') +
              '17:00:00.000Z';
            autoColumn[a] = {
              $gte: new Date(end),
            };
          }
        }

        if (a === 'name') {
          autoColumn['eligibility.name'] = autoColumn[a];
          delete autoColumn[a];
        }
        filter_builder.$and.push(autoColumn, { deleted_at: null });
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

    if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder;
      }

      query.push({
        $sort: sort_set,
      });
    }

    query.push({
      $match: {
        $and: [
          {
            deleted_at: null,
            keyword_edit: null,
            'eligibility.name': { $not: /-EDIT-/ },
          },
        ],
      },
    });

    query.push(
      {
        $lookup: {
          from: 'programv2',
          let: { program_id: '$eligibility.program_id' },
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
                created_by: false,
                created_at: false,
                updated_at: false,
                deleted_at: false,
                __v: false,
              },
            },
          ],
          as: 'eligibility.program_id_info',
        },
      },
      {
        $unwind: {
          path: '$eligibility.program_id_info',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    if (location_type?.toString() !== defaultLocationHQ) {
      const userLocation = credential.account_location.location;
      if (location_type?.toString() === defaultLocationArea) {
        console.log('=== KEYWORD VIEW AREA ===');
        const listIdLocation = await this.getListIdLocation(
          this.locationModel,
          userLocation,
          location_type,
        );
        console.log('=== listIdLocation ===', listIdLocation);
        query.push({
          $match: {
            'eligibility.program_id_info.program_owner_detail': {
              $in: listIdLocation,
            },
          },
        });
      }
      if (location_type?.toString() === defaultLocationRegion) {
        console.log('=== KEYWORD VIEW REGION ===');
        const listIdLocation = await this.getListIdLocation(
          this.locationModel,
          userLocation,
          location_type,
        );
        console.log('=== listIdLocation ===', listIdLocation);
        query.push({
          $match: {
            'eligibility.program_id_info.program_owner_detail': {
              $in: listIdLocation,
            },
          },
        });
      }

      if (location_type?.toString() === defaultLocationBranch) {
        console.log('=== KEYWORD VIEW BRANCH ===');

        const listIdLocation = await this.getListIdLocation(
          this.locationModel,
          userLocation,
          location_type,
        );
        console.log('=== listIdLocation ===', listIdLocation);
        query.push({
          $match: {
            'eligibility.program_id_info.program_owner_detail': {
              $in: listIdLocation,
            },
          },
        });
      }
    }

    const allNoFilter = await this.keywordModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    query.push({ $skip: first });

    query.push({ $limit: rows });

    query.push({
      $lookup: {
        from: 'keywordapprovallogs',
        let: { keyword_id: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
              },
            },
          },
          { $sort: { created_at: 1 } },
          {
            $lookup: {
              from: 'lovs',
              let: { status: '$status' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$status'] }],
                    },
                  },
                },
                {
                  $project: {
                    group_name: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'status',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { account: '$processed_by' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$_id', '$$account'] }],
                    },
                  },
                },
                {
                  $project: {
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'processed_by',
            },
          },
          {
            $project: {
              keyword: false,
              __v: false,
            },
          },
        ],
        as: 'approval_log',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { keyword_type_id: '$eligibility.keyword_type' },
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
                          input: '$$keyword_type_id',
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
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'eligibility.keyword_type_info',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { point_type_id: '$eligibility.point_type' },
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
                          input: '$$point_type_id',
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
            $set: {
              name: '$set_value',
            },
          },
          {
            $project: {
              __v: false,
              set_value: false,
              group_name: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
            },
          },
        ],
        as: 'eligibility.point_type_info',
      },
    });

    query.push({
      $lookup: {
        from: 'merchantv2',
        let: { merchant_id: '$eligibility.merchant' },
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
                          input: '$$merchant_id',
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
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
              __v: false,
            },
          },
        ],
        as: 'eligibility.merchant_info',
      },
    });

    query.push({
      $lookup: {
        from: 'stocks',
        let: {
          keywordId: '$_id',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$keyword', '$$keywordId'], // Perubahan di sini
                  },
                ],
              },
            },
          },
        ],
        as: 'stock_data',
      },
    });

    query.push({
      $addFields: {
        'eligibility.start_period': {
          $switch: {
            branches: [
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIT',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.start_period',
                            9 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+09:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WITA',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.start_period',
                            8 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+08:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIB',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.start_period',
                            7 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'GENERAL',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.start_period',
                            7 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
            ],
            default: '$eligibility.start_period', // default value
          },
        },
        'eligibility.end_period': {
          $switch: {
            branches: [
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIT',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$eligibility.end_period', 9 * 60 * 60 * 1000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+09:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WITA',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$eligibility.end_period', 8 * 60 * 60 * 1000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+08:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIB',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$eligibility.end_period', 7 * 60 * 60 * 1000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'GENERAL',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: ['$eligibility.end_period', 7 * 60 * 60 * 1000],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
            ],
            default: '$eligibility.end_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
          },
        },
        'eligibility.program_id_info.start_period': {
          $switch: {
            branches: [
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIT',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.program_id_info.start_period',
                            9 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+09:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WITA',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.program_id_info.start_period',
                            8 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+08:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIB',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.program_id_info.start_period',
                            7 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'GENERAL',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.program_id_info.start_period',
                            7 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
            ],
            default: '$eligibility.program_id_info.start_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
          },
        },
        'eligibility.program_id_info.end_period': {
          $switch: {
            branches: [
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIT',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.program_id_info.end_period',
                            9 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+09:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WITA',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.program_id_info.end_period',
                            8 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+08:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'WIB',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.program_id_info.end_period',
                            7 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
              {
                case: {
                  $eq: [
                    '$eligibility.program_id_info.program_time_zone',
                    'GENERAL',
                  ],
                },
                then: {
                  $concat: [
                    {
                      $dateToString: {
                        date: {
                          $add: [
                            '$eligibility.program_id_info.end_period',
                            7 * 60 * 60 * 1000,
                          ],
                        },
                        format: '%Y-%m-%dT%H:%M:%S.000',
                      },
                    },
                    '+07:00',
                  ],
                },
              },
            ],
            default: '$eligibility.program_id_info.end_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
          },
        },
      },
    });

    query.push({
      $addFields: {
        bonus: {
          $map: {
            input: '$bonus',
            as: 'bonusItem',
            in: {
              $mergeObjects: [
                '$$bonusItem',
                {
                  stock_location: {
                    $map: {
                      input: '$$bonusItem.stock_location',
                      as: 'locationItem',
                      in: {
                        $mergeObjects: [
                          '$$locationItem',
                          {
                            balance: {
                              $let: {
                                vars: {
                                  stockData: {
                                    $arrayElemAt: [
                                      {
                                        $filter: {
                                          input: '$stock_data',
                                          as: 'stockItem',
                                          cond: {
                                            $eq: [
                                              '$$stockItem.location',
                                              {
                                                $convert: {
                                                  input:
                                                    '$$locationItem.location_id',
                                                  to: 'objectId',
                                                  onNull: '',
                                                  onError: '',
                                                },
                                              },
                                            ],
                                          },
                                        },
                                      },
                                      0,
                                    ],
                                  },
                                },
                                in: { $ifNull: ['$$stockData.balance', 0] },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });

    query.push({
      $project: {
        stock_data: 0,
      },
    });

    query.push({
      $lookup: {
        from: 'programv2',
        let: {
          whitelistPrograms: {
            $cond: {
              if: { $isArray: '$eligibility.multiwhitelist_program' },
              then: '$eligibility.multiwhitelist_program',
              else: ['$eligibility.multiwhitelist_program'],
            },
          },
        },
        pipeline: [
          {
            $addFields: {
              convertedId: { $toString: '$_id' },
            },
          },
          {
            $match: {
              $expr: { $in: ['$convertedId', '$$whitelistPrograms'] },
            },
          },
          {
            $project: {
              convertedId: 0,
              _id: false,
              created_by: false,
              created_at: false,
              updated_at: false,
              deleted_at: false,
              program_notification: false,
              __v: false,
            },
          },
        ],
        as: 'eligibility.multiwhitelist_program_info',
      },
    });

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { superior_hq_id: '$created_by.superior_hq' },
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
                            input: '$$superior_hq_id',
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
              $lookup: {
                from: 'accountlocations',
                let: { account: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ['$account', '$$account'] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'locations',
                      let: { location: '$location' },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [{ $eq: ['$_id', '$$location'] }],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: false,
                          },
                        },
                      ],
                      as: 'location_detail',
                    },
                  },
                  {
                    $unwind: {
                      path: '$location_detail',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: false,
                      account: false,
                      __v: false,
                    },
                  },
                ],
                as: 'account_location',
              },
            },
            {
              $unwind: {
                path: '$account_location',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                created_at: false,
                email: false,
                role: false,
                phone: false,
                job_title: false,
                job_level: false,
                deleted_at: false,
                type: false,
                updated_at: false,
                user_id: false,
                superior_hq: false,
                superior_local: false,
                __v: false,
              },
            },
          ],
          as: 'created_by.superior_hq',
        },
      },
      {
        $unwind: {
          path: '$created_by.superior_hq',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push(
      {
        $lookup: {
          from: 'accounts',
          let: { superior_local_id: '$created_by.superior_local' },
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
                            input: '$$superior_local_id',
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
              $lookup: {
                from: 'accountlocations',
                let: { account: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ['$account', '$$account'] }],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: 'locations',
                      let: { location: '$location' },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and: [{ $eq: ['$_id', '$$location'] }],
                            },
                          },
                        },
                        {
                          $project: {
                            _id: false,
                          },
                        },
                      ],
                      as: 'location_detail',
                    },
                  },
                  {
                    $unwind: {
                      path: '$location_detail',
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $project: {
                      _id: false,
                      account: false,
                      __v: false,
                    },
                  },
                ],
                as: 'account_location',
              },
            },
            {
              $unwind: {
                path: '$account_location',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                created_at: false,
                email: false,
                role: false,
                phone: false,
                job_title: false,
                job_level: false,
                deleted_at: false,
                type: false,
                updated_at: false,
                user_id: false,
                superior_hq: false,
                superior_local: false,
                __v: false,
              },
            },
          ],
          as: 'created_by.superior_local',
        },
      },
      {
        $unwind: {
          path: '$created_by.superior_local',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push(
      {
        $lookup: {
          from: 'systemconfigs',
          let: {
            location_type_id:
              '$created_by.account_location.location_detail.type',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: [
                        {
                          $convert: {
                            input: '$param_value',
                            to: 'objectId',
                            onNull: '',
                            onError: '',
                          },
                        },
                        '$$location_type_id',
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: false,
                param_value: false,
                __v: false,
              },
            },
          ],
          as: 'isHQ',
        },
      },
      {
        $unwind: {
          path: '$isHQ',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    query.push({
      $set: {
        isHQ: {
          $cond: {
            if: { $ne: ['$isHQ.param_key', 'DEFAULT_LOCATION_HQ'] },
            then: false,
            else: true,
          },
        },
      },
    });

    const data = await this.keywordModel.aggregate(query, (err, result) => {
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

  async detail(_id: string): Promise<any> {
    let data;
    const id = new Types.ObjectId(_id);
    const getKeyword: any = await this.keywordModel.findById(id);
    const checkKeyEdit = getKeyword?.eligibility?.name.includes('-EDIT');
    const checkKeyHQ =
      getKeyword?.created_by?.account_location?.location_detail?.type.toString();
    const hqLocation = await this.appsService.getConfig('DEFAULT_LOCATION_HQ');
    const statusApprove = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_APPROVE_HQ'),
    );
    let isHq = false;
    if (checkKeyHQ == hqLocation) {
      isHq = true;
    } else {
      isHq = false;
    }
    let queryBalance: any = {};
    if (
      getKeyword.keyword_approval.equals(statusApprove) &&
      getKeyword?.eligibility?.flashsale?.status == true
    ) {
      queryBalance = {
        $addFields: {
          bonus: {
            $map: {
              input: '$bonus',
              as: 'bonusItem',
              in: {
                $mergeObjects: [
                  '$$bonusItem',
                  {
                    stock_location: {
                      $map: {
                        input: '$$bonusItem.stock_location',
                        as: 'locationItem',
                        in: {
                          $mergeObjects: [
                            '$$locationItem',
                            {
                              balance: {
                                $let: {
                                  vars: {
                                    stockData: {
                                      $arrayElemAt: [
                                        {
                                          $filter: {
                                            input: '$stock_data',
                                            as: 'stockItem',
                                            cond: {
                                              $eq: [
                                                '$$stockItem.location',
                                                {
                                                  $convert: {
                                                    input:
                                                      '$$locationItem.location_id',
                                                    to: 'objectId',
                                                    onNull: '',
                                                    onError: '',
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        },
                                        0,
                                      ],
                                    },
                                  },
                                  in: { $ifNull: ['$$stockData.balance', 0] },
                                },
                              },
                              balance_flashsale: {
                                $let: {
                                  vars: {
                                    stockData: {
                                      $arrayElemAt: [
                                        {
                                          $filter: {
                                            input: '$stock_data',
                                            as: 'stockItem',
                                            cond: {
                                              $eq: [
                                                '$$stockItem.location',
                                                {
                                                  $convert: {
                                                    input:
                                                      '$$locationItem.location_id',
                                                    to: 'objectId',
                                                    onNull: '',
                                                    onError: '',
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        },
                                        0,
                                      ],
                                    },
                                  },
                                  in: {
                                    $ifNull: [
                                      '$$stockData.balance_flashsale',
                                      0,
                                    ],
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };
    } else {
      queryBalance = {
        $addFields: {
          bonus: {
            $map: {
              input: '$bonus',
              as: 'bonusItem',
              in: {
                $mergeObjects: [
                  '$$bonusItem',
                  {
                    stock_location: {
                      $map: {
                        input: '$$bonusItem.stock_location',
                        as: 'locationItem',
                        in: {
                          $mergeObjects: [
                            '$$locationItem',
                            {
                              balance: {
                                $let: {
                                  vars: {
                                    stockData: {
                                      $arrayElemAt: [
                                        {
                                          $filter: {
                                            input: '$stock_data',
                                            as: 'stockItem',
                                            cond: {
                                              $eq: [
                                                '$$stockItem.location',
                                                {
                                                  $convert: {
                                                    input:
                                                      '$$locationItem.location_id',
                                                    to: 'objectId',
                                                    onNull: '',
                                                    onError: '',
                                                  },
                                                },
                                              ],
                                            },
                                          },
                                        },
                                        0,
                                      ],
                                    },
                                  },
                                  in: { $ifNull: ['$$stockData.balance', 0] },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };
    }

    console.log('=== IS HQ ===', isHq);
    if (checkKeyEdit && isHq == false) {
      const mainKey = getKeyword?.eligibility?.name.replace(/-EDIT$/, '');
      const getKeywordMain = await this.keywordModel.findOne({
        'eligibility.name': mainKey,
      });
      data = await this.keywordModel.aggregate(
        [
          {
            $lookup: {
              from: 'programv2',
              let: { program_id: '$eligibility.program_id' },
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
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'eligibility.program_id_info',
            },
          },
          {
            $unwind: {
              path: '$eligibility.program_id_info',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              'eligibility.start_period': {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIT',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.start_period',
                                  9 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WITA',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.start_period',
                                  8 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIB',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.start_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'GENERAL',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.start_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$eligibility.start_period', // default value
                },
              },
              'eligibility.end_period': {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIT',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.end_period',
                                  9 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WITA',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.end_period',
                                  8 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIB',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.end_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'GENERAL',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.end_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$eligibility.end_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
                },
              },
              'eligibility.program_id_info.start_period': {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIT',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.start_period',
                                  9 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WITA',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.start_period',
                                  8 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIB',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.start_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'GENERAL',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.start_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$eligibility.program_id_info.start_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
                },
              },
              'eligibility.program_id_info.end_period': {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIT',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.end_period',
                                  9 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WITA',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.end_period',
                                  8 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIB',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.end_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'GENERAL',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.end_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$eligibility.program_id_info.end_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
                },
              },
              'eligibility.flashsale.start_date': {
                $concat: [
                  {
                    $dateToString: {
                      date: {
                        $add: [
                          '$eligibility.flashsale.start_date',
                          7 * 60 * 60 * 1000,
                        ],
                      },
                      format: '%Y-%m-%dT%H:%M:%S.000',
                    },
                  },
                  '+07:00',
                ],
              },
              'eligibility.flashsale.end_date': {
                $concat: [
                  {
                    $dateToString: {
                      date: {
                        $add: [
                          '$eligibility.flashsale.end_date',
                          7 * 60 * 60 * 1000,
                        ],
                      },
                      format: '%Y-%m-%dT%H:%M:%S.000',
                    },
                  },
                  '+07:00',
                ],
              },
              getbank: {
                $map: {
                  input: {
                    $filter: {
                      input: '$bonus',
                      as: 'bns',
                      cond: {
                        $eq: ['$$bns.bonus_type', 'mbp'],
                      },
                    },
                  },
                  as: 'bank_agg',
                  in: {
                    $mergeObjects: [
                      '$$bank_agg',
                      { bank_code: { $toObjectId: '$$bank_agg.bank_code' } },
                    ],
                  },
                },
              },
            },
          },
          {
            $lookup: {
              from: 'lovs',
              localField: 'getbank.bank_code',
              foreignField: '_id',
              as: 'bank_info',
            },
          },
          {
            $lookup: {
              from: 'stocks',
              let: {
                keywordId: '$_id',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ['$keyword', '$$keywordId'], // Perubahan di sini
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'stock_data',
            },
          },
          {
            $addFields: {
              'eligibility.segmentation_customer_tier': {
                $map: {
                  input: '$eligibility.segmentation_customer_tier',
                  as: 'segmentation_customer_tier',
                  in: { $toObjectId: '$$segmentation_customer_tier' },
                },
              },
              'eligibility.channel_validation_list': {
                $map: {
                  input: '$eligibility.channel_validation_list',
                  as: 'channel_validation_list',
                  in: { $toObjectId: '$$channel_validation_list' },
                },
              },
              'eligibility.locations': {
                $map: {
                  input: '$eligibility.locations',
                  as: 'locations',
                  in: { $toObjectId: '$$locations' },
                },
              },
              'eligibility.segmentation_customer_most_redeem': {
                $map: {
                  input: '$eligibility.segmentation_customer_most_redeem',
                  as: 'segmentation_customer_most_redeem',
                  in: { $toObjectId: '$$segmentation_customer_most_redeem' },
                },
              },
              'eligibility.segmentation_customer_brand': {
                $map: {
                  input: '$eligibility.segmentation_customer_brand',
                  as: 'segmentation_customer_brand',
                  in: { $toObjectId: '$$segmentation_customer_brand' },
                },
              },
              bonus: {
                $map: {
                  input: '$bonus',
                  in: {
                    $cond: [
                      { $not: [{ $eq: ['$$this.bonus_type', 'mbp'] }] },
                      {
                        $mergeObjects: ['$$this', { a: 1 }],
                      },
                      {
                        $mergeObjects: [
                          '$$this',
                          {
                            bank: {
                              $toObjectId: '$$this.bank_code',
                            },
                            bank_detail: {
                              $arrayElemAt: [
                                '$bank_info',
                                {
                                  $indexOfArray: [
                                    '$bank_info._id',
                                    { $toObjectId: '$$this.bank_code' },
                                  ],
                                },
                              ],
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $addFields: {
              bonus: {
                $map: {
                  input: '$bonus',
                  as: 'bonusItem',
                  in: {
                    $mergeObjects: [
                      '$$bonusItem',
                      {
                        stock_location: {
                          $map: {
                            input: '$$bonusItem.stock_location',
                            as: 'locationItem',
                            in: {
                              $mergeObjects: [
                                '$$locationItem',
                                {
                                  balance: {
                                    $let: {
                                      vars: {
                                        stockData: {
                                          $arrayElemAt: [
                                            {
                                              $filter: {
                                                input: '$stock_data',
                                                as: 'stockItem',
                                                cond: {
                                                  $eq: [
                                                    '$$stockItem.location',
                                                    {
                                                      $convert: {
                                                        input:
                                                          '$$locationItem.location_id',
                                                        to: 'objectId',
                                                        onNull: '',
                                                        onError: '',
                                                      },
                                                    },
                                                  ],
                                                },
                                              },
                                            },
                                            0,
                                          ],
                                        },
                                      },
                                      in: {
                                        $ifNull: ['$$stockData.balance', 0],
                                      },
                                    },
                                  },
                                  balance_flashsale: {
                                    $let: {
                                      vars: {
                                        stockData: {
                                          $arrayElemAt: [
                                            {
                                              $filter: {
                                                input: '$stock_data',
                                                as: 'stockItem',
                                                cond: {
                                                  $eq: [
                                                    '$$stockItem.location',
                                                    {
                                                      $convert: {
                                                        input:
                                                          '$$locationItem.location_id',
                                                        to: 'objectId',
                                                        onNull: '',
                                                        onError: '',
                                                      },
                                                    },
                                                  ],
                                                },
                                              },
                                            },
                                            0,
                                          ],
                                        },
                                      },
                                      in: {
                                        $ifNull: [
                                          '$$stockData.balance_flashsale',
                                          0,
                                        ],
                                      },
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              bank_info: false,
              getbank: false,
              'bank_detail_mbp.created_by': false,
              'bank_detail_mbp.deleted_at': false,
              'bank_detail_mbp.__v': false,
              stock_data: 0,
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { point_type: '$eligibility.point_type' },
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
                                input: '$$point_type',
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
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'eligibility.point_type_info',
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { keyword_type_id: '$eligibility.keyword_type' },
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
                                input: '$$keyword_type_id',
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
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'eligibility.keyword_type_info',
            },
          },
          {
            $lookup: {
              from: 'merchantv2',
              let: { merchant_id: '$eligibility.merchant' },
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
                                input: '$$merchant_id',
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
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'eligibility.merchant_info',
            },
          },
          {
            $lookup: {
              from: 'programv2',
              let: {
                whitelistPrograms: {
                  $cond: {
                    if: { $isArray: '$eligibility.multiwhitelist_program' },
                    then: '$eligibility.multiwhitelist_program',
                    else: ['$eligibility.multiwhitelist_program'],
                  },
                },
              },
              pipeline: [
                {
                  $addFields: {
                    convertedId: { $toString: '$_id' },
                  },
                },
                {
                  $match: {
                    $expr: { $in: ['$convertedId', '$$whitelistPrograms'] },
                  },
                },
                {
                  $project: {
                    convertedId: 0,
                    _id: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    program_notification: false,
                    __v: false,
                  },
                },
              ],
              as: 'eligibility.multiwhitelist_program_info',
            },
          },
          {
            $lookup: {
              from: 'channels',
              let: {
                channel_validation_list_info:
                  '$eligibility.channel_validation_list',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$channel_validation_list_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.channel_validation_list_info',
            },
          },
          {
            $lookup: {
              from: 'locations',
              let: { locations_info: '$eligibility.locations' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$locations_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.locations_info',
            },
          },
          {
            $lookup: {
              from: 'customertiers',
              let: {
                segmentation_customer_tier_info:
                  '$eligibility.segmentation_customer_tier',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$segmentation_customer_tier_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.segmentation_customer_tier_info',
            },
          },
          {
            $lookup: {
              from: 'customerbadges',
              let: {
                segmentation_customer_most_redeem_info:
                  '$eligibility.segmentation_customer_most_redeem',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$segmentation_customer_most_redeem_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.segmentation_customer_most_redeem_info',
            },
          },
          {
            $lookup: {
              from: 'customerbrands',
              let: {
                segmentation_customer_brand_info:
                  '$eligibility.segmentation_customer_brand',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$segmentation_customer_brand_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.segmentation_customer_brand_info',
            },
          },
          {
            $lookup: {
              from: 'keywordapprovallogs',
              let: {
                processed_by: '$created_by.superior_hq',
                keyword_id: '$_id',
                keywordMain: new Types.ObjectId(getKeywordMain?._id), // This line seems incorrect
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        {
                          $and: [
                            { $eq: ['$keyword', '$$keywordMain'] },
                            {
                              $eq: [
                                '$processed_by',
                                {
                                  $convert: {
                                    input: '$$processed_by',
                                    to: 'objectId',
                                    onNull: '',
                                    onError: '',
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        {
                          $eq: ['$keyword', '$$keyword_id'],
                        },
                      ],
                    },
                  },
                },
                { $sort: { created_at: 1 } },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { status: '$status' },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ['$_id', '$$status'] },
                        },
                      },
                      {
                        $project: {
                          group_name: false,
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'status',
                  },
                },
                {
                  $lookup: {
                    from: 'accounts',
                    let: { account: '$processed_by' },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ['$_id', '$$account'] },
                        },
                      },
                      {
                        $project: {
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'processed_by',
                  },
                },
                {
                  $project: {
                    program: false,
                    __v: false,
                  },
                },
              ],
              as: 'approval_log',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_hq_id: '$created_by.superior_hq' },
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
                                input: '$$superior_hq_id',
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
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_hq',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_hq',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_local_id: '$created_by.superior_local' },
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
                                input: '$$superior_local_id',
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
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_local',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_local',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'systemconfigs',
              let: {
                location_type_id:
                  '$created_by.account_location.location_detail.type',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$param_value',
                            { $toString: '$$location_type_id' },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: false,
                    param_value: false,
                    __v: false,
                  },
                },
              ],
              as: 'isHQ',
            },
          },
          {
            $unwind: {
              path: '$isHQ',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              isHQ: {
                $cond: {
                  if: { $ne: ['$isHQ.param_key', 'DEFAULT_LOCATION_HQ'] },
                  then: false,
                  else: true,
                },
              },
            },
          },
          {
            $lookup: {
              from: 'keywordnotifications',
              let: { keyword_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
                    },
                  },
                },
                {
                  $project: {
                    keyword: true,
                    bonus_type_id: true,
                    keyword_name: true,
                    code_identifier: true,
                    notification_content: true,
                    start_period: true,
                    end_period: true,
                    notif_type: true,
                    via: {
                      $map: {
                        input: '$via',
                        as: 'via_detail',
                        in: {
                          $toObjectId: '$$via_detail',
                        },
                      },
                    },
                    receiver: {
                      $map: {
                        input: '$receiver',
                        as: 'receiver_detail',
                        in: {
                          $toObjectId: '$$receiver_detail',
                        },
                      },
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    localField: 'via',
                    foreignField: '_id',
                    as: 'via_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    localField: 'receiver',
                    foreignField: '_id',
                    as: 'receiver_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { code_identifier_id: '$code_identifier' },
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
                                      input: '$$code_identifier_id',
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
                    ],
                    as: 'code_identifier_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'notificationtemplates',

                    let: { notif_type_id: '$notif_type' },
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
                                      input: '$$notif_type_id',
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
                    ],
                    as: 'notif_type_detail',
                  },
                },
              ],
              as: 'notification',
            },
          },
          {
            $lookup: {
              from: 'keywords',
              let: { original_keyword_name: '$eligibility.name' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$eligibility.name',
                        { $concat: ['$$original_keyword_name', '-EDIT'] },
                      ],
                    },
                  },
                },
              ],
              as: 'keyword_duplicate',
            },
          },
          {
            $set: {
              is_duplicating: {
                $cond: {
                  if: { $gt: [{ $size: '$keyword_duplicate' }, 0] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              keyword_duplicate: 0,
            },
          },
          {
            $match: {
              $and: [{ deleted_at: null }, { _id: id }],
            },
          },
        ],
        (err, result) => {
          return result;
        },
      );
      const isValidObjectId = Types.ObjectId.isValid(_id);
      if (isValidObjectId) {
        if (data.length > 0) {
          return data[0];
        } else {
          throw new BadRequestException([
            { isInvalidDataContent: `Data with ID ${_id} is not found` },
          ]);
        }
      } else {
        throw new BadRequestException([
          { isInvalidDataContent: `ID ${_id} is not valid format` },
        ]);
      }
    } else {
      data = await this.keywordModel.aggregate(
        [
          {
            $lookup: {
              from: 'programv2',
              let: { program_id: '$eligibility.program_id' },
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
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'eligibility.program_id_info',
            },
          },
          {
            $unwind: {
              path: '$eligibility.program_id_info',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              'eligibility.start_period': {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIT',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.start_period',
                                  9 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WITA',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.start_period',
                                  8 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIB',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.start_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'GENERAL',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.start_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$eligibility.start_period', // default value
                },
              },
              'eligibility.end_period': {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIT',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.end_period',
                                  9 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WITA',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.end_period',
                                  8 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIB',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.end_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'GENERAL',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.end_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$eligibility.end_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
                },
              },
              'eligibility.program_id_info.start_period': {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIT',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.start_period',
                                  9 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WITA',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.start_period',
                                  8 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIB',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.start_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'GENERAL',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.start_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$eligibility.program_id_info.start_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
                },
              },
              'eligibility.program_id_info.end_period': {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIT',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.end_period',
                                  9 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+09:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WITA',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.end_period',
                                  8 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+08:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'WIB',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.end_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                    {
                      case: {
                        $eq: [
                          '$eligibility.program_id_info.program_time_zone',
                          'GENERAL',
                        ],
                      },
                      then: {
                        $concat: [
                          {
                            $dateToString: {
                              date: {
                                $add: [
                                  '$eligibility.program_id_info.end_period',
                                  7 * 60 * 60 * 1000,
                                ],
                              },
                              format: '%Y-%m-%dT%H:%M:%S.000',
                            },
                          },
                          '+07:00',
                        ],
                      },
                    },
                  ],
                  default: '$eligibility.program_id_info.end_period', // default value diubah ke eligibility.start_period agar tidak menimbulkan masalah
                },
              },
              'eligibility.flashsale.start_date': {
                $concat: [
                  {
                    $dateToString: {
                      date: {
                        $add: [
                          '$eligibility.flashsale.start_date',
                          7 * 60 * 60 * 1000,
                        ],
                      },
                      format: '%Y-%m-%dT%H:%M:%S.000',
                    },
                  },
                  '+07:00',
                ],
              },
              'eligibility.flashsale.end_date': {
                $concat: [
                  {
                    $dateToString: {
                      date: {
                        $add: [
                          '$eligibility.flashsale.end_date',
                          7 * 60 * 60 * 1000,
                        ],
                      },
                      format: '%Y-%m-%dT%H:%M:%S.000',
                    },
                  },
                  '+07:00',
                ],
              },
              getbank: {
                $map: {
                  input: {
                    $filter: {
                      input: '$bonus',
                      as: 'bns',
                      cond: {
                        $eq: ['$$bns.bonus_type', 'mbp'],
                      },
                    },
                  },
                  as: 'bank_agg',
                  in: {
                    $mergeObjects: [
                      '$$bank_agg',
                      { bank_code: { $toObjectId: '$$bank_agg.bank_code' } },
                    ],
                  },
                },
              },
            },
          },
          {
            $lookup: {
              from: 'lovs',
              localField: 'getbank.bank_code',
              foreignField: '_id',
              as: 'bank_info',
            },
          },
          {
            $lookup: {
              from: 'stocks',
              let: {
                keywordId: '$_id',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ['$keyword', '$$keywordId'], // Perubahan di sini
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'stock_data',
            },
          },
          {
            $addFields: {
              'eligibility.segmentation_customer_tier': {
                $map: {
                  input: '$eligibility.segmentation_customer_tier',
                  as: 'segmentation_customer_tier',
                  in: { $toObjectId: '$$segmentation_customer_tier' },
                },
              },
              'eligibility.channel_validation_list': {
                $map: {
                  input: '$eligibility.channel_validation_list',
                  as: 'channel_validation_list',
                  in: { $toObjectId: '$$channel_validation_list' },
                },
              },
              'eligibility.locations': {
                $map: {
                  input: '$eligibility.locations',
                  as: 'locations',
                  in: { $toObjectId: '$$locations' },
                },
              },
              'eligibility.segmentation_customer_most_redeem': {
                $map: {
                  input: '$eligibility.segmentation_customer_most_redeem',
                  as: 'segmentation_customer_most_redeem',
                  in: { $toObjectId: '$$segmentation_customer_most_redeem' },
                },
              },
              'eligibility.segmentation_customer_brand': {
                $map: {
                  input: '$eligibility.segmentation_customer_brand',
                  as: 'segmentation_customer_brand',
                  in: { $toObjectId: '$$segmentation_customer_brand' },
                },
              },
              bonus: {
                $map: {
                  input: '$bonus',
                  in: {
                    $cond: [
                      { $not: [{ $eq: ['$$this.bonus_type', 'mbp'] }] },
                      {
                        $mergeObjects: ['$$this', { a: 1 }],
                      },
                      {
                        $mergeObjects: [
                          '$$this',
                          {
                            bank: {
                              $toObjectId: '$$this.bank_code',
                            },
                            bank_detail: {
                              $arrayElemAt: [
                                '$bank_info',
                                {
                                  $indexOfArray: [
                                    '$bank_info._id',
                                    { $toObjectId: '$$this.bank_code' },
                                  ],
                                },
                              ],
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          queryBalance,
          {
            $project: {
              bank_info: false,
              getbank: false,
              'bank_detail_mbp.created_by': false,
              'bank_detail_mbp.deleted_at': false,
              'bank_detail_mbp.__v': false,
              stock_data: 0,
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { point_type: '$eligibility.point_type' },
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
                                input: '$$point_type',
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
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'eligibility.point_type_info',
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { keyword_type_id: '$eligibility.keyword_type' },
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
                                input: '$$keyword_type_id',
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
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'eligibility.keyword_type_info',
            },
          },
          {
            $lookup: {
              from: 'merchantv2',
              let: { merchant_id: '$eligibility.merchant' },
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
                                input: '$$merchant_id',
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
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'eligibility.merchant_info',
            },
          },
          {
            $lookup: {
              from: 'programv2',
              let: {
                whitelistPrograms: {
                  $cond: {
                    if: { $isArray: '$eligibility.multiwhitelist_program' },
                    then: '$eligibility.multiwhitelist_program',
                    else: ['$eligibility.multiwhitelist_program'],
                  },
                },
              },
              pipeline: [
                {
                  $addFields: {
                    convertedId: { $toString: '$_id' },
                  },
                },
                {
                  $match: {
                    $expr: { $in: ['$convertedId', '$$whitelistPrograms'] },
                  },
                },
                {
                  $project: {
                    convertedId: 0,
                    _id: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    program_notification: false,
                    __v: false,
                  },
                },
              ],
              as: 'eligibility.multiwhitelist_program_info',
            },
          },
          {
            $lookup: {
              from: 'channels',
              let: {
                channel_validation_list_info:
                  '$eligibility.channel_validation_list',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$channel_validation_list_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.channel_validation_list_info',
            },
          },
          {
            $lookup: {
              from: 'locations',
              let: { locations_info: '$eligibility.locations' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$locations_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.locations_info',
            },
          },
          {
            $lookup: {
              from: 'customertiers',
              let: {
                segmentation_customer_tier_info:
                  '$eligibility.segmentation_customer_tier',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$segmentation_customer_tier_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.segmentation_customer_tier_info',
            },
          },
          {
            $lookup: {
              from: 'customerbadges',
              let: {
                segmentation_customer_most_redeem_info:
                  '$eligibility.segmentation_customer_most_redeem',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$segmentation_customer_most_redeem_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.segmentation_customer_most_redeem_info',
            },
          },
          {
            $lookup: {
              from: 'customerbrands',
              let: {
                segmentation_customer_brand_info:
                  '$eligibility.segmentation_customer_brand',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$segmentation_customer_brand_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.segmentation_customer_brand_info',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_hq_id: '$created_by.superior_hq' },
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
                                input: '$$superior_hq_id',
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
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_hq',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_hq',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_local_id: '$created_by.superior_local' },
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
                                input: '$$superior_local_id',
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
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_local',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_local',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'systemconfigs',
              let: {
                location_type_id:
                  '$created_by.account_location.location_detail.type',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            '$param_value',
                            { $toString: '$$location_type_id' },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: false,
                    param_value: false,
                    __v: false,
                  },
                },
              ],
              as: 'isHQ',
            },
          },
          {
            $unwind: {
              path: '$isHQ',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $set: {
              isHQ: {
                $cond: {
                  if: { $ne: ['$isHQ.param_key', 'DEFAULT_LOCATION_HQ'] },
                  then: false,
                  else: true,
                },
              },
            },
          },
          {
            $lookup: {
              from: 'keywordapprovallogs',
              let: { keyword_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
                    },
                  },
                },
                { $sort: { created_at: 1 } },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { status: '$status' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$_id', '$$status'] }],
                          },
                        },
                      },
                      {
                        $project: {
                          group_name: false,
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'status',
                  },
                },
                {
                  $lookup: {
                    from: 'accounts',
                    let: { account: '$processed_by' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$_id', '$$account'] }],
                          },
                        },
                      },
                      {
                        $project: {
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'processed_by',
                  },
                },
                {
                  $project: {
                    keyword: false,
                    __v: false,
                  },
                },
              ],
              as: 'approval_log',
            },
          },
          {
            $lookup: {
              from: 'keywordnotifications',
              let: { keyword_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
                    },
                  },
                },
                {
                  $project: {
                    keyword: true,
                    bonus_type_id: true,
                    keyword_name: true,
                    code_identifier: true,
                    notification_content: true,
                    start_period: true,
                    end_period: true,
                    notif_type: true,
                    via: {
                      $map: {
                        input: '$via',
                        as: 'via_detail',
                        in: {
                          $toObjectId: '$$via_detail',
                        },
                      },
                    },
                    receiver: {
                      $map: {
                        input: '$receiver',
                        as: 'receiver_detail',
                        in: {
                          $toObjectId: '$$receiver_detail',
                        },
                      },
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    localField: 'via',
                    foreignField: '_id',
                    as: 'via_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    localField: 'receiver',
                    foreignField: '_id',
                    as: 'receiver_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { code_identifier_id: '$code_identifier' },
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
                                      input: '$$code_identifier_id',
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
                    ],
                    as: 'code_identifier_detail',
                  },
                },
                {
                  $lookup: {
                    from: 'notificationtemplates',

                    let: { notif_type_id: '$notif_type' },
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
                                      input: '$$notif_type_id',
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
                    ],
                    as: 'notif_type_detail',
                  },
                },
              ],
              as: 'notification',
            },
          },
          {
            $lookup: {
              from: 'keywords',
              let: { original_keyword_name: '$eligibility.name' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$eligibility.name',
                        { $concat: ['$$original_keyword_name', '-EDIT'] },
                      ],
                    },
                  },
                },
              ],
              as: 'keyword_duplicate',
            },
          },
          {
            $set: {
              is_duplicating: {
                $cond: {
                  if: { $gt: [{ $size: '$keyword_duplicate' }, 0] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              keyword_duplicate: 0,
            },
          },
          {
            $match: {
              $and: [{ deleted_at: null }, { _id: id }],
            },
          },
        ],
        (err, result) => {
          return result;
        },
      );
      const isValidObjectId = Types.ObjectId.isValid(_id);
      if (isValidObjectId) {
        if (data.length > 0) {
          return data[0];
        } else {
          throw new BadRequestException([
            { isInvalidDataContent: `Data with ID ${_id} is not found` },
          ]);
        }
      } else {
        throw new BadRequestException([
          { isInvalidDataContent: `ID ${_id} is not valid format` },
        ]);
      }
    }
    return data;
  }

  async checkKeywordNameExist(name: string): Promise<boolean> {
    const now = Date.now();

    const configApproval = await this.callApiConfigService.callConfig(
      CallApiConfig.API_STATUS_APPROVAL_HQ,
    );

    if (configApproval === false) {
      return false;
    }

    const key = `${RedisDataKey.KEYWORD_KEY2}-approved-${name}`;
    const redisKeyword: any = await this.cacheManager.get(key);
    let result = false;

    if (redisKeyword) {
      console.log(
        `REDIS|Load keyword_approved ${name} from Redis|${Date.now() - now}`,
      );

      result = true;
    } else {
      const keyword = await this.keywordModel.findOne({
        'eligibility.name': name,
        keyword_approval: new mongoose.Types.ObjectId(configApproval),
      });

      console.log(
        `REDIS|Load keyword_approved ${name} from Database|${Date.now() - now}`,
      );

      if (keyword) {
        await this.cacheManager.set(key, 1, { ttl: 24 * 60 * 60 });
        result = true;
      }
    }

    return result;
  }

  async detailFromName(name: string): Promise<any> {
    const id = await this.keywordModel.findOne({ 'eligibility.name': name });
    if (!id) {
      return null;
    }

    return await this.detail(id._id.toString());
  }

  async detailv2(_id: string): Promise<any> {
    const data = await this.keywordModel.aggregate(
      [
        {
          $match: {
            $and: [
              { deleted_at: null },
              { _id: new mongoose.Types.ObjectId(_id) },
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

  async findRegexKeywordByName(name: string): Promise<any> {
    const data = await this.keywordModel.aggregate(
      [
        {
          $addFields: {
            // customer_experience: {
            //   $map: {
            //     input: '$eligibility.program_experience',
            //     in: { $toObjectId: '$$this' },
            //   },
            // },
            'eligibility.segmentation_customer_tier': {
              $map: {
                input: '$eligibility.segmentation_customer_tier',
                as: 'segmentation_customer_tier',
                in: { $toObjectId: '$$segmentation_customer_tier' },
              },
            },
            'eligibility.channel_validation_list': {
              $map: {
                input: '$eligibility.channel_validation_list',
                as: 'channel_validation_list',
                in: { $toObjectId: '$$channel_validation_list' },
              },
            },
            'eligibility.locations': {
              $map: {
                input: '$eligibility.locations',
                as: 'locations',
                in: { $toObjectId: '$$locations' },
              },
            },
            'eligibility.segmentation_customer_most_redeem': {
              $map: {
                input: '$eligibility.segmentation_customer_most_redeem',
                as: 'segmentation_customer_most_redeem',
                in: { $toObjectId: '$$segmentation_customer_most_redeem' },
              },
            },
            'eligibility.segmentation_customer_brand': {
              $map: {
                input: '$eligibility.segmentation_customer_brand',
                as: 'segmentation_customer_brand',
                in: { $toObjectId: '$$segmentation_customer_brand' },
              },
            },
          },
        },
        // {
        //   $lookup: {
        //     from: 'customerbadges',
        //     localField: 'customer_experience',
        //     foreignField: '_id',
        //     // pipeline: [
        //     //   {
        //     //     $project: {
        //     //       __v: false,
        //     //       _id: false,
        //     //       created_at: false,
        //     //       updated_at: false,
        //     //       deleted_at: false,
        //     //     },
        //     //   },
        //     // ],
        //     as: 'eligibility.program_experience',
        //   },
        // },
        {
          $lookup: {
            from: 'lovs',
            let: { point_type: '$eligibility.point_type' },
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
                              input: '$$point_type',
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
                $set: {
                  name: '$set_value',
                },
              },
              {
                $project: {
                  __v: false,
                  set_value: false,
                  group_name: false,
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'eligibility.point_type_info',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            let: { keyword_type_id: '$eligibility.keyword_type' },
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
                              input: '$$keyword_type_id',
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
                $set: {
                  name: '$set_value',
                },
              },
              {
                $project: {
                  __v: false,
                  set_value: false,
                  group_name: false,
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'eligibility.keyword_type_info',
          },
        },
        {
          $lookup: {
            from: 'merchantv2',
            let: { merchant_id: '$eligibility.merchant' },
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
                              input: '$$merchant_id',
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
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                  __v: false,
                },
              },
            ],
            as: 'eligibility.merchant_info',
          },
        },
        {
          $lookup: {
            from: 'programv2',
            let: { program_id: '$eligibility.program_id' },
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
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                  __v: false,
                },
              },
            ],
            as: 'eligibility.program_id_info',
          },
        },
        {
          $lookup: {
            from: 'channels',
            let: {
              channel_validation_list_info:
                '$eligibility.channel_validation_list',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$channel_validation_list_info'],
                  },
                },
              },
            ],
            as: 'eligibility.channel_validation_list_info',
          },
        },
        {
          $lookup: {
            from: 'locations',
            let: { locations_info: '$eligibility.locations' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$locations_info'],
                  },
                },
              },
            ],
            as: 'eligibility.locations_info',
          },
        },
        {
          $lookup: {
            from: 'customertiers',
            let: {
              segmentation_customer_tier_info:
                '$eligibility.segmentation_customer_tier',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$segmentation_customer_tier_info'],
                  },
                },
              },
            ],
            as: 'eligibility.segmentation_customer_tier_info',
          },
        },
        {
          $lookup: {
            from: 'customerbadges',
            let: {
              segmentation_customer_most_redeem_info:
                '$eligibility.segmentation_customer_most_redeem',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$segmentation_customer_most_redeem_info'],
                  },
                },
              },
            ],
            as: 'eligibility.segmentation_customer_most_redeem_info',
          },
        },
        {
          $lookup: {
            from: 'customerbrands',
            let: {
              segmentation_customer_brand_info:
                '$eligibility.segmentation_customer_brand',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$segmentation_customer_brand_info'],
                  },
                },
              },
            ],
            as: 'eligibility.segmentation_customer_brand_info',
          },
        },
        {
          $lookup: {
            from: 'accounts',
            let: { superior_hq_id: '$created_by.superior_hq' },
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
                              input: '$$superior_hq_id',
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
                $lookup: {
                  from: 'accountlocations',
                  let: { account: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$account', '$$account'] }],
                        },
                      },
                    },
                    {
                      $lookup: {
                        from: 'locations',
                        let: { location: '$location' },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [{ $eq: ['$_id', '$$location'] }],
                              },
                            },
                          },
                          {
                            $project: {
                              _id: false,
                            },
                          },
                        ],
                        as: 'location_detail',
                      },
                    },
                    {
                      $unwind: {
                        path: '$location_detail',
                        preserveNullAndEmptyArrays: true,
                      },
                    },
                    {
                      $project: {
                        _id: false,
                        account: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'account_location',
                },
              },
              {
                $unwind: {
                  path: '$account_location',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  created_at: false,
                  email: false,
                  role: false,
                  phone: false,
                  job_title: false,
                  job_level: false,
                  deleted_at: false,
                  type: false,
                  updated_at: false,
                  user_id: false,
                  superior_hq: false,
                  superior_local: false,
                  __v: false,
                },
              },
            ],
            as: 'created_by.superior_hq',
          },
        },
        {
          $unwind: {
            path: '$created_by.superior_hq',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'accounts',
            let: { superior_local_id: '$created_by.superior_local' },
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
                              input: '$$superior_local_id',
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
                $lookup: {
                  from: 'accountlocations',
                  let: { account: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$account', '$$account'] }],
                        },
                      },
                    },
                    {
                      $lookup: {
                        from: 'locations',
                        let: { location: '$location' },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [{ $eq: ['$_id', '$$location'] }],
                              },
                            },
                          },
                          {
                            $project: {
                              _id: false,
                            },
                          },
                        ],
                        as: 'location_detail',
                      },
                    },
                    {
                      $unwind: {
                        path: '$location_detail',
                        preserveNullAndEmptyArrays: true,
                      },
                    },
                    {
                      $project: {
                        _id: false,
                        account: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'account_location',
                },
              },
              {
                $unwind: {
                  path: '$account_location',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  created_at: false,
                  email: false,
                  role: false,
                  phone: false,
                  job_title: false,
                  job_level: false,
                  deleted_at: false,
                  type: false,
                  updated_at: false,
                  user_id: false,
                  superior_hq: false,
                  superior_local: false,
                  __v: false,
                },
              },
            ],
            as: 'created_by.superior_local',
          },
        },
        {
          $unwind: {
            path: '$created_by.superior_local',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'systemconfigs',
            let: {
              location_type_id:
                '$created_by.account_location.location_detail.type',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          {
                            $convert: {
                              input: '$param_value',
                              to: 'objectId',
                              onNull: '',
                              onError: '',
                            },
                          },
                          '$$location_type_id',
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: false,
                  param_value: false,
                  param_key: false,
                  __v: false,
                },
              },
            ],
            as: 'isHQ',
          },
        },
        {
          $set: {
            isHQ: {
              $cond: [
                {
                  $eq: ['$isHQ', []],
                },
                false,
                true,
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'keywordapprovallogs',
            let: { keyword_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
                  },
                },
              },
              { $sort: { created_at: 1 } },
              {
                $lookup: {
                  from: 'lovs',
                  let: { status: '$status' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$_id', '$$status'] }],
                        },
                      },
                    },
                    {
                      $project: {
                        group_name: false,
                        created_at: false,
                        updated_at: false,
                        deleted_at: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'status',
                },
              },
              {
                $lookup: {
                  from: 'accounts',
                  let: { account: '$processed_by' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$_id', '$$account'] }],
                        },
                      },
                    },
                    {
                      $project: {
                        created_at: false,
                        updated_at: false,
                        deleted_at: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'processed_by',
                },
              },
              {
                $project: {
                  keyword: false,
                  __v: false,
                },
              },
            ],
            as: 'approval_log',
          },
        },
        {
          $lookup: {
            from: 'keywordnotifications',
            let: { keyword_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
                  },
                },
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
            ],
            as: 'notification',
          },
        },
        {
          $match: {
            $and: [
              { deleted_at: null },
              { 'eligibility.name': { $regex: name } },
            ],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
    return data;
  }

  async findKeywordByName(name: string): Promise<any> {
    const data = await this.keywordModel.aggregate(
      [
        {
          $addFields: {
            // customer_experience: {
            //   $map: {
            //     input: '$eligibility.program_experience',
            //     in: { $toObjectId: '$$this' },
            //   },
            // },
            'eligibility.segmentation_customer_tier': {
              $map: {
                input: '$eligibility.segmentation_customer_tier',
                as: 'segmentation_customer_tier',
                in: { $toObjectId: '$$segmentation_customer_tier' },
              },
            },
            'eligibility.channel_validation_list': {
              $map: {
                input: '$eligibility.channel_validation_list',
                as: 'channel_validation_list',
                in: { $toObjectId: '$$channel_validation_list' },
              },
            },
            'eligibility.locations': {
              $map: {
                input: '$eligibility.locations',
                as: 'locations',
                in: { $toObjectId: '$$locations' },
              },
            },
            'eligibility.segmentation_customer_most_redeem': {
              $map: {
                input: '$eligibility.segmentation_customer_most_redeem',
                as: 'segmentation_customer_most_redeem',
                in: { $toObjectId: '$$segmentation_customer_most_redeem' },
              },
            },
            'eligibility.segmentation_customer_brand': {
              $map: {
                input: '$eligibility.segmentation_customer_brand',
                as: 'segmentation_customer_brand',
                in: { $toObjectId: '$$segmentation_customer_brand' },
              },
            },
          },
        },
        // {
        //   $lookup: {
        //     from: 'customerbadges',
        //     localField: 'customer_experience',
        //     foreignField: '_id',
        //     // pipeline: [
        //     //   {
        //     //     $project: {
        //     //       __v: false,
        //     //       _id: false,
        //     //       created_at: false,
        //     //       updated_at: false,
        //     //       deleted_at: false,
        //     //     },
        //     //   },
        //     // ],
        //     as: 'eligibility.program_experience',
        //   },
        // },
        {
          $lookup: {
            from: 'lovs',
            let: { point_type: '$eligibility.point_type' },
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
                              input: '$$point_type',
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
                $set: {
                  name: '$set_value',
                },
              },
              {
                $project: {
                  __v: false,
                  set_value: false,
                  group_name: false,
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'eligibility.point_type_info',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            let: { keyword_type_id: '$eligibility.keyword_type' },
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
                              input: '$$keyword_type_id',
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
                $set: {
                  name: '$set_value',
                },
              },
              {
                $project: {
                  __v: false,
                  set_value: false,
                  group_name: false,
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
            as: 'eligibility.keyword_type_info',
          },
        },
        {
          $lookup: {
            from: 'merchantv2',
            let: { merchant_id: '$eligibility.merchant' },
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
                              input: '$$merchant_id',
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
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                  __v: false,
                },
              },
            ],
            as: 'eligibility.merchant_info',
          },
        },
        {
          $lookup: {
            from: 'programv2',
            let: { program_id: '$eligibility.program_id' },
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
                  created_by: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                  __v: false,
                },
              },
            ],
            as: 'eligibility.program_id_info',
          },
        },
        {
          $lookup: {
            from: 'channels',
            let: {
              channel_validation_list_info:
                '$eligibility.channel_validation_list',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$channel_validation_list_info'],
                  },
                },
              },
            ],
            as: 'eligibility.channel_validation_list_info',
          },
        },
        {
          $lookup: {
            from: 'locations',
            let: { locations_info: '$eligibility.locations' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$locations_info'],
                  },
                },
              },
            ],
            as: 'eligibility.locations_info',
          },
        },
        {
          $lookup: {
            from: 'customertiers',
            let: {
              segmentation_customer_tier_info:
                '$eligibility.segmentation_customer_tier',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$segmentation_customer_tier_info'],
                  },
                },
              },
            ],
            as: 'eligibility.segmentation_customer_tier_info',
          },
        },
        {
          $lookup: {
            from: 'customerbadges',
            let: {
              segmentation_customer_most_redeem_info:
                '$eligibility.segmentation_customer_most_redeem',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$segmentation_customer_most_redeem_info'],
                  },
                },
              },
            ],
            as: 'eligibility.segmentation_customer_most_redeem_info',
          },
        },
        {
          $lookup: {
            from: 'customerbrands',
            let: {
              segmentation_customer_brand_info:
                '$eligibility.segmentation_customer_brand',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$segmentation_customer_brand_info'],
                  },
                },
              },
            ],
            as: 'eligibility.segmentation_customer_brand_info',
          },
        },
        {
          $lookup: {
            from: 'accounts',
            let: { superior_hq_id: '$created_by.superior_hq' },
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
                              input: '$$superior_hq_id',
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
                $lookup: {
                  from: 'accountlocations',
                  let: { account: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$account', '$$account'] }],
                        },
                      },
                    },
                    {
                      $lookup: {
                        from: 'locations',
                        let: { location: '$location' },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [{ $eq: ['$_id', '$$location'] }],
                              },
                            },
                          },
                          {
                            $project: {
                              _id: false,
                            },
                          },
                        ],
                        as: 'location_detail',
                      },
                    },
                    {
                      $unwind: {
                        path: '$location_detail',
                        preserveNullAndEmptyArrays: true,
                      },
                    },
                    {
                      $project: {
                        _id: false,
                        account: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'account_location',
                },
              },
              {
                $unwind: {
                  path: '$account_location',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  created_at: false,
                  email: false,
                  role: false,
                  phone: false,
                  job_title: false,
                  job_level: false,
                  deleted_at: false,
                  type: false,
                  updated_at: false,
                  user_id: false,
                  superior_hq: false,
                  superior_local: false,
                  __v: false,
                },
              },
            ],
            as: 'created_by.superior_hq',
          },
        },
        {
          $unwind: {
            path: '$created_by.superior_hq',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'accounts',
            let: { superior_local_id: '$created_by.superior_local' },
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
                              input: '$$superior_local_id',
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
                $lookup: {
                  from: 'accountlocations',
                  let: { account: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$account', '$$account'] }],
                        },
                      },
                    },
                    {
                      $lookup: {
                        from: 'locations',
                        let: { location: '$location' },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [{ $eq: ['$_id', '$$location'] }],
                              },
                            },
                          },
                          {
                            $project: {
                              _id: false,
                            },
                          },
                        ],
                        as: 'location_detail',
                      },
                    },
                    {
                      $unwind: {
                        path: '$location_detail',
                        preserveNullAndEmptyArrays: true,
                      },
                    },
                    {
                      $project: {
                        _id: false,
                        account: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'account_location',
                },
              },
              {
                $unwind: {
                  path: '$account_location',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  created_at: false,
                  email: false,
                  role: false,
                  phone: false,
                  job_title: false,
                  job_level: false,
                  deleted_at: false,
                  type: false,
                  updated_at: false,
                  user_id: false,
                  superior_hq: false,
                  superior_local: false,
                  __v: false,
                },
              },
            ],
            as: 'created_by.superior_local',
          },
        },
        {
          $unwind: {
            path: '$created_by.superior_local',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'systemconfigs',
            let: {
              location_type_id:
                '$created_by.account_location.location_detail.type',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          {
                            $convert: {
                              input: '$param_value',
                              to: 'objectId',
                              onNull: '',
                              onError: '',
                            },
                          },
                          '$$location_type_id',
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  _id: false,
                  param_value: false,
                  param_key: false,
                  __v: false,
                },
              },
            ],
            as: 'isHQ',
          },
        },
        {
          $set: {
            isHQ: {
              $cond: [
                {
                  $eq: ['$isHQ', []],
                },
                false,
                true,
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'keywordapprovallogs',
            let: { keyword_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
                  },
                },
              },
              { $sort: { created_at: 1 } },
              {
                $lookup: {
                  from: 'lovs',
                  let: { status: '$status' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$_id', '$$status'] }],
                        },
                      },
                    },
                    {
                      $project: {
                        group_name: false,
                        created_at: false,
                        updated_at: false,
                        deleted_at: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'status',
                },
              },
              {
                $lookup: {
                  from: 'accounts',
                  let: { account: '$processed_by' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$_id', '$$account'] }],
                        },
                      },
                    },
                    {
                      $project: {
                        created_at: false,
                        updated_at: false,
                        deleted_at: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'processed_by',
                },
              },
              {
                $project: {
                  keyword: false,
                  __v: false,
                },
              },
            ],
            as: 'approval_log',
          },
        },
        {
          $lookup: {
            from: 'keywordnotifications',
            let: { keyword_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
                  },
                },
              },
              {
                $project: {
                  keyword: true,
                  bonus_type_id: true,
                  keyword_name: true,
                  code_identifier: true,
                  notification_content: true,
                  start_period: true,
                  end_period: true,
                  notif_type: true,
                  receiver: true,
                  via: {
                    $map: {
                      input: '$via',
                      as: 'via_detail',
                      in: {
                        $toObjectId: '$$via_detail',
                      },
                    },
                  },
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
            ],
            as: 'notification',
          },
        },
        {
          $match: {
            $and: [{ deleted_at: null }, { 'eligibility.name': name }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
    return data[0];
  }

  async findKeywordByNameWithRedis(name: string): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.KEYWORD_KEY2}-${name}`;
    const redisKeyword: any = await this.cacheManager.get(key);
    let result = null;

    if (redisKeyword) {
      console.log(`REDIS|Load keyword ${name} from Redis|${Date.now() - now}`);

      result = redisKeyword;
    } else {
      const data = await this.keywordModel.aggregate(
        [
          {
            $addFields: {
              // customer_experience: {
              //   $map: {
              //     input: '$eligibility.program_experience',
              //     in: { $toObjectId: '$$this' },
              //   },
              // },
              'eligibility.segmentation_customer_tier': {
                $map: {
                  input: '$eligibility.segmentation_customer_tier',
                  as: 'segmentation_customer_tier',
                  in: { $toObjectId: '$$segmentation_customer_tier' },
                },
              },
              'eligibility.channel_validation_list': {
                $map: {
                  input: '$eligibility.channel_validation_list',
                  as: 'channel_validation_list',
                  in: { $toObjectId: '$$channel_validation_list' },
                },
              },
              'eligibility.locations': {
                $map: {
                  input: '$eligibility.locations',
                  as: 'locations',
                  in: { $toObjectId: '$$locations' },
                },
              },
              'eligibility.segmentation_customer_most_redeem': {
                $map: {
                  input: '$eligibility.segmentation_customer_most_redeem',
                  as: 'segmentation_customer_most_redeem',
                  in: { $toObjectId: '$$segmentation_customer_most_redeem' },
                },
              },
              'eligibility.segmentation_customer_brand': {
                $map: {
                  input: '$eligibility.segmentation_customer_brand',
                  as: 'segmentation_customer_brand',
                  in: { $toObjectId: '$$segmentation_customer_brand' },
                },
              },
            },
          },
          // {
          //   $lookup: {
          //     from: 'customerbadges',
          //     localField: 'customer_experience',
          //     foreignField: '_id',
          //     // pipeline: [
          //     //   {
          //     //     $project: {
          //     //       __v: false,
          //     //       _id: false,
          //     //       created_at: false,
          //     //       updated_at: false,
          //     //       deleted_at: false,
          //     //     },
          //     //   },
          //     // ],
          //     as: 'eligibility.program_experience',
          //   },
          // },
          {
            $lookup: {
              from: 'lovs',
              let: { point_type: '$eligibility.point_type' },
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
                                input: '$$point_type',
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
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'eligibility.point_type_info',
            },
          },
          {
            $lookup: {
              from: 'lovs',
              let: { keyword_type_id: '$eligibility.keyword_type' },
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
                                input: '$$keyword_type_id',
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
                  $set: {
                    name: '$set_value',
                  },
                },
                {
                  $project: {
                    __v: false,
                    set_value: false,
                    group_name: false,
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                  },
                },
              ],
              as: 'eligibility.keyword_type_info',
            },
          },
          {
            $lookup: {
              from: 'merchantv2',
              let: { merchant_id: '$eligibility.merchant' },
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
                                input: '$$merchant_id',
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
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'eligibility.merchant_info',
            },
          },
          {
            $lookup: {
              from: 'programv2',
              let: { program_id: '$eligibility.program_id' },
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
                    created_by: false,
                    created_at: false,
                    updated_at: false,
                    deleted_at: false,
                    __v: false,
                  },
                },
              ],
              as: 'eligibility.program_id_info',
            },
          },
          {
            $lookup: {
              from: 'channels',
              let: {
                channel_validation_list_info:
                  '$eligibility.channel_validation_list',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$channel_validation_list_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.channel_validation_list_info',
            },
          },
          {
            $lookup: {
              from: 'locations',
              let: { locations_info: '$eligibility.locations' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$locations_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.locations_info',
            },
          },
          {
            $lookup: {
              from: 'customertiers',
              let: {
                segmentation_customer_tier_info:
                  '$eligibility.segmentation_customer_tier',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$segmentation_customer_tier_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.segmentation_customer_tier_info',
            },
          },
          {
            $lookup: {
              from: 'customerbadges',
              let: {
                segmentation_customer_most_redeem_info:
                  '$eligibility.segmentation_customer_most_redeem',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$segmentation_customer_most_redeem_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.segmentation_customer_most_redeem_info',
            },
          },
          {
            $lookup: {
              from: 'customerbrands',
              let: {
                segmentation_customer_brand_info:
                  '$eligibility.segmentation_customer_brand',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ['$_id', '$$segmentation_customer_brand_info'],
                    },
                  },
                },
              ],
              as: 'eligibility.segmentation_customer_brand_info',
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_hq_id: '$created_by.superior_hq' },
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
                                input: '$$superior_hq_id',
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
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    email: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_hq',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_hq',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'accounts',
              let: { superior_local_id: '$created_by.superior_local' },
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
                                input: '$$superior_local_id',
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
                  $lookup: {
                    from: 'accountlocations',
                    let: { account: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$account', '$$account'] }],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: 'locations',
                          let: { location: '$location' },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [{ $eq: ['$_id', '$$location'] }],
                                },
                              },
                            },
                            {
                              $project: {
                                _id: false,
                              },
                            },
                          ],
                          as: 'location_detail',
                        },
                      },
                      {
                        $unwind: {
                          path: '$location_detail',
                          preserveNullAndEmptyArrays: true,
                        },
                      },
                      {
                        $project: {
                          _id: false,
                          account: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'account_location',
                  },
                },
                {
                  $unwind: {
                    path: '$account_location',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $project: {
                    created_at: false,
                    email: false,
                    role: false,
                    phone: false,
                    job_title: false,
                    job_level: false,
                    deleted_at: false,
                    type: false,
                    updated_at: false,
                    user_id: false,
                    superior_hq: false,
                    superior_local: false,
                    __v: false,
                  },
                },
              ],
              as: 'created_by.superior_local',
            },
          },
          {
            $unwind: {
              path: '$created_by.superior_local',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'systemconfigs',
              let: {
                location_type_id:
                  '$created_by.account_location.location_detail.type',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: [
                            {
                              $convert: {
                                input: '$param_value',
                                to: 'objectId',
                                onNull: '',
                                onError: '',
                              },
                            },
                            '$$location_type_id',
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: false,
                    param_value: false,
                    param_key: false,
                    __v: false,
                  },
                },
              ],
              as: 'isHQ',
            },
          },
          {
            $set: {
              isHQ: {
                $cond: [
                  {
                    $eq: ['$isHQ', []],
                  },
                  false,
                  true,
                ],
              },
            },
          },
          {
            $lookup: {
              from: 'keywordapprovallogs',
              let: { keyword_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
                    },
                  },
                },
                { $sort: { created_at: 1 } },
                {
                  $lookup: {
                    from: 'lovs',
                    let: { status: '$status' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$_id', '$$status'] }],
                          },
                        },
                      },
                      {
                        $project: {
                          group_name: false,
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'status',
                  },
                },
                {
                  $lookup: {
                    from: 'accounts',
                    let: { account: '$processed_by' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [{ $eq: ['$_id', '$$account'] }],
                          },
                        },
                      },
                      {
                        $project: {
                          created_at: false,
                          updated_at: false,
                          deleted_at: false,
                          __v: false,
                        },
                      },
                    ],
                    as: 'processed_by',
                  },
                },
                {
                  $project: {
                    keyword: false,
                    __v: false,
                  },
                },
              ],
              as: 'approval_log',
            },
          },
          {
            $lookup: {
              from: 'keywordnotifications',
              let: { keyword_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
                    },
                  },
                },
                {
                  $project: {
                    keyword: true,
                    bonus_type_id: true,
                    keyword_name: true,
                    code_identifier: true,
                    notification_content: true,
                    start_period: true,
                    end_period: true,
                    notif_type: true,
                    receiver: true,
                    via: {
                      $map: {
                        input: '$via',
                        as: 'via_detail',
                        in: {
                          $toObjectId: '$$via_detail',
                        },
                      },
                    },
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
              ],
              as: 'notification',
            },
          },
          {
            $match: {
              $and: [{ deleted_at: null }, { 'eligibility.name': name }],
            },
          },
        ],
        (err, result) => {
          return result;
        },
      );

      console.log(
        `REDIS|Load keyword ${name} from Database|${Date.now() - now}`,
      );

      if (data) {
        await this.cacheManager.set(key, data, { ttl: 24 * 60 * 60 });
        result = data;
      }
    }

    return result?.[0];
  }

  async add(data: Keyword, account: Account): Promise<GlobalResponse> {
    const checkName = await this.checkAvailKeyword({
      'eligibility.name': data.eligibility.name,
    });
    const checkKeywordRegis = await this.checkKeywordRegistration({
      keyword_registration: data.eligibility.name,
    });
    const response = new GlobalResponse();
    response.transaction_classify = 'KEYWORD_ADD';

    // check voucher code length
    let hasDiscountVoucher: any = data.bonus.filter(
      (el) => el.bonus_type == 'discount_voucher',
    );
    if (hasDiscountVoucher.length > 0) {
      hasDiscountVoucher = hasDiscountVoucher[0];
      if (hasDiscountVoucher.voucher_type == 'Generate') {
        const totalVoucherLength =
          String(hasDiscountVoucher.voucher_prefix).length +
          Number(hasDiscountVoucher.jumlah_total_voucher);
        if (totalVoucherLength < 10 || totalVoucherLength > 32) {
          throw new BadRequestException([
            {
              isVoucherCodeLength:
                'Voucher Code length must be between 10 - 32 characters only',
            },
          ]);
        }
      }
    }

    let start_period;
    let end_period;
    if (checkName) {
      if (checkKeywordRegis) {
        const programDetail = await this.programService.findProgramById(
          data.eligibility.program_id,
        );
        if (!programDetail) {
          throw new Error('Program not found');
        }

        if (!this.isKeywordPeriodValid(data.eligibility, programDetail)) {
          console.log('=== KEYWORD DI LUAR RANGE PROGRAM ====');
          throw new Error(
            "The keyword period is not in the program's date range.",
          );
        }
        start_period = new Date(data.eligibility.start_period);
        end_period = new Date(data.eligibility.end_period);
        const newKeyword = new this.keywordModel({
          ...data,
          'eligibility.start_period': start_period,
          'eligibility.end_period': end_period,
          keyword_approval: new mongoose.Types.ObjectId(
            await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_ADD'),
          ),
          created_by: account,
        });

        if (
          newKeyword.eligibility.poin_redeemed < 0 ||
          newKeyword.eligibility.total_budget < 0 ||
          newKeyword.eligibility.customer_value < 0
        ) {
          console.log('=== CASEVALIDASI INVALID NON NEGATIVE NUMBER===');
          throw new Error('Invalid value. Must be a non-negative number.');
        }

        //Handler Product Booked Not Reserve waiting status Actived
        for (const bonusData of data.bonus) {
          switch (bonusData?.bonus_type) {
            case 'direct_redeem':
              const bonusDirectRedeem = plainToInstance(
                KeywordDirectRedeem,
                bonusData,
              );
              for (const location of bonusDirectRedeem?.stock_location || []) {
                const checkStatusReserve =
                  await this.serviceStock.getStockReserveByIdProduct(
                    bonusDirectRedeem?.merchandise,
                    'Booked',
                    location?.stock,
                  );
                console.log('=== CHECK STATUS RESERVE ===', checkStatusReserve);
                if (checkStatusReserve) {
                  throw new Error(
                    `Merchandise has been used for keywords and is still in the keyword approval process`,
                  );
                }
              }

              //Check jika remaing merchandise remaining 0
              for (const location of bonusDirectRedeem?.stock_location || []) {
                const checkStatusReserve =
                  await this.serviceStock.getStockReserveByIdProduct(
                    bonusDirectRedeem?.merchandise,
                    'Created',
                    location?.stock,
                  );
                console.log('=== CHECK STATUS RESERVE ===', checkStatusReserve);
                if (checkStatusReserve) {
                  throw new Error(`Merchandise stock has run out`);
                }
              }
              break;
          }
        }

        await newKeyword
          .save()
          .then(async (parentOID) => {
            data.bonus.map(async (bonusData) => {
              switch (bonusData?.bonus_type) {
                case 'mbp':
                  const dataMbp = plainToInstance(
                    KeywordMobileBanking,
                    bonusData,
                  );
                  const dataMbpArr = dataMbp.ip_address.split(',');
                  dataMbpArr.map(async (itemMbp) => {
                    const checkIsExistingBank = await this.bankModel
                      .findOne({ bank: dataMbp.bank_code, ip_address: itemMbp })
                      .exec();
                    if (!checkIsExistingBank) {
                      const newNotification = new this.bankModel({
                        bank: dataMbp.bank_code,
                        ip_address: itemMbp,
                        created_by: account,
                      });
                      await newNotification
                        .save()
                        .then((res) => {
                          return res;
                        })
                        .catch((e) => {
                          throw new Error(e);
                        });
                    }
                  });
                  break;
                case 'direct_redeem':
                  const bonusDirectRedeem = plainToInstance(
                    KeywordDirectRedeem,
                    bonusData,
                  );
                  if (parentOID?.is_draft == false) {
                    bonusDirectRedeem?.stock_location?.map(async (location) => {
                      // if (location['name'] !== 'HQ') {
                      const payloadReserve = new StockReserveDTO();
                      payloadReserve.keyword = parentOID?._id?.toString();
                      payloadReserve.destination_location =
                        location?.location_id;
                      payloadReserve.product = bonusDirectRedeem?.merchandise;
                      payloadReserve.is_flashsale = false;
                      payloadReserve.qty = location?.stock;
                      payloadReserve.origin_location = null;
                      try {
                        const locationHQ =
                          await this.serviceStock.getLocationHQ();
                        payloadReserve.origin_location =
                          locationHQ?._id.toString();
                        const a =
                          await this.serviceStock.reserve_process_with_keyword(
                            payloadReserve,
                            account,
                          );
                      } catch (error) {
                        console.log(
                          '<-- Step :: reserve_process_with_keyword -->',
                        );
                        console.log(
                          error?.message ??
                            'Fail -> reserve_process_with_keyword',
                        );
                        console.log(
                          '<-- Step :: reserve_process_with_keyword -->',
                        );
                      }
                    });
                  }
                  break;
              }
            });
            if (data.notification.length > 0) {
              data.notification.map(async (notificationData) => {
                const newNotification = new this.keywordNotificationModel({
                  keyword: parentOID?._id,
                  ...notificationData,
                });

                await newNotification
                  .save()
                  .then(async (returning) => {
                    return returning;
                  })
                  .catch((e) => {
                    throw new Error(e.message);
                  });
              });
            }
            const superior_var = await this.detail(parentOID?._id);
            const getAccountService = await this.accountService.detail(
              superior_var?.created_by?._id,
            );
            const trace_id = this.transactionOptional.getTracingId(
              data,
              response,
            );
            if (
              getAccountService?.account_location?.location_detail?.name ===
              'HQ'
            ) {
              try {
                await this.sendKeywordApprovalNotificationHQ(
                  parentOID,
                  parentOID,
                  account,
                  superior_var,
                  trace_id,
                );
              } catch (e) {
                throw new Error(e.message);
              }
            } else {
              await this.sendKeywordApprovalNotificationNonHQ(
                parentOID,
                parentOID,
                account,
                superior_var,
                trace_id,
              );
            }
            response.statusCode = HttpStatus.OK;
            response.message = 'Keyword created successfully';
            response.payload = data;

            await this.slRedisService.reloadKeyword({
              'eligibility.name': data.eligibility.name.toString(),
            });
          })
          .catch((e) => {
            throw new Error(e.message);
          });
      } else {
        throw new BadRequestException([
          {
            isInvalidDataContent:
              'Duplicate keyword registration are not allowed',
          },
        ]);
      }
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: 'Duplicate keyword names' },
      ]);
    }
    return response;
  }

  async delete(_id: string, soft = true): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'DELETE_EXAMPLE';
    const oid = new mongoose.Types.ObjectId(_id);

    if (soft) {
      await this.keywordModel
        .findOne({
          _id: oid,
          is_draft: true,
        })
        .exec()
        .then(async (keyword) => {
          if (keyword) {
            keyword.set({
              deleted_at: new Date(),
            });
            await keyword.save();
            response.statusCode = HttpStatus.NO_CONTENT;
            response.message = 'Keyword delete success';
            response.payload = keyword;

            await this.slRedisService.reloadKeyword({
              _id: new mongoose.Types.ObjectId(_id),
            });
          } else {
            throw new Error('Keyword delete only status DRAFT');
          }
        })
        .catch((e) => {
          throw new Error(e.message);
        });
    }
    return response;
  }

  async edit(
    _id: string,
    request: Keyword,
    account: Account,
  ): Promise<GlobalResponse> {
    const statusNew = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_ADD'),
    );

    const statusApprove = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_APPROVE_HQ'),
    );

    const statusReject = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_REJECT_HQ'),
    );

    const statusRejectNonHQ = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_REJECT_NON_HQ'),
    );

    const checkApprove: any = await this.keywordModel.findOne({
      _id: new mongoose.Types.ObjectId(_id),
    });
    const isValidObjectId = Types.ObjectId.isValid(_id);
    if (isValidObjectId) {
      if (!checkApprove) {
        throw new BadRequestException([
          { isInvalidDataContent: `Data with ID ${_id} is not found` },
        ]);
      }
    } else {
      throw new BadRequestException([
        { isInvalidDataContent: `ID ${_id} is not valid format` },
      ]);
    }

    const keywordStatus = checkApprove?.keyword_approval?.toString();

    const checkStatusReject = keywordStatus === statusReject?.toString();
    const checkStatusRejectNonHQ =
      keywordStatus === statusRejectNonHQ?.toString();
    const checkstatusApproval = keywordStatus === statusApprove?.toString();
    const checkstatusIsDraft =
      keywordStatus === statusNew?.toString() && checkApprove.is_draft === true;

    console.log('checkStatusReject', checkStatusReject);
    console.log('checkstatusApproval', checkstatusApproval);
    console.log('checkstatusIsDraft', checkstatusIsDraft);

    // Jika Keyword Status tidak di izinkan edit
    if (
      !checkStatusReject &&
      !checkstatusApproval &&
      !checkstatusIsDraft &&
      !checkStatusRejectNonHQ
    ) {
      throw new Error(
        'The keyword has a keyword status that does not support keyword editing',
      );
    }

    const response = new GlobalResponse();
    response.transaction_classify = 'KEYWORD_EDIT';
    let start_period;
    let end_period;
    if (checkApprove.keyword_approval.equals(statusApprove)) {
      const programDetail = await this.programService.findProgramById(
        request?.eligibility?.program_id,
      );
      if (!programDetail) {
        throw new Error('Program not found');
      }

      const checkNameDuplicate = await this.checkAvailKeyword({
        'eligibility.name': `${checkApprove.eligibility.name}-EDIT`,
      });
      if (checkNameDuplicate) {
        if (!this.isKeywordPeriodValid(request.eligibility, programDetail)) {
          console.log('=== KEYWORD DI LUAR RANGE PROGRAM ====');
          throw new Error(
            "The keyword period is not in the program's date range.",
          );
        }

        start_period = new Date(request.eligibility.start_period);
        end_period = new Date(request.eligibility.end_period);
        const eligibility = { ...request.eligibility }; // clone the eligibility object
        const reward_catalog = request.reward_catalog
          ? {
              ...request.reward_catalog,
              keyword: `${checkApprove.eligibility.name}-EDIT`,
            }
          : {};

        const duplicateKeyword = new this.keywordModel({
          ...request,
          reward_catalog: {
            ...reward_catalog,
          },
          eligibility: {
            ...eligibility,
            name: `${checkApprove.eligibility.name}-EDIT`,
            start_period: start_period,
            end_period: end_period,
          },
          keyword_approval: new mongoose.Types.ObjectId(
            await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_ADD'),
          ),
          created_by: account,
        });
        await duplicateKeyword
          .save()
          .then(async (parentOID) => {
            request.bonus.map(async (bonusData, bonusIndex) => {
              switch (bonusData.bonus_type) {
                case 'mbp':
                  const dataMbp = plainToInstance(
                    KeywordMobileBanking,
                    bonusData,
                  );
                  const dataMbpArr = dataMbp.ip_address.split(',');
                  dataMbpArr.map(async (itemMbp) => {
                    const checkIsExistingBank = await this.bankModel
                      .findOne({ bank: dataMbp.bank_code, ip_address: itemMbp })
                      .exec();
                    if (!checkIsExistingBank) {
                      const newNotification = new this.bankModel({
                        bank: dataMbp.bank_code,
                        ip_address: itemMbp,
                        created_by: account,
                      });
                      await newNotification
                        .save()
                        .then((res) => {
                          return res;
                        })
                        .catch((e) => {
                          throw new Error(e);
                        });
                    }
                  });
                  break;
                case 'direct_redeem':
                  const bonusDirectRedeem = plainToInstance(
                    KeywordDirectRedeem,
                    bonusData,
                  );
                  bonusDirectRedeem.stock_location.map(
                    async (location, stockLocationIndex) => {
                      if (parentOID?.eligibility?.flashsale?.status == true) {
                        console.log(
                          '== DIRECT REDEEM RESERVER FLASH SALE TRUE',
                        );
                        const payloadReserve = new StockReserveDTO();
                        payloadReserve.keyword = parentOID?._id?.toString();
                        payloadReserve.destination_location =
                          location?.location_id;
                        payloadReserve.product = bonusDirectRedeem?.merchandise;
                        payloadReserve.qty = location?.stock_flashsale;
                        payloadReserve.qty -=
                          checkApprove.bonus[bonusIndex]?.stock_location[
                            stockLocationIndex
                          ]?.stock_flashsale;
                        const locationHQ =
                          await this.serviceStock.getLocationHQ();
                        payloadReserve.origin_location =
                          locationHQ?._id.toString();
                        payloadReserve.is_flashsale = true;
                        await this.serviceStock.reserve_process_with_keyword_flashsale(
                          payloadReserve,
                          account,
                        );

                        const payloadReserveReguler = new StockReserveDTO();
                        payloadReserveReguler.keyword =
                          parentOID?._id?.toString();
                        payloadReserveReguler.destination_location =
                          location?.location_id;
                        payloadReserveReguler.product =
                          bonusDirectRedeem?.merchandise;
                        payloadReserveReguler.qty = location?.stock;
                        payloadReserveReguler.qty -=
                          checkApprove.bonus[bonusIndex]?.stock_location[
                            stockLocationIndex
                          ]?.stock;
                        const locationHQReguler =
                          await this.serviceStock.getLocationHQ();
                        payloadReserveReguler.origin_location =
                          locationHQReguler?._id.toString();
                        payloadReserveReguler.is_flashsale = false;
                        await this.serviceStock.reserve_process_with_keyword(
                          payloadReserveReguler,
                          account,
                        );
                      } else {
                        console.log(
                          '== DIRECT REDEEM RESERVER FLASH SALE FALSE',
                        );
                        const payloadReserve = new StockReserveDTO();
                        payloadReserve.keyword = parentOID?._id?.toString();
                        payloadReserve.destination_location =
                          location?.location_id;
                        payloadReserve.product = bonusDirectRedeem?.merchandise;
                        payloadReserve.qty = location?.stock;
                        payloadReserve.qty -=
                          checkApprove.bonus[bonusIndex]?.stock_location[
                            stockLocationIndex
                          ]?.stock;
                        const locationHQ =
                          await this.serviceStock.getLocationHQ();
                        payloadReserve.origin_location =
                          locationHQ?._id.toString();
                        payloadReserve.is_flashsale = false;
                        await this.serviceStock.reserve_process_with_keyword(
                          payloadReserve,
                          account,
                        );
                      }
                    },
                  );
                  break;
              }
            });
            if (request.notification.length > 0) {
              request.notification.map(async (notificationData) => {
                const updatedKeywordName =
                  notificationData.keyword_name.replace('-EDIT', '');
                const newNotification = new this.keywordNotificationModel({
                  keyword: parentOID?._id,
                  ...notificationData,
                  keyword_name: `${updatedKeywordName}-EDIT`,
                });

                await newNotification
                  .save()
                  .then(async (returning) => {
                    return returning;
                  })
                  .catch((e) => {
                    throw new Error(e.message);
                  });
              });
            }
            const superior_var = await this.detail(_id);
            const getAccountService = await this.accountService.detail(
              superior_var?.created_by?._id,
            );
            const trace_id = this.transactionOptional.getTracingId(
              request,
              response,
            );
            if (
              getAccountService?.account_location?.location_detail?.name ===
              'HQ'
            ) {
              await this.sendKeywordApprovalNotificationHQ(
                request,
                parentOID,
                account,
                superior_var,
                trace_id,
              );
            } else {
              await this.sendKeywordApprovalNotificationNonHQ(
                request,
                parentOID,
                account,
                superior_var,
                trace_id,
              );
            }
            response.statusCode = HttpStatus.OK;
            response.message = 'Data edit success';
            response.payload = request;

            await this.slRedisService.reloadKeyword({
              _id: new mongoose.Types.ObjectId(_id),
            });
          })
          .catch((e) => {
            throw new Error(e.message);
          });
      } else {
        throw new Error('Duplicate names are not allowed');
      }
    } else {
      let updateData = false;
      if (
        checkApprove.keyword_approval.equals(statusReject) ||
        checkApprove.keyword_approval.equals(statusRejectNonHQ)
      ) {
        updateData = true;
      }

      const newNameKeyword = checkApprove.eligibility.name.replace(
        /-EDIT$/,
        '',
      );
      const containsEdit = checkApprove?.eligibility?.name.includes('-EDIT');
      console.log('=== CHECK NAME -EDIT ===',containsEdit)
      const keywordMain = await this.getkeywordProfile(newNameKeyword, true);
      const programDetail = await this.programService.findProgramById(
        request?.eligibility?.program_id,
      );
      if (!programDetail) {
        throw new Error('Program not found');
      }

      if (!this.isKeywordPeriodValid(request.eligibility, programDetail)) {
        console.log('=== KEYWORD DI LUAR RANGE PROGRAM ====');
        throw new Error(
          "The keyword period is not in the program's date range.",
        );
      }
      start_period = new Date(request.eligibility.start_period);
      end_period = new Date(request.eligibility.end_period);

      //Pengecekan dimana di payload field notifications array of object key keyword_name tidak ada isi -EDIT
      const updatedNotifications: KeywordNotification[] = [];
      if (request?.notification.length > 0) {
        request?.notification.map(async (notificationData) => {
          const updatedKeywordName = notificationData.keyword_name.replace(
            '-EDIT',
            '',
          );
          const newNotification = new this.keywordNotificationModel({
            ...notificationData,
            keyword_name: updatedKeywordName,
          });
          updatedNotifications.push(newNotification);
        });
      }

      const eligibility = { ...request.eligibility }; // clone the eligibility object
      const updateObject = {
        ...request,
        eligibility: {
          ...eligibility, // now start_period or end_period won't get overridden
          name: checkApprove.eligibility.name,
          start_period: start_period,
          end_period: end_period,
        },
        notification: updatedNotifications,
        need_review_after_edit: updateData,
        updated_at: new Date(),
      };

      if (request.reward_catalog) {
        // If request.reward_catalog exists, add it to the update object
        updateObject.reward_catalog = {
          ...request.reward_catalog,
          keyword: `${checkApprove.eligibility.name}`,
        };
      }

      //VALIDASI KEYWORD NEW
      if(!containsEdit){
        for (let bonusIndex = 0; bonusIndex < request.bonus.length; bonusIndex++) {
          const bonusData = request.bonus[bonusIndex];
        
          switch (bonusData.bonus_type) {
            case 'direct_redeem': {
              const bonusDirectRedeem = plainToInstance(KeywordDirectRedeem, bonusData);
        
              for (let stockLocationIndex = 0; stockLocationIndex < bonusDirectRedeem.stock_location.length; stockLocationIndex++) {
                const location = bonusDirectRedeem.stock_location[stockLocationIndex];
        
                try {
                  const checkStatusReserve = await this.serviceStock.getStockReserveByIdProduct(
                    bonusDirectRedeem?.merchandise,
                    'Created',
                    location?.stock,
                  );
        
                  console.log('=== CHECK STATUS RESERVE ===', checkStatusReserve);
        
                  if (checkStatusReserve) {
                    await this.keywordModel.findOneAndUpdate({_id: new mongoose.Types.ObjectId(_id)},{$set: {need_review_after_edit: false}})
                    throw new Error(`Merchandise stock has run out, please add merchandise stock in merchandise management`);
                  }
                } catch (error) { 
                  console.error('Error in direct_redeem processing:', error.message);
                  throw new Error(error);
                }
              }
              break;
            }
          }
        }
      }else{
        //VALIDASI KEYWORD-EDIT DI REJECT
        const bonus_main = keywordMain?.bonus[0]
        const bonus_edit = request?.bonus[0]

        let check_stock_main = bonus_main[
          'stock_location'
        ].reduce(
          (acc, item: any) => acc + item?.stock ?? 0,
          0,
        );

        let check_stock_edit = bonus_edit[
          'stock_location'
        ].reduce(
          (acc, item: any) => acc + item?.stock ?? 0,
          0,
        );

        console.log('=== STOCK MAIN ===',check_stock_main)
        console.log('=== STOCK EDIT ===',check_stock_edit)
        for (let bonusIndex = 0; bonusIndex < request.bonus.length; bonusIndex++) {
          const bonusData = request.bonus[bonusIndex];
        
          switch (bonusData.bonus_type) {
            case 'direct_redeem': {
              const bonusDirectRedeem = plainToInstance(KeywordDirectRedeem, bonusData);
        
              for (let stockLocationIndex = 0; stockLocationIndex < bonusDirectRedeem.stock_location.length; stockLocationIndex++) {
                const location = bonusDirectRedeem.stock_location[stockLocationIndex];
        
                try {
                  const add_stock = check_stock_edit - check_stock_main
                  const checkStatusReserve = await this.serviceStock.getStockReserveByIdProduct(
                    bonusDirectRedeem?.merchandise,
                    'Created',
                    add_stock,
                  );
        
                  console.log('=== CHECK STATUS RESERVE ===', checkStatusReserve);
        
                  if (checkStatusReserve) {
                    await this.keywordModel.findOneAndUpdate({_id: new mongoose.Types.ObjectId(_id)},{$set: {need_review_after_edit: false}})
                    throw new Error(`Merchandise stock has run out, please add merchandise stock in merchandise management`);
                  }
                } catch (error) { 
                  console.error('Error in direct_redeem processing:', error.message);
                  throw new Error(error);
                }
              }
              break;
            }
          }
        }
      }

      await this.keywordModel
        .findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(_id),
          },
          updateObject,
        )
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(async (parentOID) => {
          for (let bonusIndex = 0; bonusIndex < request.bonus.length; bonusIndex++) {
            const bonusData = request.bonus[bonusIndex];
          
            switch (bonusData.bonus_type) {
              case 'mbp': {
                const dataMbp = plainToInstance(KeywordMobileBanking, bonusData);
                const dataMbpArr = dataMbp.ip_address.split(',');
          
                for (let i = 0; i < dataMbpArr.length; i++) {
                  const itemMbp = dataMbpArr[i];
          
                  try {
                    const checkIsExistingBank = await this.bankModel
                      .findOne({ bank: dataMbp.bank_code, ip_address: itemMbp })
                      .exec();
          
                    if (!checkIsExistingBank) {
                      const newNotification = new this.bankModel({
                        bank: dataMbp.bank_code,
                        ip_address: itemMbp,
                        created_by: account,
                      });
          
                      await newNotification.save();
                    }
                  } catch (error) {
                    throw new Error(error.message);
                  }
                }
                break;
              }
          
              case 'direct_redeem': {
                const bonusDirectRedeem = plainToInstance(KeywordDirectRedeem, bonusData);
          
                for (let stockLocationIndex = 0; stockLocationIndex < bonusDirectRedeem.stock_location.length; stockLocationIndex++) {
                  const location = bonusDirectRedeem.stock_location[stockLocationIndex];
          
                  try {          
                      if (parentOID?.eligibility?.flashsale?.status == true) {
                        if (updateData) {
                          console.log(
                            '== DIRECT REDEEM RESERVER FLASH SALE TRUE',
                          );

                          const payloadReserve = new StockReserveDTO();
                          payloadReserve.keyword = parentOID?._id?.toString();
                          payloadReserve.destination_location =
                            location?.location_id;
                          payloadReserve.product = bonusDirectRedeem?.merchandise;
                          payloadReserve.qty = location?.stock;
                          payloadReserve.qty -=
                            checkApprove.bonus[bonusIndex]?.stock_location[
                              stockLocationIndex
                            ]?.stock;
                          payloadReserve.origin_location = null;
                          payloadReserve.is_flashsale = false;
                          try {
                            const locationHQ =
                              await this.serviceStock.getLocationHQ();
                            payloadReserve.origin_location =
                              locationHQ?._id.toString();
                            const a =
                              await this.serviceStock.reserve_process_with_keyword(
                                payloadReserve,
                                account,
                              );
                          } catch (error) {
                            console.log(
                              '<-- Step :: reserve_process_with_keyword -->',
                            );
                            console.log(
                              error?.message ??
                                'Fail -> reserve_process_with_keyword',
                            );
                            console.log(
                              '<-- Step :: reserve_process_with_keyword -->',
                            );
                          }

                          const payloadReserveFlashsale = new StockReserveDTO();
                          payloadReserveFlashsale.keyword =
                            parentOID?._id?.toString();
                          payloadReserveFlashsale.destination_location =
                            location?.location_id;
                          payloadReserveFlashsale.product =
                            bonusDirectRedeem?.merchandise;
                          payloadReserveFlashsale.qty = location?.stock_flashsale;
                          payloadReserveFlashsale.qty -=
                            keywordMain.bonus[bonusIndex]?.stock_location[
                              stockLocationIndex
                            ]?.stock_flashsale;
                          payloadReserveFlashsale.origin_location = null;
                          payloadReserveFlashsale.is_flashsale = true;
                          try {
                            const locationHQ =
                              await this.serviceStock.getLocationHQ();
                            payloadReserveFlashsale.origin_location =
                              locationHQ?._id.toString();
                            const a =
                              await this.serviceStock.reserve_process_with_keyword(
                                payloadReserveFlashsale,
                                account,
                              );
                          } catch (error) {
                            console.log(
                              '<-- Step :: reserve_process_with_keyword -->',
                            );
                            console.log(
                              error?.message ??
                                'Fail -> reserve_process_with_keyword',
                            );
                            console.log(
                              '<-- Step :: reserve_process_with_keyword -->',
                            );
                          }
                        } else {
                          console.log(
                            '== DIRECT REDEEM RESERVER FLASH SALE TRUE',
                          );

                          const payloadReserve = new StockReserveDTO();
                          payloadReserve.keyword = parentOID?._id?.toString();
                          payloadReserve.destination_location =
                            location?.location_id;
                          payloadReserve.product = bonusDirectRedeem?.merchandise;
                          payloadReserve.qty = location?.stock;
                          payloadReserve.origin_location = null;
                          payloadReserve.is_flashsale = false;
                          try {
                            const locationHQ =
                              await this.serviceStock.getLocationHQ();
                            payloadReserve.origin_location =
                              locationHQ?._id.toString();
                            const a =
                              await this.serviceStock.reserve_process_with_keyword(
                                payloadReserve,
                                account,
                              );
                          } catch (error) {
                            console.log(
                              '<-- Step :: reserve_process_with_keyword -->',
                            );
                            console.log(
                              error?.message ??
                                'Fail -> reserve_process_with_keyword',
                            );
                            console.log(
                              '<-- Step :: reserve_process_with_keyword -->',
                            );
                          }

                          const payloadReserveFlashsale = new StockReserveDTO();
                          payloadReserveFlashsale.keyword =
                            parentOID?._id?.toString();
                          payloadReserveFlashsale.destination_location =
                            location?.location_id;
                          payloadReserveFlashsale.product =
                            bonusDirectRedeem?.merchandise;
                          payloadReserveFlashsale.qty = location?.stock_flashsale;
                          payloadReserveFlashsale.origin_location = null;
                          payloadReserveFlashsale.is_flashsale = true;
                          try {
                            const locationHQ =
                              await this.serviceStock.getLocationHQ();
                            payloadReserveFlashsale.origin_location =
                              locationHQ?._id.toString();
                            const a =
                              await this.serviceStock.reserve_process_with_keyword(
                                payloadReserveFlashsale,
                                account,
                              );
                          } catch (error) {
                            console.log(
                              '<-- Step :: reserve_process_with_keyword -->',
                            );
                            console.log(
                              error?.message ??
                                'Fail -> reserve_process_with_keyword',
                            );
                            console.log(
                              '<-- Step :: reserve_process_with_keyword -->',
                            );
                          }
                        }
                      } else if (updateData && containsEdit) {
                        const payloadReserve = new StockReserveDTO();
                        payloadReserve.keyword = parentOID?._id?.toString();
                        payloadReserve.destination_location =
                          location?.location_id;
                        payloadReserve.product = bonusDirectRedeem?.merchandise;
                        payloadReserve.qty = location?.stock;
                        payloadReserve.qty -=
                          checkApprove.bonus[bonusIndex]?.stock_location[
                            stockLocationIndex
                          ]?.stock;
                        payloadReserve.origin_location = null;
                        payloadReserve.is_flashsale = false;
                        try {
                          const locationHQ =
                            await this.serviceStock.getLocationHQ();
                          payloadReserve.origin_location =
                            locationHQ?._id.toString();
                          const a =
                            await this.serviceStock.reserve_process_with_keyword(
                              payloadReserve,
                              account,
                            );
                        } catch (error) {
                          console.log(
                            '<-- Step :: reserve_process_with_keyword -->',
                          );
                          console.log(
                            error?.message ??
                              'Fail -> reserve_process_with_keyword',
                          );
                          console.log(
                            '<-- Step :: reserve_process_with_keyword -->',
                          );
                        }
                      } else {
                        const payloadReserve = new StockReserveDTO();
                        payloadReserve.keyword = parentOID?._id?.toString();
                        payloadReserve.destination_location =
                          location?.location_id;
                        payloadReserve.product = bonusDirectRedeem?.merchandise;
                        payloadReserve.qty = location?.stock;
                        payloadReserve.origin_location = null;
                        try {
                          const locationHQ =
                            await this.serviceStock.getLocationHQ();
                          payloadReserve.origin_location =
                            locationHQ?._id.toString();
                          const a =
                            await this.serviceStock.reserve_process_with_keyword(
                              payloadReserve,
                              account,
                            );
                        } catch (error) {
                          console.log(
                            
                            '<-- Step :: reserve_process_with_keyword -->',
                          );
                          console.log(
                            error?.message ??
                              'Fail -> reserve_process_with_keyword',
                          );
                          console.log(
                            '<-- Step :: reserve_process_with_keyword -->',
                          );
                        }
                      }
                  } catch (error) { 
                    console.error('Error in direct_redeem processing:', error.message);
                    throw new Error(error);
                  }
                }
                break;
              }
            }
          }
          await this.keywordNotificationModel
            .deleteMany({ keyword: parentOID?._id })
            .then((res) => {
              return res;
            });
          if (request.notification.length > 0) {
            request.notification.map(async (notificationData) => {
              const updatedKeywordName = notificationData.keyword_name.replace(
                '-EDIT',
                '',
              );
              const newNotification = new this.keywordNotificationModel({
                keyword: parentOID?._id,
                ...notificationData,
                keyword_name: updatedKeywordName,
              });

              await newNotification
                .save()
                .then(async (returning) => {
                  return returning;
                })
                .catch((e) => {
                  throw new Error(e.message);
                });
            });
          }

          const superior_var = await this.detail(_id);
          const getAccountService = await this.accountService.detail(
            superior_var?.created_by?._id,
          );
          const trace_id = this.transactionOptional.getTracingId(
            parentOID,
            response,
          );
          if (
            getAccountService.account_location.location_detail.name === 'HQ'
          ) {
            await this.sendKeywordApprovalNotificationHQ(
              request,
              parentOID,
              account,
              superior_var,
              trace_id,
            );
          } else {
            await this.sendKeywordApprovalNotificationNonHQ(
              request,
              parentOID,
              account,
              superior_var,
              trace_id,
            );
          }
          response.statusCode = HttpStatus.CREATED;
          response.message = '';
          response.payload = request;

          await this.slRedisService.reloadKeyword({
            _id: new mongoose.Types.ObjectId(_id),
          });

          return response;
        });
    }
    return response;
  }

  async checkAvailKeyword(parameter: any): Promise<boolean> {
    return (
      (await this.keywordModel
        .findOne({
          $and: [parameter, { deleted_at: null }],
        })
        .exec()) === null
    );
  }

  async getKeywordByName(name: any): Promise<Keyword> {
    return await this.keywordModel.findOne({
      'eligibility.name': name,
      deleted_at: null,
    });
    // return await this.keywordModel.findOne({
    //   $and: [name, { deleted_at: null }],
    // });
  }

  async approveKeyword(
    param: string,
    credential: any,
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'KEYWORD_APPROVAL';
    const managerRole = await this.appsService.getConfig(
      'DEFAULT_ROLE_MANAGER',
    );
    const hqLocation = await this.appsService.getConfig('DEFAULT_LOCATION_HQ');
    let isHQ = false;
    for (const a in credential.account_location) {
      if (
        credential.account_location[a].location_detail.type.equals(hqLocation)
      ) {
        isHQ = true;
        break;
      }
    }

    const statusNew = await this.appsService.getConfig(
      'DEFAULT_STATUS_KEYWORD_ADD',
    );
    const statusSet = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_APPROVE_HQ'),
    );
    let updateData = {};
    if (credential.role.equals(managerRole)) {
      if (isHQ) {
        updateData = {
          keyword_approval: statusSet,
          hq_approver: credential?._id,
        };
      } else {
        updateData = {
          keyword_approval: statusSet,
          non_hq_approver: credential?._id,
        };
      }

      const process = await this.keywordModel.findOneAndUpdate(
        { $and: [{ _id: param }, { keyword_approval: statusNew }] },
        updateData,
      );
      if (process) {
        response.statusCode = HttpStatus.OK;
        response.message = 'Keyword approved';
        response.payload = {
          program: param,
          status: statusSet,
        };

        await this.slRedisService.reloadKeyword({
          _id: new mongoose.Types.ObjectId(param),
        });
      } else {
        response.statusCode = HttpStatus.BAD_REQUEST;
        response.message = 'Keyword failed to approve';
      }
    } else {
      response.statusCode = HttpStatus.FORBIDDEN;
      response.message = 'Only manager can approve keyword';
    }
    return response;
  }

  // =============================================

  async approveKeywordV2(
    param: string,
    credential: any,
    reason = '',
    req: any,
  ): Promise<KeywordApprovalDTOResponse> {
    const keywordID = new mongoose.Types.ObjectId(param);
    const response = new KeywordApprovalDTOResponse();
    response.transaction_classify = 'KEYWORD_APPROVAL';
    const managerRole = await this.appsService.getConfig(
      'DEFAULT_ROLE_MANAGER',
    );
    const hqLocation = await this.appsService.getConfig('DEFAULT_LOCATION_HQ');
    let isHQ = false;
    if (
      credential.account_location.location_detail.type.toString() == hqLocation
    ) {
      isHQ = true;
    }

    const statusNew = await this.appsService.getConfig(
      'DEFAULT_STATUS_KEYWORD_ADD',
    );

    const statusRejectNonHQ = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_REJECT_NON_HQ'),
    );

    const statusRejectHQ = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_REJECT_HQ'),
    );

    const configChildKeyword = await this.appsService.getConfig(
      'DEFAULT_CONST_MAX_LIMIT_BONUS_KEYWORD',
    );

    let statusSet;

    let updateData = {};
    let replaceData;
    if (credential.role.toString() == managerRole) {
      //Check jika keyword reject tidak ada kan bisa di approve
      const checkKeywordRejected: any = await this.keywordModel.findOne({
        _id: keywordID,
      });
      if (
        checkKeywordRejected.keyword_approval.toString() ==
          statusRejectHQ.toString() &&
        checkKeywordRejected.need_review_after_edit === false
      ) {
        throw new Error(
          'The keyword you entered is rejected, please edit the keyword first',
        );
      }

      if (
        checkKeywordRejected.keyword_approval.toString() ==
          statusRejectNonHQ.toString() &&
        checkKeywordRejected.need_review_after_edit === false
      ) {
        throw new Error(
          'The keyword you entered is rejected, please edit the keyword first',
        );
      }

      // Pengecekan apakah jumlah elemen melebihi batas
      if (checkKeywordRejected?.child_keyword.length > configChildKeyword) {
        throw new Error(
          `The number of keywords must not exceed ${configChildKeyword}. Current count: ${checkKeywordRejected?.child_keyword.length}`,
        );
      }

      if (isHQ) {
        statusSet = new Types.ObjectId(
          await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_APPROVE_HQ'),
        );
        updateData = {
          keyword_approval: statusSet,
          hq_approver: credential?._id,
          need_review_after_edit: false,
        };
      } else {
        statusSet = new Types.ObjectId(
          await this.appsService.getConfig(
            'DEFAULT_STATUS_KEYWORD_APPROVE_NON_HQ',
          ),
        );
        updateData = {
          keyword_approval: statusSet,
          non_hq_approver: credential?._id,
          need_review_after_edit: false,
        };
      }
      const checkEditKeyword = await this.keywordModel.findOne({
        _id: keywordID,
      });
      const credentialAccount = await this.accountService.detail(
        credential?._id,
      );
      if (
        checkEditKeyword &&
        checkEditKeyword.eligibility.name.endsWith('-EDIT')
      ) {
        const newNameKeyword = checkEditKeyword.eligibility.name.replace(
          /-EDIT$/,
          '',
        );
        const timestampNow = Date.now(); // Mengambil waktu saat ini dalam bentuk timestamp

        await this.keywordModel
          .findOne({
            'eligibility.name': newNameKeyword,
          })
          .exec()
          .then(async (response) => {
            let lastStockEdit = 0;
            //Eligibility,Bonus & Notification Reward Catalogue
            let rewardCatalogEdit;
            if (response.reward_catalog) {
              rewardCatalogEdit = checkEditKeyword.reward_catalog
                ? {
                    ...checkEditKeyword.reward_catalog,
                    program: response.reward_catalog?.program ?? null,
                    keyword: response?.eligibility.name ?? null,
                  }
                : {};
            } else {
              rewardCatalogEdit = checkEditKeyword.reward_catalog
                ? {
                    ...checkEditKeyword.reward_catalog,
                    keyword: response?.eligibility.name ?? null,
                  }
                : {};
            }
            
            //TYPE STOCK BEFORE
            this.type_stock_before = response?.bonus[0]?.stock_type
            replaceData = {
              'eligibility.start_period':
                checkEditKeyword?.eligibility?.start_period,
              'eligibility.end_period':
                checkEditKeyword?.eligibility?.end_period,
              'eligibility.program_title_expose':
                checkEditKeyword?.eligibility?.program_title_expose,
              'eligibility.program_experience':
                checkEditKeyword?.eligibility?.program_experience,
              'eligibility.channel_validation':
                checkEditKeyword?.eligibility?.channel_validation,
              'eligibility.channel_validation_list':
                checkEditKeyword?.eligibility?.channel_validation_list,
              'eligibility.max_mode': checkEditKeyword?.eligibility?.max_mode,
              'eligibility.max_redeem_counter':
                checkEditKeyword?.eligibility?.max_redeem_counter,
              'eligibility.merchandise_keyword':
                checkEditKeyword?.eligibility?.merchandise_keyword,
              'eligibility.program_bersubsidi':
                checkEditKeyword?.eligibility?.program_bersubsidi,
              'eligibility.total_budget':
                checkEditKeyword?.eligibility?.total_budget,
              'eligibility.customer_value':
                checkEditKeyword?.eligibility?.customer_value,
              'eligibility.segmentation_customer_most_redeem':
                checkEditKeyword?.eligibility
                  ?.segmentation_customer_most_redeem,
              'eligibility.poin_redeemed':
                checkEditKeyword?.eligibility?.poin_redeemed,
              'eligibility.enable_sms_masking':
                checkEditKeyword?.eligibility?.enable_sms_masking,
              'eligibility.sms_masking':
                checkEditKeyword?.eligibility?.sms_masking,
              'eligibility.segmentation_customer_tier':
                checkEditKeyword?.eligibility?.segmentation_customer_tier,
              'eligibility.segmentation_customer_los_operator':
                checkEditKeyword?.eligibility
                  ?.segmentation_customer_los_operator,
              'eligibility.segmentation_customer_los':
                checkEditKeyword?.eligibility?.segmentation_customer_los,
              'eligibility.segmentation_customer_los_min':
                checkEditKeyword?.eligibility?.segmentation_customer_los_min,
              'eligibility.segmentation_customer_los_max':
                checkEditKeyword?.eligibility?.segmentation_customer_los_max,
              'eligibility.segmentation_customer_type':
                checkEditKeyword?.eligibility?.segmentation_customer_type,
              'eligibility.segmentation_customer_brand':
                checkEditKeyword?.eligibility?.segmentation_customer_brand,
              'eligibility.segmentation_customer_prepaid_registration':
                checkEditKeyword?.eligibility
                  ?.segmentation_customer_prepaid_registration,
              'eligibility.segmentation_employee_numbers':
                checkEditKeyword?.eligibility?.segmentation_employee_numbers,
              'eligibility.segmentation_telkomsel_employee':
                checkEditKeyword?.eligibility?.segmentation_telkomsel_employee,
              'eligibility.segmentation_customer_poin_balance_operator':
                checkEditKeyword?.eligibility
                  ?.segmentation_customer_poin_balance_operator,
              'eligibility.segmentation_customer_arpu_operator':
                checkEditKeyword?.eligibility
                  ?.segmentation_customer_arpu_operator,
              'eligibility.segmentation_customer_arpu':
                checkEditKeyword?.eligibility?.segmentation_customer_arpu,
              'eligibility.segmentation_customer_arpu_min':
                checkEditKeyword?.eligibility?.segmentation_customer_arpu_min,
              'eligibility.segmentation_customer_arpu_max':
                checkEditKeyword?.eligibility?.segmentation_customer_arpu_max,
              'eligibility.segmentation_customer_preference':
                checkEditKeyword?.eligibility?.segmentation_customer_preference,
              'eligibility.segmentation_customer_preferences_bcp':
                checkEditKeyword?.eligibility
                  ?.segmentation_customer_preferences_bcp,
              'eligibility.bcp_app_name':
                checkEditKeyword?.eligibility?.bcp_app_name,
              'eligibility.bcp_app_name_operator':
                checkEditKeyword?.eligibility?.bcp_app_name_operator,
              'eligibility.bcp_app_category':
                checkEditKeyword?.eligibility?.bcp_app_category,
              'eligibility.bcp_app_category_operator':
                checkEditKeyword?.eligibility?.bcp_app_category_operator,
              'eligibility.imei_operator':
                checkEditKeyword?.eligibility?.imei_operator,
              'eligibility.imei': checkEditKeyword?.eligibility?.imei,
              'eligibility.segmentation_customer_kyc_completeness':
                checkEditKeyword?.eligibility
                  ?.segmentation_customer_kyc_completeness,
              'eligibility.segmentation_customer_poin_balance':
                checkEditKeyword?.eligibility
                  ?.segmentation_customer_poin_balance,
              'eligibility.segmentation_customer_poin_balance_min':
                checkEditKeyword?.eligibility
                  ?.segmentation_customer_poin_balance_min,
              'eligibility.segmentation_customer_poin_balance_max':
                checkEditKeyword?.eligibility
                  ?.segmentation_customer_poin_balance_max,
              'eligibility.max_redeem_threshold':
                checkEditKeyword?.eligibility?.max_redeem_threshold,
              'eligibility.flashsale': checkEditKeyword?.eligibility?.flashsale,
              'eligibility.for_new_redeemer':
                checkEditKeyword?.eligibility?.for_new_redeemer,
              bonus: checkEditKeyword?.bonus,
              notification: checkEditKeyword?.notification,
              created_by: checkEditKeyword?.created_by,
              is_main_keyword: checkEditKeyword?.is_main_keyword,
              child_keyword: checkEditKeyword?.child_keyword,
            };

            if (checkEditKeyword.reward_catalog) {
              replaceData.reward_catalog = {
                ...rewardCatalogEdit,
              };
            }

            const bonus_edit: any = [];
            if (!isHQ || isHQ) {
              for (
                let mainIndex = 0;
                mainIndex < response?.bonus.length;
                mainIndex++
              ) {
                bonus_edit[mainIndex] = { stock_location: [] };

                const bonusMain = response?.bonus[mainIndex];
                const product_idMain = getProductID(
                  bonusMain?.bonus_type,
                  this.configService,
                );
                if (bonusMain?.bonus_type === 'direct_redeem') {

                  for (
                    let bonusIndex = 0;
                    bonusIndex < bonusMain.stock_location.length;
                    bonusIndex++
                  ) {
                    const locationMain = bonusMain.stock_location[bonusIndex];
                    
                    console.log('== RESET REDIS STOCK BONUS MERCHANDISE ===');
                    //DELETE STOCK WITH REDIS
                    await this.deleteRedisStock(
                      response?._id.toString(),
                      locationMain?.location_id.toString(),
                    );
                  }

                  for (
                    let editIndex = 0;
                    editIndex < checkEditKeyword?.bonus.length;
                    editIndex++
                  ) {
                    const bonusEdit = checkEditKeyword?.bonus[editIndex];
                    this.start_date_stock = bonusEdit?.start_date;
                    this.end_date_stock = bonusEdit?.end_date;
                    if (
                      checkEditKeyword?.eligibility?.flashsale?.status ==
                        true &&
                      bonusEdit?.stock_type == 'no_threshold'
                    ) {
                      const check_stock_main = bonusMain[
                        'stock_location'
                      ].reduce(
                        (acc, item: any) => acc + item?.stock_flashsale ?? 0,
                        0,
                      );
                      const check_stock_edit = bonusEdit[
                        'stock_location'
                      ].reduce(
                        (acc, item: any) => acc + item?.stock_flashsale ?? 0,
                        0,
                      );

                      const check_stock_main_reguler = bonusMain[
                        'stock_location'
                      ].reduce((acc, item: any) => acc + item?.stock ?? 0, 0);
                      const check_stock_edit_reguler = bonusEdit[
                        'stock_location'
                      ].reduce((acc, item: any) => acc + item?.stock ?? 0, 0);

                      this.bonus_type = bonusEdit?.bonus_type;
                      this.product_id = bonusMain['merchandise'];
                      this.type_stock = bonusEdit?.stock_type;
                      this.bonus = bonusEdit;
                      this.stock_location_reset = bonusEdit?.stock_location;
                      if (
                        check_stock_edit !== check_stock_main ||
                        check_stock_edit_reguler !== check_stock_main_reguler
                      ) {
                        console.log(
                          '=== IF TIDAK SAMA DENGAN STOCK MAIN DAN EDIT STOCK FS',
                        );
                        const stockLocation =
                          bonusMain.stock_location[mainIndex];
                        const origin_stock =
                          await this.serviceStock.getStockForReserveWithoutKeyword(
                            {
                              product: bonusMain['merchandise'],
                              location: stockLocation?.location_id,
                            },
                          );
                        const balanceAddEdit =
                          check_stock_edit - check_stock_main;
                        console.log(
                          '== BALANCE FLASHSALE DI TAMBAH ==',
                          balanceAddEdit,
                        );
                        this.stock_added = balanceAddEdit
                        const newBalance =
                          origin_stock?.balance - balanceAddEdit;
                        if (!checkEditKeyword?.eligibility?.flashsale?.status) {
                          if (newBalance < 0) {
                            console.log(
                              `Your stock now is ${
                                origin_stock?.balance
                              }, you need ${Math.abs(
                                newBalance,
                              )} stock merchandise to approval`,
                            );
                            throw new Error(
                              `Your stock now is ${
                                origin_stock?.balance
                              }, you need ${Math.abs(
                                newBalance,
                              )} stock merchandise to approval`,
                            );
                          }
                        }
                        try {
                          // Stock reserve Approval Merchandise
                          await this.serviceStock.approve_reserve_keyword_flashsale(
                            response?._id,
                            keywordID.toString(),
                            credentialAccount,
                            bonusEdit?.stock_type,
                            this.stock_all,
                            true,
                            false,
                          );
                        } catch (e) {
                          throw new BadRequestException(e);
                        }
                        // this.stock_status = true;
                      }
                    } else if (
                      checkEditKeyword?.eligibility?.flashsale?.status ==
                        true &&
                      bonusEdit?.stock_type !== 'no_threshold'
                    ) {
                      const check_stock_main = bonusMain[
                        'stock_location'
                      ].reduce(
                        (acc, item: any) => acc + item?.stock_flashsale ?? 0,
                        0,
                      );
                      const check_stock_edit = bonusEdit[
                        'stock_location'
                      ].reduce(
                        (acc, item: any) => acc + item?.stock_flashsale ?? 0,
                        0,
                      );

                      const check_stock_main_reguler = bonusMain[
                        'stock_location'
                      ].reduce((acc, item: any) => acc + item?.stock ?? 0, 0);
                      const check_stock_edit_reguler = bonusEdit[
                        'stock_location'
                      ].reduce((acc, item: any) => acc + item?.stock ?? 0, 0);

                      this.bonus_type = bonusEdit?.bonus_type;
                      this.product_id = bonusMain['merchandise'];
                      this.type_stock = bonusEdit?.stock_type;
                      this.bonus = bonusEdit;
                      this.stock_location_reset = bonusEdit?.stock_location;
                      if (
                        check_stock_edit !== check_stock_main ||
                        check_stock_edit_reguler !== check_stock_main_reguler
                      ) {
                        console.log(
                          '=== IF TIDAK SAMA DENGAN STOCK MAIN DAN EDIT STOCK',
                        );
                        const stockLocation =
                          bonusMain.stock_location[mainIndex];
                        const origin_stock =
                          await this.serviceStock.getStockForReserveWithoutKeyword(
                            {
                              product: bonusMain['merchandise'],
                              location: stockLocation?.location_id,
                            },
                          );
                        const balanceAddEdit =
                          check_stock_edit - check_stock_main;
                        this.stock_added = balanceAddEdit
                        console.log(
                          '== BALANCE FLASHSALE DI TAMBAH ==',
                          balanceAddEdit,
                        );
                        const newBalance =
                          origin_stock?.balance - balanceAddEdit;
                        if (!checkEditKeyword?.eligibility?.flashsale?.status) {
                          if (newBalance < 0) {
                            console.log(
                              `Your stock now is ${
                                origin_stock?.balance
                              }, you need ${Math.abs(
                                newBalance,
                              )} stock merchandise to approval`,
                            );
                            throw new Error(
                              `Your stock now is ${
                                origin_stock?.balance
                              }, you need ${Math.abs(
                                newBalance,
                              )} stock merchandise to approval`,
                            );
                          }
                        }
                        try {
                          // Stock reserve Approval Merchandise
                          await this.serviceStock.approve_reserve_keyword_flashsale(
                            response?._id,
                            keywordID.toString(),
                            credentialAccount,
                            bonusEdit?.stock_type,
                            this.stock_all,
                            checkEditKeyword?.eligibility?.flashsale?.status,
                            false,
                          );
                        } catch (e) {
                          throw new BadRequestException(e);
                        }
                        // this.stock_status = true;
                      }
                    } else if (
                      response?.eligibility?.flashsale?.status == true &&
                      checkEditKeyword?.eligibility?.flashsale?.status == false
                    ) {
                      console.log(
                        '== IF JIKA STOCK SUDAH ADA DI REDEEM KEMBALIKAN ===',
                      );
                      const check_stock_main = bonusMain[
                        'stock_location'
                      ].reduce((acc, item: any) => acc + item?.stock ?? 0, 0);
                      const check_stock_edit = bonusEdit[
                        'stock_location'
                      ].reduce((acc, item: any) => acc + item?.stock ?? 0, 0);

                      this.bonus_type = bonusEdit?.bonus_type;
                      this.product_id = bonusMain['merchandise'];
                      this.type_stock = bonusEdit?.stock_type;
                      this.bonus = bonusEdit;
                      this.stock_location_reset = bonusEdit?.stock_location;

                      if (check_stock_edit !== check_stock_main) {
                        const stockLocation =
                          bonusMain.stock_location[mainIndex];
                        const origin_stock =
                          await this.serviceStock.getStockForReserveWithoutKeyword(
                            {
                              product: bonusMain['merchandise'],
                              location: stockLocation?.location_id,
                            },
                          );

                        console.log(
                          '=== IF TIDAK SAMA DENGAN STOCK MAIN DAN EDIT STOCK',
                        );
                        console.log(
                          `== MERCHANDISE ${stockLocation} ${mainIndex} ==`,
                        );
                        const balanceAddEdit =
                          check_stock_edit - check_stock_main;
                        this.stock_added = balanceAddEdit
                        const newBalance =
                          origin_stock?.balance - balanceAddEdit;
                        if (newBalance < 0) {
                          console.log(
                            `Your stock now is ${
                              origin_stock?.balance
                            }, you need ${Math.abs(
                              newBalance,
                            )} stock merchandise to approval`,
                          );
                          throw new Error(
                            `Your stock now is ${
                              origin_stock?.balance
                            }, you need ${Math.abs(
                              newBalance,
                            )} stock merchandise to approval`,
                          );
                        }
                        this.stock_all = balanceAddEdit;
                        try {
                          await this.serviceStock.approve_reserve_keyword_flashsale(
                            response?._id,
                            keywordID.toString(),
                            credentialAccount,
                            bonusEdit?.stock_type,
                            this.stock_all,
                            checkEditKeyword?.eligibility?.flashsale?.status,
                            true,
                          );
                        } catch (e) {
                          throw new BadRequestException(e);
                        }
                        console.log('== BALANCE DI TAMBAH ==', balanceAddEdit);
                        this.stock_status = true;
                      } else {
                        console.log('=== REFUND MERCHANDISE ===');
                        // Stock reserve Approval Merchandise
                        try {
                          await this.serviceStock.approve_reserve_keyword_flashsale(
                            response?._id,
                            keywordID.toString(),
                            credentialAccount,
                            bonusEdit?.stock_type,
                            this.stock_all,
                            checkEditKeyword?.eligibility?.flashsale?.status,
                            true,
                          );
                        } catch (e) {
                          throw new BadRequestException(e);
                        }
                        this.stock_status = false;
                        this.stock_all = 0;
                      }
                    } else {
                      const check_stock_main = bonusMain[
                        'stock_location'
                      ].reduce((acc, item: any) => acc + item?.stock ?? 0, 0);
                      const check_stock_edit = bonusEdit[
                        'stock_location'
                      ].reduce((acc, item: any) => acc + item?.stock ?? 0, 0);

                      this.bonus_type = bonusEdit?.bonus_type;
                      this.product_id = bonusMain['merchandise'];
                      this.type_stock = bonusEdit?.stock_type;
                      this.bonus = bonusEdit;
                      this.stock_location_reset = bonusEdit?.stock_location;

                      const stockLocation = bonusMain.stock_location[mainIndex];
                      const origin_stock =
                        await this.serviceStock.getStockForReserveWithoutKeyword(
                          {
                            product: bonusMain['merchandise'],
                            location: stockLocation?.location_id,
                          },
                        );

                      console.log(
                        '=== IF TIDAK SAMA DENGAN STOCK MAIN DAN EDIT STOCK',
                      );
                      console.log(
                        `== MERCHANDISE ${stockLocation} ${mainIndex} ==`,
                      );
                      const balanceAddEdit =
                        check_stock_edit - check_stock_main;
                      this.stock_added = balanceAddEdit
                      const newBalance = origin_stock?.balance - balanceAddEdit;
                      if (newBalance < 0) {
                        console.log(
                          `Your stock now is ${
                            origin_stock?.balance
                          }, you need ${Math.abs(
                            newBalance,
                          )} stock merchandise to approval`,
                        );
                        throw new Error(
                          `Your stock now is ${
                            origin_stock?.balance
                          }, you need ${Math.abs(
                            newBalance,
                          )} stock merchandise to approval`,
                        );
                      }
                      if (check_stock_edit !== check_stock_main) {
                        this.stock_all = balanceAddEdit;

                        console.log('== BALANCE DI TAMBAH ==', balanceAddEdit);
                        try {
                          // Stock reserve Approval Merchandise
                          await this.serviceStock.approve_reserve_keyword(
                            response?._id,
                            keywordID.toString(),
                            credentialAccount,
                            bonusEdit?.stock_type,
                            this.stock_all,
                          );
                        }catch (e) {
                          throw new BadRequestException(e);
                        }
                        this.stock_status = true;
                      } else {
                        this.stock_status = false;
                        this.stock_all = 0;
                      }
                    }
                  }
                } else {
                  for (
                    let bonusIndex = 0;
                    bonusIndex < bonusMain.stock_location.length;
                    bonusIndex++
                  ) {
                    const locationMain = bonusMain.stock_location[bonusIndex];

                    //DELETE STOCK WITH REDIS
                    await this.deleteRedisStock(
                      response?._id.toString(),
                      locationMain?.location_id.toString(),
                    );

                    const checkStockMain =
                      await this.serviceStock.getStockDetail({
                        location: locationMain?.location_id,
                        product: product_idMain,
                        keyword: response?._id,
                      });
                    const stockLocation =
                      bonusMain.stock_location[bonusIndex].stock;
                    const calculationStock =
                      stockLocation - checkStockMain?.balance;
                    if (calculationStock > 0) {
                      console.log('== IF JIKA STOCK SUDAH ADA DI REDEEM ===');
                      bonus_edit[mainIndex].stock_location.push({
                        adhoc_group:
                          bonusMain.stock_location[bonusIndex].adhoc_group,
                        location_id:
                          bonusMain.stock_location[bonusIndex].location_id,
                        name: bonusMain.stock_location[bonusIndex]?.name,
                        stock: calculationStock,
                      });
                      // Aksi jika calculationStock lebih besar dari 0
                      for (
                        let editIndex = 0;
                        editIndex < checkEditKeyword?.bonus.length;
                        editIndex++
                      ) {
                        const bonusEdit = checkEditKeyword?.bonus[editIndex];
                        this.start_date_stock = bonusEdit?.start_date;
                        this.end_date_stock = bonusEdit?.end_date;
                        if (
                          checkEditKeyword?.eligibility?.flashsale?.status ==
                            true &&
                          bonusEdit?.stock_type == 'no_threshold'
                        ) {
                          const count_stock_main = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          const count_stock_edit = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          this.stock_added =
                            count_stock_edit - count_stock_main;
                          const count_stock_main_flashsale = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) =>
                              acc + item.stock_flashsale
                                ? item.stock_flashsale
                                : 0,
                            0,
                          );
                          const count_stock_edit_flashsale = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) =>
                              acc + item?.stock_flashsale ?? 0,
                            0,
                          );
                          console.log(
                            '= STOCK FLASHSALE =',
                            count_stock_main_flashsale,
                            count_stock_edit_flashsale,
                          );
                          this.stock_added_flashsale =
                            count_stock_edit_flashsale -
                            count_stock_main_flashsale;
                          this.bonus_type = bonusEdit?.bonus_type;
                          this.type_stock = bonusEdit?.stock_type;
                          this.stock_location_reset = bonusEdit?.stock_location;
                          const product_idEdit = getProductID(
                            bonusEdit?.bonus_type,
                            this.configService,
                          );
                          this.product_id = product_idEdit;
                          console.log({ bonusEdit, product_idEdit });
                          this.bonus = bonusEdit;
                          const credential_detail_edit =
                            await this.accountService.detail(credential?._id);
                          for (
                            let bonusEditIndex = 0;
                            bonusEditIndex < bonusEdit.stock_location.length;
                            bonusEditIndex++
                          ) {
                            const locationEdit =
                              bonusEdit.stock_location[bonusEditIndex];
                            if (locationMain?.stock !== locationEdit?.stock) {
                              this.stock_status = true;
                            } else {
                              this.stock_status = false;
                            }
                            if (
                              locationMain.location_id ===
                              locationEdit.location_id
                            ) {
                              const calculationStockEdit =
                                locationEdit.stock_flashsale -
                                locationMain.stock_flashsale;
                              console.log(
                                '=== STOCK FS ===',
                                calculationStockEdit,
                              );
                              console.log(
                                '=== STOCK EDIT ===',
                                locationEdit.stock_flashsale,
                              );
                              console.log(
                                '=== STOCK MAIN ===',
                                locationMain.stock_flashsale,
                              );

                              const calculationStockEditReguler =
                                locationEdit.stock - locationMain.stock;
                              lastStockEdit = calculationStock;
                              console.log(
                                `Stock untuk keyword ${response._id} di lokasi ${locationMain.location_id} sama dengan lokasi ${locationEdit.location_id} stock ${locationEdit.stock} kurang ${calculationStock} hasil ${calculationStockEdit}`,
                              );
                              if (
                                calculationStockEdit > 0 &&
                                locationEdit?.stock_flashsale == 0
                              ) {
                                console.log(
                                  '== IF UPDATE BALANCE FLASH SALE PERNAH REDEEM ==',
                                );
                                try {
                                  await this.serviceStock.updateStockFlashSale(
                                    {
                                      location: locationEdit?.location_id,
                                      product: product_idEdit,
                                      qty: calculationStockEditReguler,
                                      qty_flashsale: calculationStockEdit ?? 0,
                                      keyword: response?._id?.toString(),
                                    },
                                    credential_detail_edit,
                                    false,
                                    bonusMain?.stock_type,
                                  );
                                } catch (e) {
                                  throw new BadRequestException(e);
                                }
                              } else {
                                try {
                                  await this.serviceStock.updateStockFlashSale(
                                    {
                                      location: locationEdit?.location_id,
                                      product: product_idEdit,
                                      qty: calculationStockEditReguler,
                                      qty_flashsale: calculationStockEdit ?? 0,
                                      keyword: response?._id?.toString(),
                                    },
                                    credential_detail_edit,
                                    false,
                                    bonusMain?.stock_type,
                                  );
                                } catch (e) {
                                  throw new BadRequestException(e);
                                }
                              }
                            }
                          }
                        } else if (
                          checkEditKeyword?.eligibility?.flashsale?.status ==
                            true &&
                          bonusEdit?.stock_type !== 'no_threshold'
                        ) {
                          console.log(
                            '== ELSE IF JIKA STOCK SUDAH ADA DI REDEEM FLASHSALE TRUE AND THERSHOLD ===',
                          );
                          const count_stock_main = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          const count_stock_edit = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          this.stock_added =
                            count_stock_edit - count_stock_main;
                          const count_stock_main_flashsale = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) =>
                              acc + item.stock_flashsale
                                ? item.stock_flashsale
                                : 0,
                            0,
                          );
                          const count_stock_edit_flashsale = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) =>
                              acc + item?.stock_flashsale ?? 0,
                            0,
                          );
                          console.log(
                            '= STOCK FLASHSALE =',
                            count_stock_main_flashsale,
                            count_stock_edit_flashsale,
                          );
                          this.stock_added_flashsale =
                            count_stock_edit_flashsale -
                            count_stock_main_flashsale;
                          this.bonus_type = bonusEdit?.bonus_type;
                          this.type_stock = bonusEdit?.stock_type;
                          this.stock_location_reset = bonusEdit?.stock_location;
                          const product_idEdit = getProductID(
                            bonusEdit?.bonus_type,
                            this.configService,
                          );
                          this.product_id = product_idEdit;
                          console.log({ bonusEdit, product_idEdit });
                          this.bonus = bonusEdit;
                          const credential_detail_edit =
                            await this.accountService.detail(credential?._id);
                          for (
                            let bonusEditIndex = 0;
                            bonusEditIndex < bonusEdit.stock_location.length;
                            bonusEditIndex++
                          ) {
                            const locationEdit =
                              bonusEdit.stock_location[bonusEditIndex];
                            if (locationMain?.stock !== locationEdit?.stock) {
                              this.stock_status = true;
                            } else {
                              this.stock_status = false;
                            }
                            if (
                              locationMain.location_id ===
                              locationEdit.location_id
                            ) {
                              const calculationStockEdit =
                                locationEdit.stock_flashsale -
                                locationMain.stock_flashsale;
                              const calculationStockEditReguler =
                                locationEdit.stock - locationMain.stock;
                              lastStockEdit = calculationStock;
                              console.log(
                                `Stock untuk keyword ${response._id} di lokasi ${locationMain.location_id} sama dengan lokasi ${locationEdit.location_id} stock ${locationEdit.stock} kurang ${calculationStock} hasil ${calculationStockEdit}`,
                              );
                              if (
                                calculationStockEdit > 0 &&
                                locationEdit?.stock_flashsale == 0
                              ) {
                                console.log(
                                  '== IF UPDATE BALANCE FLASH SALE PERNAH REDEEM ==',
                                );
                                try {
                                  await this.serviceStock.updateStockFlashSale(
                                    {
                                      location: locationEdit?.location_id,
                                      product: product_idEdit,
                                      qty: calculationStockEditReguler,
                                      qty_flashsale: calculationStockEdit ?? 0,
                                      keyword: response?._id?.toString(),
                                    },
                                    credential_detail_edit,
                                    false,
                                    bonusMain?.stock_type,
                                  );
                                } catch (e) {
                                  throw new BadRequestException(e);
                                }

                                try {
                                  await this.serviceStock.updateStockThersholdFlashSale(
                                    {
                                      location: locationEdit?.location_id,
                                      product_id: product_idEdit,
                                      qty: calculationStockEditReguler,
                                      qty_flashsale: calculationStockEdit ?? 0,
                                      keyword_id: response?._id?.toString(),
                                    },
                                    credential_detail_edit,
                                  );
                                } catch (e) {
                                  throw new BadRequestException(e);
                                }
                              } else {
                                try {
                                  await this.serviceStock.updateStockFlashSale(
                                    {
                                      location: locationEdit?.location_id,
                                      product: product_idEdit,
                                      qty: calculationStockEditReguler,
                                      qty_flashsale: calculationStockEdit ?? 0,
                                      keyword: response?._id?.toString(),
                                    },
                                    credential_detail_edit,
                                    true,
                                    bonusMain?.stock_type,
                                  );
                                } catch (e) {
                                  throw new BadRequestException(e);
                                }

                                try {
                                  await this.serviceStock.updateStockThersholdFlashSale(
                                    {
                                      location: locationEdit?.location_id,
                                      product_id: product_idEdit,
                                      qty: calculationStockEditReguler,
                                      qty_flashsale: calculationStockEdit ?? 0,
                                      keyword_id: response?._id?.toString(),
                                    },
                                    credential_detail_edit,
                                  );
                                } catch (e) {
                                  throw new BadRequestException(e);
                                }
                              }
                            }
                          }
                        } else if (
                          response?.eligibility?.flashsale?.status == true &&
                          checkEditKeyword?.eligibility?.flashsale?.status ==
                            false
                        ) {
                          console.log(
                            '== IF JIKA STOCK SUDAH ADA DI REDEEM KEMBALIKAN ===',
                          );
                          bonus_edit[mainIndex].stock_location.push({
                            adhoc_group:
                              bonusMain.stock_location[bonusIndex].adhoc_group,
                            location_id:
                              bonusMain.stock_location[bonusIndex].location_id,
                            name: bonusMain.stock_location[bonusIndex]?.name,
                            stock: calculationStock,
                          });
                          // Aksi jika calculationStock lebih besar dari 0
                          for (
                            let editIndex = 0;
                            editIndex < checkEditKeyword?.bonus.length;
                            editIndex++
                          ) {
                            const bonusEdit =
                              checkEditKeyword?.bonus[editIndex];
                            this.start_date_stock = bonusEdit?.start_date;
                            this.end_date_stock = bonusEdit?.end_date;
                            const count_stock_main = bonusMain[
                              'stock_location'
                            ].reduce(
                              (acc, item: any) => acc + item?.stock ?? 0,
                              0,
                            );
                            const count_stock_edit = bonusEdit[
                              'stock_location'
                            ].reduce(
                              (acc, item: any) => acc + item?.stock ?? 0,
                              0,
                            );
                            this.stock_added =
                              count_stock_edit - count_stock_main;
                            this.bonus_type = bonusEdit?.bonus_type;
                            this.type_stock = bonusEdit?.stock_type;
                            this.stock_location_reset =
                              bonusEdit?.stock_location;
                            const product_idEdit = getProductID(
                              bonusEdit?.bonus_type,
                              this.configService,
                            );
                            this.product_id = product_idEdit;
                            console.log({ bonusEdit, product_idEdit });
                            this.bonus = bonusEdit;
                            const credential_detail_edit =
                              await this.accountService.detail(credential?._id);
                            for (
                              let bonusEditIndex = 0;
                              bonusEditIndex < bonusEdit.stock_location.length;
                              bonusEditIndex++
                            ) {
                              const locationEdit =
                                bonusEdit.stock_location[bonusEditIndex];
                              if (locationMain?.stock !== locationEdit?.stock) {
                                this.stock_status = true;
                              } else {
                                this.stock_status = false;
                              }
                              if (
                                locationMain.location_id ===
                                locationEdit.location_id
                              ) {
                                const calculationStockEdit =
                                  locationEdit.stock - locationMain.stock;
                                const calculationStockEditFlahsale =
                                  locationEdit.stock_flashsale ==
                                  locationMain.stock_flashsale
                                    ? 0
                                    : locationEdit.stock_flashsale -
                                      locationMain.stock_flashsale;
                                lastStockEdit = calculationStock;
                                console.log(
                                  `Stock untuk keyword ${response._id} di lokasi ${locationMain.location_id} sama dengan lokasi ${locationEdit.location_id} stock ${locationEdit.stock} kurang ${calculationStock} hasil ${calculationStockEdit}`,
                                );
                                if (calculationStockEdit > 0) {
                                  console.log('== KONDISI IF ==')
                                  if (this.type_stock == 'no_threshold') {
                                    try {
                                      await this.serviceStock.updateV2(
                                        {
                                          location: locationEdit?.location_id,
                                          product: product_idEdit,
                                          qty: calculationStockEdit,
                                          qty_flashsale:
                                            calculationStockEditFlahsale ?? 0,
                                          keyword: response?._id?.toString(),
                                          is_flashsale:
                                            checkEditKeyword?.eligibility
                                              ?.flashsale?.status,
                                        },
                                        credential_detail_edit,
                                        false,
                                        false,
                                      );
                                    } catch (e) {
                                      throw new BadRequestException(e);
                                    }
                                  }
                                  let stock_threshold = 0;
                                  console.log(
                                    '=== MASUK DISINI CONDETION STOCK ===',
                                    this.stock_all,
                                  );
                                  if (this.type_stock !== 'no_threshold') {
                                    stock_threshold =
                                      locationEdit?.stock - locationMain?.stock;
                                    this.stock_all = stock_threshold;
                                  } else {
                                    this.stock_all = calculationStockEdit;
                                  }
                                } else if (
                                  response?.eligibility?.flashsale?.status ==
                                    true &&
                                  checkEditKeyword?.eligibility?.flashsale
                                    ?.status == false
                                ) {
                                  console.log('== KONDISI ELSE IF ==')
                                  if (this.type_stock == 'no_threshold') {
                                    try {
                                      await this.serviceStock.updateV2(
                                        {
                                          location: locationEdit?.location_id,
                                          product: product_idEdit,
                                          qty: calculationStockEdit,
                                          qty_flashsale:
                                            calculationStockEditFlahsale ?? 0,
                                          keyword: response?._id?.toString(),
                                          is_flashsale:
                                            checkEditKeyword?.eligibility
                                              ?.flashsale?.status,
                                        },
                                        credential_detail_edit,
                                        false,
                                        true,
                                      );
                                    } catch (e) {
                                      throw new BadRequestException(e);
                                    }
                                  } else {
                                    try {
                                      await this.serviceStock.updateV2(
                                        {
                                          location: locationEdit?.location_id,
                                          product: product_idEdit,
                                          qty: calculationStockEdit,
                                          qty_flashsale:
                                            calculationStockEditFlahsale ?? 0,
                                          keyword: response?._id?.toString(),
                                          is_flashsale:
                                            checkEditKeyword?.eligibility
                                              ?.flashsale?.status,
                                        },
                                        credential_detail_edit,
                                        false,
                                        true,
                                      );
                                    } catch (e) {
                                      throw new BadRequestException(e);
                                    }
                                  }
                                  // let stock_threshold = 0;
                                  // console.log(
                                  //   '=== MASUK DISINI CONDETION STOCK ===',
                                  //   this.stock_all,
                                  // );
                                  // if (this.type_stock !== 'no_threshold') {
                                  //   stock_threshold =
                                  //     locationEdit?.stock - locationMain?.stock;
                                  //   this.stock_all = stock_threshold;
                                  // } else {
                                  //   this.stock_all = calculationStockEdit;
                                  // }
                                } else {
                                  console.log('== KONDISI ELSE ==')
                                  this.stock_all = calculationStockEdit;
                                }
                              }
                            }
                          }
                        } else {
                          console.log(
                            '== IF JIKA STOCK SUDAH ADA DI REDEEM ===',
                          );
                          bonus_edit[mainIndex].stock_location.push({
                            adhoc_group:
                              bonusMain.stock_location[bonusIndex].adhoc_group,
                            location_id:
                              bonusMain.stock_location[bonusIndex].location_id,
                            name: bonusMain.stock_location[bonusIndex]?.name,
                            stock: calculationStock,
                          });
                          // Aksi jika calculationStock lebih besar dari 0
                          for (
                            let editIndex = 0;
                            editIndex < checkEditKeyword?.bonus.length;
                            editIndex++
                          ) {
                            const bonusEdit =
                              checkEditKeyword?.bonus[editIndex];
                            this.start_date_stock = bonusEdit?.start_date;
                            this.end_date_stock = bonusEdit?.end_date;
                            const count_stock_main = bonusMain[
                              'stock_location'
                            ].reduce(
                              (acc, item: any) => acc + item?.stock ?? 0,
                              0,
                            );
                            const count_stock_edit = bonusEdit[
                              'stock_location'
                            ].reduce(
                              (acc, item: any) => acc + item?.stock ?? 0,
                              0,
                            );
                            this.stock_added =
                              count_stock_edit - count_stock_main;
                            this.bonus_type = bonusEdit?.bonus_type;
                            this.type_stock = bonusEdit?.stock_type;
                            this.stock_location_reset =
                              bonusEdit?.stock_location;
                            const product_idEdit = getProductID(
                              bonusEdit?.bonus_type,
                              this.configService,
                            );
                            this.product_id = product_idEdit;
                            console.log({ bonusEdit, product_idEdit });
                            this.bonus = bonusEdit;
                            const credential_detail_edit =
                              await this.accountService.detail(credential?._id);
                            for (
                              let bonusEditIndex = 0;
                              bonusEditIndex < bonusEdit.stock_location.length;
                              bonusEditIndex++
                            ) {
                              const locationEdit =
                                bonusEdit.stock_location[bonusEditIndex];
                              if (locationMain?.stock !== locationEdit?.stock) {
                                this.stock_status = true;
                              } else {
                                this.stock_status = false;
                              }
                              if (
                                locationMain.location_id ===
                                locationEdit.location_id
                              ) {
                                //TITIK DISINI
                                const calculationStockEdit =
                                  response?.bonus[0]?.stock_type !==
                                  'no_thershold'
                                    ? locationEdit.stock - locationMain.stock
                                    : locationEdit.stock - calculationStock;
                                const calculationStockEditFlahsale =
                                  locationEdit.stock_flashsale
                                    ? locationEdit?.stock_flashsale -
                                      locationMain?.stock_flashsale
                                    : 0;
                                console.log('TITIK DISINI');
                                lastStockEdit = calculationStock;
                                console.log(
                                  `Stock untuk keyword ${response._id} di lokasi ${locationMain.location_id} sama dengan lokasi ${locationEdit.location_id} stock ${locationEdit.stock} kurang ${calculationStock} hasil ${calculationStockEdit}`,
                                );
                                if (calculationStockEdit > 0) {
                                  if (this.type_stock == 'no_threshold') {
                                    try {
                                      await this.serviceStock.updateV2(
                                        {
                                          location: locationEdit?.location_id,
                                          product: product_idEdit,
                                          qty: calculationStockEdit,
                                          qty_flashsale:
                                            calculationStockEditFlahsale ?? 0,
                                          keyword: response?._id?.toString(),
                                          is_flashsale:
                                            checkEditKeyword?.eligibility
                                              ?.flashsale?.status,
                                        },
                                        credential_detail_edit,
                                        false,
                                        false,
                                      );
                                    } catch (e) {
                                      throw new BadRequestException(e);
                                    }
                                  }
                                  let stock_threshold = 0;
                                  console.log(
                                    '=== MASUK DISINI CONDETION STOCK ===',
                                    this.stock_all,
                                  );
                                  if (this.type_stock !== 'no_threshold') {
                                    stock_threshold =
                                      locationEdit?.stock - locationMain?.stock;
                                    this.stock_all = stock_threshold;
                                  } else {
                                    this.stock_all = calculationStockEdit;
                                  }
                                } else {
                                  this.stock_all = calculationStockEdit;
                                }
                              }
                            }
                          }
                        }
                      }
                    } else {
                      for (
                        let editIndex = 0;
                        editIndex < checkEditKeyword?.bonus.length;
                        editIndex++
                      ) {
                        console.log(
                          '== ELSE JIKA STOCK BELUM ADA DI REDEEM ===',
                        );
                        const bonusEdit = checkEditKeyword?.bonus[editIndex];
                        this.start_date_stock = bonusEdit?.start_date;
                        this.end_date_stock = bonusEdit?.end_date;
                        if (
                          checkEditKeyword?.eligibility?.flashsale?.status ==
                            true &&
                          bonusEdit?.stock_type == 'no_threshold'
                        ) {
                          const count_stock_main = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          const count_stock_edit = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          const count_stock_main_flashsale = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) =>
                              acc + item.stock_flashsale
                                ? item.stock_flashsale
                                : 0,
                            0,
                          );
                          const count_stock_edit_flashsale = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) =>
                              acc + item?.stock_flashsale ?? 0,
                            0,
                          );
                          console.log(
                            '= STOCK FLASHSALE =',
                            count_stock_main_flashsale,
                            count_stock_edit_flashsale,
                          );
                          this.stock_added =
                            count_stock_edit - count_stock_main;
                          this.stock_all = count_stock_edit - count_stock_main;
                          this.stock_added_flashsale =
                            count_stock_edit_flashsale -
                            count_stock_main_flashsale;
                          const product_idEdit = getProductID(
                            bonusEdit?.bonus_type,
                            this.configService,
                          );
                          this.bonus_type = bonusEdit?.bonus_type;
                          this.product_id = product_idEdit;
                          this.type_stock = bonusEdit?.stock_type;
                          this.stock_location_reset = bonusEdit?.stock_location;
                          console.log({ bonusEdit, product_idEdit });
                          this.bonus = bonusEdit;
                          const credential_detail_edit =
                            await this.accountService.detail(credential?._id);
                          console.log('ELSE AND YG EDIT', this.stock_all);

                          for (
                            let bonusEditIndex = 0;
                            bonusEditIndex < bonusEdit.stock_location.length;
                            bonusEditIndex++
                          ) {
                            const locationEdit =
                              bonusEdit.stock_location[bonusEditIndex];
                            lastStockEdit = locationEdit.stock;
                            const calculationStockFS =
                              locationEdit?.stock_flashsale -
                              locationMain.stock_flashsale
                                ? locationMain.stock_flashsale
                                : 0;
                            const calculationStockEditReguler =
                              locationEdit?.stock - locationMain?.stock;
                            if (locationMain?.stock !== locationEdit?.stock) {
                              this.stock_status = true;
                            } else {
                              this.stock_status = false;
                            }
                            if (
                              locationMain.location_id ===
                              locationEdit.location_id
                            ) {
                              if (locationEdit?.stock_flashsale > 0) {
                                console.log(
                                  '== IF UPDATE BALANCE FLASH SALE ==',
                                );
                                try {
                                  await this.serviceStock.updateStockFlashSale(
                                    {
                                      location: locationEdit?.location_id,
                                      product: product_idEdit,
                                      qty: calculationStockEditReguler,
                                      qty_flashsale:
                                        locationEdit?.stock_flashsale,
                                      keyword: response?._id?.toString(),
                                    },
                                    credential_detail_edit,
                                    false,
                                    bonusMain?.stock_type,
                                  );
                                } catch (e) {
                                  throw new BadRequestException(e);
                                }
                              } else {
                                try {
                                  await this.serviceStock.updateStockFlashSale(
                                    {
                                      location: locationEdit?.location_id,
                                      product: product_idEdit,
                                      qty: calculationStockEditReguler,
                                      qty_flashsale: calculationStockFS,
                                      keyword: response?._id?.toString(),
                                    },
                                    credential_detail_edit,
                                    false,
                                    bonusMain?.stock_type,
                                  );
                                } catch (e) {
                                  throw new BadRequestException(e);
                                }
                              }
                            }
                          }
                        } else if (
                          checkEditKeyword?.eligibility?.flashsale?.status ==
                            true &&
                          bonusEdit?.stock_type !== 'no_threshold'
                        ) {
                          const count_stock_main = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          const count_stock_edit = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          const count_stock_main_flashsale = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) =>
                              acc + item.stock_flashsale
                                ? item.stock_flashsale
                                : 0,
                            0,
                          );
                          const count_stock_edit_flashsale = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) =>
                              acc + item?.stock_flashsale ?? 0,
                            0,
                          );
                          console.log(
                            '= STOCK FLASHSALE =',
                            count_stock_main_flashsale,
                            count_stock_edit_flashsale,
                          );
                          this.stock_added =
                            count_stock_edit - count_stock_main;
                          this.stock_all = count_stock_edit - count_stock_main;
                          this.stock_added_flashsale =
                            count_stock_edit_flashsale -
                            count_stock_main_flashsale;
                          const product_idEdit = getProductID(
                            bonusEdit?.bonus_type,
                            this.configService,
                          );
                          this.bonus_type = bonusEdit?.bonus_type;
                          this.product_id = product_idEdit;
                          this.type_stock = bonusEdit?.stock_type;
                          this.stock_location_reset = bonusEdit?.stock_location;
                          console.log({ bonusEdit, product_idEdit });
                          this.bonus = bonusEdit;
                          const credential_detail_edit =
                            await this.accountService.detail(credential?._id);
                          console.log('ELSE AND YG EDIT', this.stock_all);

                          for (
                            let bonusEditIndex = 0;
                            bonusEditIndex < bonusEdit.stock_location.length;
                            bonusEditIndex++
                          ) {
                            const locationEdit =
                              bonusEdit.stock_location[bonusEditIndex];
                            lastStockEdit = locationEdit.stock;
                            const calculationStockEditReguler =
                              locationEdit?.stock - locationMain?.stock;
                            if (locationMain?.stock !== locationEdit?.stock) {
                              this.stock_status = true;
                            } else {
                              this.stock_status = false;
                            }
                            if (
                              locationMain.location_id ===
                              locationEdit.location_id
                            ) {
                              if (
                                locationMain?.stock_flashsale == 0 &&
                                locationEdit?.stock_flashsale > 0
                              ) {
                                console.log(
                                  '== IF UPDATE BALANCE FLASH SALE ==',
                                );
                                try {
                                  await this.serviceStock.updateStockFlashSale(
                                    {
                                      location: locationEdit?.location_id,
                                      product: product_idEdit,
                                      qty: calculationStockEditReguler,
                                      qty_flashsale:
                                        locationEdit?.stock_flashsale,
                                      keyword: response?._id?.toString(),
                                    },
                                    credential_detail_edit,
                                    false,
                                    bonusMain?.stock_type,
                                  );
                                } catch (e) {
                                  throw new BadRequestException(e);
                                }

                                try {
                                  await this.serviceStock.updateStockThersholdFlashSale(
                                    {
                                      location: locationEdit?.location_id,
                                      product_id: product_idEdit,
                                      qty_flashsale:
                                        locationEdit?.stock_flashsale,
                                      keyword_id: response?._id?.toString(),
                                    },
                                    credential_detail_edit,
                                  );
                                } catch (e) {
                                  throw new BadRequestException(e);
                                }
                              }
                            }
                          }
                        } else if (
                          response?.eligibility?.flashsale?.status == true &&
                          checkEditKeyword?.eligibility?.flashsale?.status ==
                            false
                        ) {
                          const count_stock_main = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          const count_stock_edit = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          const count_stock_main_flashsale = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) =>
                              acc + item.stock_flashsale
                                ? item.stock_flashsale
                                : 0,
                            0,
                          );
                          const count_stock_edit_flashsale = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) =>
                              acc + item?.stock_flashsale ?? 0,
                            0,
                          );
                          console.log(
                            '= STOCK FLASHSALE =',
                            count_stock_main_flashsale,
                            count_stock_edit_flashsale,
                          );
                          this.stock_added =
                            count_stock_edit - count_stock_main;
                          this.stock_all = count_stock_edit - count_stock_main;
                          this.stock_added_flashsale =
                            count_stock_edit_flashsale -
                            count_stock_main_flashsale;
                          const product_idEdit = getProductID(
                            bonusEdit?.bonus_type,
                            this.configService,
                          );
                          this.bonus_type = bonusEdit?.bonus_type;
                          this.product_id = product_idEdit;
                          this.type_stock = bonusEdit?.stock_type;
                          this.stock_location_reset = bonusEdit?.stock_location;
                          console.log({ bonusEdit, product_idEdit });
                          this.bonus = bonusEdit;
                          const credential_detail_edit =
                            await this.accountService.detail(credential?._id);
                          console.log('ELSE AND YG EDIT', this.stock_all);

                          for (
                            let bonusEditIndex = 0;
                            bonusEditIndex < bonusEdit.stock_location.length;
                            bonusEditIndex++
                          ) {
                            const locationEdit =
                              bonusEdit.stock_location[bonusEditIndex];
                            lastStockEdit = locationEdit.stock;
                            const calculationStockFS =
                              locationEdit?.stock_flashsale -
                              locationMain.stock_flashsale
                                ? locationMain.stock_flashsale
                                : 0;
                            const calculationStockEditReguler =
                              locationEdit?.stock - locationMain?.stock;
                            if (locationMain?.stock !== locationEdit?.stock) {
                              this.stock_status = true;
                            } else {
                              this.stock_status = false;
                            }
                            if (
                              locationMain.location_id ===
                              locationEdit.location_id
                            ) {
                              if (calculationStockEditReguler > 0) {
                                if (this.type_stock == 'no_threshold') {
                                  //NANTI DI UPDATE V2
                                  try {
                                    await this.serviceStock.updateV2(
                                      {
                                        location: locationEdit?.location_id,
                                        product: product_idEdit,
                                        qty: calculationStockEditReguler,
                                        qty_flashsale: 0,
                                        keyword: response?._id?.toString(),
                                      },
                                      credential_detail_edit,
                                      false,
                                      false,
                                    );
                                  } catch (e) {
                                    throw new BadRequestException(e);
                                  }
                                }
                              }
                            }
                          }
                        } else {
                          const count_stock_main = bonusMain[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          const count_stock_edit = bonusEdit[
                            'stock_location'
                          ].reduce(
                            (acc, item: any) => acc + item?.stock ?? 0,
                            0,
                          );
                          this.stock_added =
                            count_stock_edit - count_stock_main;
                          this.stock_all = count_stock_edit - count_stock_main;
                          console.log('ELSE AND YG EDIT', this.stock_all);
                          const product_idEdit = getProductID(
                            bonusEdit?.bonus_type,
                            this.configService,
                          );
                          this.bonus_type = bonusEdit?.bonus_type;
                          this.product_id = product_idEdit;
                          this.type_stock = bonusEdit?.stock_type;
                          this.stock_location_reset = bonusEdit?.stock_location;
                          console.log({ bonusEdit, product_idEdit });
                          this.bonus = bonusEdit;
                          const credential_detail_edit =
                            await this.accountService.detail(credential?._id);
                          for (
                            let bonusEditIndex = 0;
                            bonusEditIndex < bonusEdit.stock_location.length;
                            bonusEditIndex++
                          ) {
                            const locationEdit =
                              bonusEdit.stock_location[bonusEditIndex];
                            lastStockEdit = locationEdit.stock;
                            if (locationMain?.stock !== locationEdit?.stock) {
                              this.stock_status = true;
                            } else {
                              this.stock_status = false;
                            }
                            if (
                              locationMain.location_id ===
                              locationEdit.location_id
                            ) {
                              const calculationStockEdit =
                                locationEdit.stock - locationMain.stock;
                              if (calculationStockEdit > 0) {
                                if (this.type_stock == 'no_threshold') {
                                  //NANTI DI UPDATE V2
                                  try {
                                    await this.serviceStock.updateV2(
                                      {
                                        location: locationEdit?.location_id,
                                        product: product_idEdit,
                                        qty: calculationStockEdit,
                                        qty_flashsale: 0,
                                        keyword: response?._id?.toString(),
                                      },
                                      credential_detail_edit,
                                      false,
                                      false,
                                    );
                                  } catch (e) {
                                    throw new BadRequestException(e);
                                  }
                                }else if(this.type_stock !== 'no_thershold'){
                                  console.log('=== DIA BELUM ADA REDEEM TAPI ADD STOCK DAN JADI THERSHOLD MASUK DI ELSE ===')
                                  //NANTI DI UPDATE V2
                                  try {
                                    await this.serviceStock.updateV2(
                                      {
                                        location: locationEdit?.location_id,
                                        product: product_idEdit,
                                        qty: calculationStockEdit,
                                        qty_flashsale: 0,
                                        keyword: response?._id?.toString(),
                                      },
                                      credential_detail_edit,
                                      false,
                                      false,
                                    );
                                  } catch (e) {
                                    throw new BadRequestException(e);
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }

                if (!isHQ || isHQ) {
                  if (response) {
                    // voting New
                    const votingNew = checkEditKeyword?.bonus?.filter(
                      (e) => e.bonus_type == 'voting',
                    );

                    // voting Old
                    const votingOld = response?.bonus?.filter(
                      (e) => e.bonus_type == 'voting',
                    );

                    if (votingNew.length > 0 && votingOld.length > 0) {
                      // tambahkan deskripsi program untuk master vote (saat ini)
                      await this.voteService.editVoteData(
                        response,
                        checkEditKeyword,
                        votingOld,
                        votingNew,
                      );
                    }

                    response.set(replaceData);

                    await this.keywordNotificationModel.deleteMany({
                      keyword: response?._id,
                    });

                    if (checkEditKeyword.notification.length > 0) {
                      checkEditKeyword?.notification.map(
                        async (notificationData) => {
                          const updatedKeywordName =
                            notificationData.keyword_name.replace('-EDIT', '');
                          const newNotification =
                            new this.keywordNotificationModel({
                              keyword: response?._id,
                              ...notificationData,
                              keyword_name: updatedKeywordName,
                            });

                          await newNotification
                            .save()
                            .then(async (returning) => {
                              return returning;
                            })
                            .catch((e) => {
                              throw new Error(
                                e?.message
                                  ? e?.message
                                  : 'Internal Server Error',
                              );
                            });
                        },
                      );
                    }

                    statusSet = new Types.ObjectId(
                      await this.appsService.getConfig(
                        'DEFAULT_STATUS_KEYWORD_APPROVE_HQ',
                      ),
                    );
                    if (isHQ) {
                      updateData = {
                        'reward_catalog.keyword': `${checkEditKeyword.eligibility.name}-${timestampNow}`,
                        'eligibility.name': `${checkEditKeyword.eligibility.name}-${timestampNow}`,
                        keyword_edit: response?._id,
                        keyword_approval: statusSet,
                        hq_approver: credential?._id,
                        need_review_after_edit: false,
                        is_stoped: true,
                      };
                    } else {
                      updateData = {
                        'reward_catalog.keyword': `${checkEditKeyword.eligibility.name}-${timestampNow}`,
                        'eligibility.name': `${checkEditKeyword.eligibility.name}-${timestampNow}`,
                        keyword_edit: response?._id,
                        keyword_approval: statusSet,
                        non_hq_approver: credential?._id,
                        need_review_after_edit: false,
                        is_stoped: true,
                      };
                    }


                    await response.save();

                    let dataUpdate;
                    if (response?.eligibility?.flashsale?.status == false) {
                      //Update Initial Stock Flashsale 0 jika status flashsale false
                      dataUpdate = await this.setIntialStockFlashSale(
                        response?.eligibility?.name,
                      );
                      // console.log('=== NAME KEY ===',dataUpdate)
                    }

                    await this.deleteRedisKeyword(
                      response.eligibility.name,
                      'eligibility.name',
                    );

                    //Add Reset max redeem tresholds
                    const checkMaxRedeemTreshold =
                      await this.maxRedeemTresholdsService.maxRedeemThresholdsFindOne(
                        response?._id.toString(),
                        response?.eligibility?.name,
                      );
                    if (
                      response?.eligibility?.max_redeem_threshold?.status ==
                      true
                    ) {
                      console.log(
                        '=== CHECK MAX REDEEM ===',
                        checkMaxRedeemTreshold,
                      );
                      const program_id_max: any =
                        response?.eligibility?.program_id;
                      const dataThresholdMax: MaxRedeemThresholds = {
                        keyword_id: response?._id.toString(),
                        program: program_id_max,
                        max_mode: response?.eligibility?.max_mode,
                        keyword: response?.eligibility?.name,
                        type: response?.eligibility?.max_redeem_threshold?.type,
                        date: response?.eligibility?.max_redeem_threshold?.date,
                        time: response?.eligibility?.max_redeem_threshold?.time,
                        start_date: moment(response?.eligibility?.start_period)
                          .utc()
                          .format('YYYY-MM-DD')
                          .toString(),
                        end_date: moment(response?.eligibility?.end_period)
                          .utc()
                          .format('YYYY-MM-DD')
                          .toString(),
                        created_at: new Date(), // Sesuaikan dengan nilai yang sesuai
                        updated_at: new Date(), // Sesuaikan dengan nilai yang sesuai
                        deleted_at: null, // Sesuaikan dengan nilai yang sesuai
                      };
                      //console.log('=== PAYLOAD STOCK THRESHOLD ===', dataThresholdMax)
                      if (checkMaxRedeemTreshold == null) {
                        console.log(
                          '=== CHECK MAX REDEEM NULL ===',
                          dataThresholdMax,
                        );
                        await this.maxRedeemTresholdsService.maxRedeemTresholdsCreate(
                          dataThresholdMax,
                        );
                      } else {
                        console.log(
                          '=== CHECK MAX REDEEM ELSE ===',
                          dataThresholdMax,
                        );
                        await this.maxRedeemTresholdsService.maxRedeemThresholdsUpdate(
                          response?._id.toString(),
                          response?.eligibility?.name,
                          dataThresholdMax,
                        );
                      }
                    }

                    if (
                      response?.eligibility?.max_redeem_threshold?.status ==
                      false
                    ) {
                      if (checkMaxRedeemTreshold) {
                        await this.maxRedeemTresholdsService.maxRedeemThresholdsDelete(
                          response?._id.toString(),
                          response?.eligibility?.name,
                        );
                      }
                    }

                    console.log(
                      '=== CHECK INITIAL ===',
                      dataUpdate?.bonus[0]?.stock_location[0]?.stock_flashsale,
                    );
                    if (
                      response?.eligibility?.flashsale?.status == false &&
                      dataUpdate?.bonus[0]?.stock_location[0]
                        ?.stock_flashsale == 0
                    ) {
                      //Add stock tresholds
                      for (
                        let i = 0;
                        i < this.stock_location_reset.length;
                        i++
                      ) {
                        const location = this.stock_location_reset[i];
                        const checkStocksTreshold =
                          await this.serviceStock.stocksThresholdsFind(
                            response?._id,
                            response?.eligibility?.name,
                            location?.location_id,
                          );
                        const checkStocksRemaining =
                          await this.serviceStock.getStockDetail({
                            location: location?.location_id,
                            product: this.product_id,
                            keyword: response?._id,
                          });
                        console.log(
                          '=== CHECK STOCK REMAINING ===',
                          checkStocksRemaining,
                        );
                        if (this.type_stock !== 'no_threshold') {
                          const checkStocksTresholdDeleted =
                            await this.serviceStock.stocksThresholdsFindDeleted(
                              response?._id,
                              response?.eligibility?.name,
                              location?.location_id,
                            );
                          const checkDeleted: boolean =
                            checkStocksTresholdDeleted ? true : false;
                          let maximum_threshold_count = 0;
                          if (
                            checkStocksRemaining?.balance == location?.stock
                          ) {
                            console.log(
                              '=== BELUM ADA REDEEM OR ADD STOCK ===',
                            );
                            // UBAH DI SET KE 0
                            try {
                              await this.serviceStock.set_thershold(
                                {
                                  location: location?.location_id,
                                  product: this.product_id,
                                  keyword: response?._id.toString(),
                                  qty: 0,
                                },
                                0,
                                credentialAccount,
                              );
                            } catch (e) {
                              throw new BadRequestException(e);
                            }
                            maximum_threshold_count =
                              checkStocksRemaining?.balance -
                              this.bonus?.threshold;
                          } else if (
                            checkStocksRemaining?.balance !== location?.stock &&
                            response?.eligibility?.flashsale?.status == false && this.stock_status == false
                          ) {
                            maximum_threshold_count = Math.max(
                              checkStocksRemaining?.balance - response?.bonus[0]?.threshold,
                              0
                            );
                          
                            console.log(
                              '=== CASE NOMOR 8 ===',
                              maximum_threshold_count,
                            );
                            console.log(
                              '=== CASE NOMOR 8.1 ===',
                              this.bonus?.threshold,
                            );
                            console.log(
                              '=== CASE NOMOR 8.2 ===',
                              response?.bonus[0]?.threshold,
                            );
                          }else if(checkStocksRemaining?.balance === location?.stock &&
                            response?.eligibility?.flashsale?.status == false && this.stock_status == true && response?.bonus[0]?.bonus_type !== 'direct_redeem'){
                              console.log(
                                '=== CASE NOMOR 9 ===',
                                maximum_threshold_count,
                              );
                              maximum_threshold_count = this.stock_added
                              await this.serviceStock.decrementStock(
                                {
                                  location: location?.location_id,
                                  product: this.product_id,
                                  qty: this.stock_added,
                                  keyword: response?._id.toString(),
                                },
                                this.stock_added,
                                response?.created_by,
                              )
                          } else if(checkStocksRemaining?.balance !== location?.stock &&
                            response?.eligibility?.flashsale?.status == false && this.stock_status == true && this.type_stock_before !== 'no_threshold' && response?.bonus[0]?.bonus_type !== 'direct_redeem'){
                              console.log(
                                '=== CASE NOMOR 10 STOCK ADD NOT DIRECT REDEEM ===',
                                this.stock_added,
                              );
                              maximum_threshold_count = this.stock_added
                          }else if(checkStocksRemaining?.balance !== location?.stock &&
                            response?.eligibility?.flashsale?.status == false && this.stock_status == true && this.type_stock_before !== 'no_threshold' && response?.bonus[0]?.bonus_type === 'direct_redeem'){
                              console.log(
                                '=== CASE NOMOR 10.1 STOCK ADD DIRECT REDEEM ===',
                                this.stock_added,
                              );
                              maximum_threshold_count = this.stock_added
                              await this.serviceStock.decrementStock(
                                {
                                  location: location?.location_id,
                                  product: this.product_id,
                                  qty: this.stock_added,
                                  keyword: response?._id.toString(),
                                },
                                this.stock_added,
                                response?.created_by,
                              )
                          }
                          else if(checkStocksRemaining?.balance !== location?.stock &&
                            response?.eligibility?.flashsale?.status == false && this.stock_status == true && this.type_stock_before === 'no_threshold'){
                              console.log(
                                '=== CASE NOMOR 11 STOCK ADD ===',
                                this.stock_added,
                              );
                              maximum_threshold_count = Math.max(
                                checkStocksRemaining?.balance - response?.bonus[0]?.threshold,
                                0
                              );                              
                          } else if (
                            checkStocksRemaining?.balance == location?.stock &&
                            this.stock_status == false
                          ) {
                            console.log(
                              '=== BELUM ADA REDEEM OR ADD STOCK STOCK STATUS FALSE ===',
                            );
                            maximum_threshold_count =
                              checkStocksRemaining?.balance -
                              this.bonus?.threshold;
                          } else if (
                            checkStocksRemaining?.balance !== location?.stock &&
                            this.stock_status == false
                          ) {
                            console.log(
                              '=== ADA REDEEM OR ADD STOCK STOCK STATUS FALSE ===',
                            );
                            maximum_threshold_count =
                              checkStocksRemaining?.balance + this.stock_all;
                          } else if (
                            checkStocksRemaining?.balance !== location?.stock &&
                            this.stock_status == true
                          ) {
                            console.log('=== ADA REDEEM TETAPI ADD STOCK ===');
                            maximum_threshold_count =
                              checkStocksRemaining?.balance + this.stock_all;
                          } else if (
                            checkStocksRemaining?.balance !== location?.stock &&
                            this.stock_status == false
                          ) {
                            console.log(
                              '=== ADA REDEEM TETAPI NO ADD STOCK ===',
                            );
                            maximum_threshold_count =
                              checkStocksRemaining?.balance +
                              this.stock_all -
                              this.bonus?.threshold;
                          } else {
                            console.log('=== ELSE MAXIMUM THRESHOLD COUNT ===');
                            maximum_threshold_count =
                              location?.stock - this.bonus?.threshold;
                          }
                          console.log(
                            '=== STATUS STOCK ===',
                            this.stock_status,
                          );
                          console.log(
                            '=== MAXIMUM THRESHOD ===',
                            maximum_threshold_count,
                          );
                          const locationID = new Types.ObjectId(
                            location?.location_id,
                          );
                          const dataStocksThreshold: StockThreshold = {
                            keyword_id: response?._id,
                            keyword: response?.eligibility?.name,
                            location: locationID,
                            bonus_type: this.bonus_type,
                            product_id: this.product_id,
                            stock_threshold: this.bonus?.threshold,
                            maximum_threshold:
                              maximum_threshold_count ?? this.stock_all,
                            schedule: this.bonus?.hour,
                            start_from: moment(this.start_date_stock)
                              .format('YYYY-MM-DD')
                              .toString(),
                            end_at: moment(this.end_date_stock)
                              .format('YYYY-MM-DD')
                              .toString(),
                            created_at: new Date(), // Sesuaikan dengan nilai yang sesuai
                            updated_at: new Date(), // Sesuaikan dengan nilai yang sesuai
                            deleted_at: null,
                            type: this.bonus?.stock_type,
                          };
                          console.log(
                            '=== STOCK ALL VALUE ADD OR EDIT(EDITABLE) ===',
                            this.stock_all,
                          );
                          if (checkStocksTreshold == null) {
                            await this.serviceStock.stocksTresholdsCreate(
                              dataStocksThreshold,
                            );
                            //Check Jika Stock Threshold Null dia akan mengupdate case jika keyword first type no_threshold ke daily_threshold
                            try {
                              await this.serviceStock.update(
                                {
                                  location: location?.location_id,
                                  product: this.product_id,
                                  qty:
                                    checkStocksTreshold == null ||
                                    (checkStocksTreshold != null &&
                                      !checkStocksTresholdDeleted)
                                      ? this.bonus?.threshold // Set to a dynamic value based on checkStocksTreshold
                                      : this.stock_all, // Set to this.stock_all if checkStocksTreshold is null,
                                  keyword: response?._id.toString(),
                                },
                                credentialAccount,
                                false,
                              );
                            } catch (e) {
                              throw new BadRequestException(e);
                            }
                          } else {
                            console.log(
                              'PAYLOAD EDIT ELSE',
                              dataStocksThreshold,
                            );
                            console.log('=== CHECK DELETED ===', checkDeleted);
                            //Check Jika Stock Threshold Null dia akan mengupdate case jika keyword first type no_threshold ke daily_threshold
                            if (checkStocksTresholdDeleted) {
                              try {
                                await this.serviceStock.update(
                                  {
                                    location: location?.location_id,
                                    product: this.product_id,
                                    qty:
                                      checkStocksTreshold == null ||
                                      (checkStocksTreshold == null &&
                                        !checkStocksTresholdDeleted) ||
                                      (checkStocksTreshold &&
                                        checkStocksTresholdDeleted) ||
                                      (checkStocksTreshold &&
                                        checkDeleted &&
                                        response?.eligibility?.flashsale
                                          ?.status == false)
                                        ? this.bonus?.threshold // Set to a dynamic value based on checkStocksTreshold
                                        : this.stock_all, // Set to this.stock_all if checkStocksTreshold is null,
                                    qty_flashsale: 0,
                                    keyword: response?._id.toString(),
                                  },
                                  credentialAccount,
                                  false
                                );
                              } catch (e) {
                                throw new BadRequestException(e);
                              }
                            }
                            await this.serviceStock.stocksThresholdsUpdate(
                              response?._id,
                              response?.eligibility?.name,
                              location?.location_id,
                              dataStocksThreshold,
                              checkDeleted,
                            );
                          }
                        } else {
                          console.log(
                            '== ELSE NO THRSHOLD ==',
                            this.stock_status,
                          );
                          if (checkStocksTreshold) {
                            const location = this.stock_location_reset[i];
                            //MOVE STOCK THERSHOLD TO REMAINING STOCK
                            console.log(
                              '== MOVE STOCK THERSHOLD TO REMAINING STOCK ==',
                            );
                            await this.serviceStock
                              .upsert(
                                {
                                  location: location?.location_id,
                                  product: this.product_id,
                                  keyword: response?._id,
                                  qty: checkStocksTreshold?.maximum_threshold,
                                },
                                checkStocksTreshold?.maximum_threshold,
                                credentialAccount,
                              )
                              .then(async (data) => {
                                if (data !== undefined) {
                                  await this.serviceStock.logged(
                                    {
                                      location: location?.location_id,
                                      product: this.product_id,
                                      keyword: response?._id,
                                      qty: checkStocksTreshold?.maximum_threshold,
                                    },
                                    credentialAccount,
                                    'mutation stock thershold to no thershold',
                                    data.value.balance ===
                                      checkStocksTreshold?.maximum_threshold
                                      ? 0
                                      : data.value.balance,
                                  );
                                }

                                const res = new StockResponse();
                                res.code = 'S00000';
                                res.message = 'Approval Reserve Success!';
                                res.transaction_classify = 'TRANSACTION_STOCK';
                                res.statusCode = HttpStatus.OK;
                                res.payload =
                                  data !== undefined ? data.value : null;
                                return res;
                              })
                              .catch((e: Error) => {
                                throw new Error(e.message);
                              });
                            await this.serviceStock.stocksThresholdsDelete(
                              response?._id,
                              response?.eligibility?.name,
                              location?.location_id,
                              checkStocksTreshold?.maximum_threshold,
                            );
                          }
                        }
                      }
                    }
                    const payloadVoucher: any = replaceData?.bonus;

                    response.bonus = payloadVoucher;

                    // Rollback voucher generation approval
                    const voucher = response?.bonus?.filter(
                      (e: any) =>
                        e?.bonus_type == 'discount_voucher' &&
                        e?.voucher_type == 'Generate',
                    );

                    if (voucher.length > 0) {
                      // Create voucher
                      console.log(
                        'Total stock yg di tambahkan user',
                        this.stock_added,
                      );
                      if (response?.eligibility?.flashsale?.status == true) {
                        await this.voucherService.voucherWithKeyword(
                          response,
                          credential,
                          req,
                          true,
                          this.stock_added_flashsale,
                        );
                      } else {
                        await this.voucherService.voucherWithKeyword(
                          response,
                          credential,
                          req,
                          true,
                          this.stock_added,
                        );
                      }
                    }

                    // // voting
                    // const voting = response?.bonus?.filter(
                    //   (e) => e.bonus_type == 'voting',
                    // );
                    // if (voting.length > 0) {
                    //   // tambahkan deskripsi program untuk master vote (saat ini)
                    //   await this.voteService.addVoteData(response, voting);
                    // }
                  } else {
                    throw new BadRequestException([
                      { isInvalidDataContent: 'Program not found.' },
                    ]);
                  }
                }
                // else {
                //   statusSet = new Types.ObjectId(
                //     await this.appsService.getConfig(
                //       'DEFAULT_STATUS_KEYWORD_APPROVE_NON_HQ',
                //     ),
                //   );
                //   updateData = {
                //     'eligibility.name': `${checkEditKeyword.eligibility.name}`,
                //     keyword_edit: null,
                //     keyword_approval: statusSet,
                //     non_hq_approver: credential?._id,
                //     need_review_after_edit: false,
                //     is_stoped: false,
                //   };
                // }
              }
            }
          })
          .catch((error) => {
            throw new Error(
              error?.message ? error?.message : 'Internal Server Error',
            );
          });

        return await this.keywordModel
          .findOneAndUpdate(
            {
              $and: [{ _id: keywordID }],
            },
            updateData,
          )
          .then(async (keyword) => {
            await new this.keywordApprovalLogModel({
              keyword: keywordID,
              processed_by: credential,
              status: statusSet,
              reason: reason,
            })
              .save()
              .catch((e: Error) => {
                throw new Error(e.message);
              });
            const superior_var = await this.detail(param);
            const credential_detail = await this.accountService.detail(
              credential?._id,
            );
            const trace_id = this.transactionOptional.getTracingId(
              keyword,
              response,
            );
            if (
              credential_detail.account_location.location_detail.name === 'HQ'
            ) {
              await this.sendKeywordApprovalNotificatioApprovedHQ(
                keyword,
                keyword,
                credential_detail,
                superior_var,
                reason,
                trace_id,
              );
            } else {
              await this.sendKeywordApprovalNotificatioApprovedNonHQ(
                keyword,
                keyword,
                credential_detail,
                superior_var,
                reason,
                trace_id,
              );
            }
            response.status = HttpStatus.OK;
            response.message = 'Keyword approved';
            response.payload = {
              keyword: param,
              isHq: isHQ,
              status: statusSet,
            };

            await this.slRedisService.reloadKeyword({
              _id: new mongoose.Types.ObjectId(param),
            });

            return response;
          })
          .catch((e: Error) => {
            response.status = HttpStatus.BAD_REQUEST;
            response.message = 'Keyword failed to approve';
            response.payload = param;
            throw new Error(e.message);
          });
      } else {
        return await this.keywordModel
          .findOneAndUpdate(
            {
              $and: [{ _id: keywordID }],
            },
            updateData,
          )
          .then(async (keyword) => {
            await new this.keywordApprovalLogModel({
              keyword: keywordID,
              processed_by: credential,
              status: statusSet,
              reason: reason,
            })
              .save()
              .catch((e: Error) => {
                throw new Error(e.message);
              });
            const superior_var = await this.detail(param);
            const credential_detail = await this.accountService.detail(
              credential?._id,
            );
            console.log('credential_detail', credential_detail);
            const trace_id = this.transactionOptional.getTracingId(
              keyword,
              response,
            );
            if (
              credential_detail.account_location.location_detail.name === 'HQ'
            ) {
              await this.sendKeywordApprovalNotificatioApprovedHQ(
                keyword,
                keyword,
                credential,
                superior_var,
                reason,
                trace_id,
              );
            } else {
              await this.sendKeywordApprovalNotificatioApprovedNonHQ(
                keyword,
                keyword,
                credential,
                superior_var,
                reason,
                trace_id,
              );
            }
            response.status = HttpStatus.OK;
            response.message = 'Keyword approved';
            response.payload = {
              keyword: param,
              isHq: isHQ,
              status: statusSet,
            };

            if (isHQ) {
              /*
              OLD CODE
              // Stock reserve Approval Merchandise
              await this.serviceStock.approve_reserve_keyword(
                null,
                keywordID.toString(),
                credentialAccount,
                this.type_stock,
              );
              */

              await this.deleteRedisKeyword(
                keyword.eligibility.name,
                'eligibility.name',
              );

              //CLEAR REDIS STOCK
              const stock_location = keyword.bonus[0].stock_location;
              for (let i = 0; i < stock_location?.length; i++) {
                const locationId = stock_location[i]?.location_id;

                await this.deleteRedisStock(
                  keyword?._id.toString(),
                  locationId.toString(),
                );
              }

              for (const bonusData of keyword.bonus) {
                switch (bonusData?.bonus_type) {
                  case 'direct_redeem':
                    const bonusDirectRedeem = plainToInstance(
                      KeywordDirectRedeem,
                      bonusData,
                    );
                    const check_stock_initial = bonusData[
                      'stock_location'
                    ].reduce((acc, item: any) => acc + item?.stock ?? 0, 0);

                    const location_hq = await this.serviceStock.getLocationHQ();
                    
                      // Fetch the stock, ensure it is a plain number.
                      const origin_stock_data = await this.serviceStock.getStockForReserveWithoutKeyword({
                        product: bonusDirectRedeem?.merchandise,
                        location: location_hq._id.toString(),
                      });
                      const origin_stock = origin_stock_data?.balance || 0; // Replace 'stock' with the actual field name if different.
                    
                      console.log('=== ORIGIN STOCK ===', origin_stock);
                      console.log('=== STOCK INITIAL ===', check_stock_initial);
                    
                      // Compare the numeric values.
                      if (origin_stock < check_stock_initial) {
                        //ROLLBACK TO Keyword New
                        const newStatusKey = new Types.ObjectId(
                          await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_ADD'),
                        );
                        await this.keywordModel.findOneAndUpdate({_id: keyword?._id},{$set: {keyword_approval: newStatusKey}})

                        //Remove Keyword Logs
                        const statusHQ = new Types.ObjectId(
                          await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_APPROVE_HQ'),
                        );
                        
                        await this.keywordApprovalLogModel.deleteOne({keyword: keyword?._id,status: statusHQ});

                        throw new BadRequestException(
                          `Merchandise stock ${origin_stock} please add merchandise stock!`,
                        );                      }                 
                    break;
                }
              }

              // Process generate voucher
              const voucher = keyword.bonus.filter(
                (e: any) =>
                  e?.bonus_type == 'discount_voucher' &&
                  e?.voucher_type == 'Generate',
              );
              if (voucher.length > 0) {
                // Create voucher
                await this.voucherService.voucherWithKeyword(
                  keyword,
                  credential,
                  req,
                );
              }

              // voting
              const voting = keyword?.bonus?.filter(
                (e) => e.bonus_type == 'voting',
              );
              if (voting.length > 0) {
                // tambahkan deskripsi program untuk master vote (saat ini)
                await this.voteService.addVoteData(keyword, voting);
              }

              console.log('=== STEP 1 ===');
              // Add stock per location
              for (let index = 0; index < superior_var?.bonus.length; index++) {
                const bonus = superior_var?.bonus[index];

                const product_id = getProductID(
                  bonus?.bonus_type,
                  this.configService,
                );
                this.type_stock = bonus?.stock_type;
                this.bonus_type = bonus?.bonus_type;
                if (bonus?.bonus_type == 'direct_redeem') {
                  this.product_id = bonus?.merchandise;
                } else {
                  this.product_id = product_id;
                }

                this.bonus = bonus;
                console.log({ bonus, product_id });

                if (product_id) {
                  for (let i = 0; i < bonus.stock_location.length; i++) {
                    const location = bonus.stock_location[i];
                    if (location?.stock > 0) {
                      if (this.type_stock !== 'no_threshold') {
                        await this.serviceStock.add(
                          {
                            location: location.location_id,
                            product: product_id,
                            qty: this.bonus?.threshold,
                            keyword: keywordID?.toString(),
                          },
                          credential_detail,
                          true,
                        );
                        this.stock_all = this.bonus?.threshold;
                      } else {
                        await this.serviceStock.add(
                          {
                            location: location.location_id,
                            product: product_id,
                            qty: location?.stock,
                            keyword: keywordID?.toString(),
                          },
                          credential_detail,
                          true,
                        );
                        this.stock_all = location?.stock;
                      }
                    }
                  }
                }
              }

              for (let index = 0; index < keyword?.bonus.length; index++) {
                const bonus_res = keyword?.bonus[index];
                this.stock_location_reset = bonus_res?.stock_location;
                this.start_date_stock = bonus_res?.start_date;
                this.end_date_stock = bonus_res?.end_date;
              }
              console.log('=== STEP 2 ===');
              console.log('== MASUK ELSE NOT APPROVE ===');
              // Stock reserve Approval Merchandise
              await this.serviceStock.approve_reserve_keyword(
                null,
                keywordID.toString(),
                credentialAccount,
                this.type_stock,
                this.bonus?.threshold,
              );

              console.log('=== STEP 3 MAX ===');
              const program_id_max: any = keyword?.eligibility?.program_id;
              //Add Reset max redeem tresholds
              if (
                checkEditKeyword?.eligibility?.max_redeem_threshold?.status ==
                true
              ) {
                const dataThresholdMax: MaxRedeemThresholds = {
                  keyword_id: keyword?._id,
                  program: program_id_max,
                  max_mode: keyword?.eligibility?.max_mode,
                  keyword: keyword?.eligibility?.name,
                  type: keyword?.eligibility?.max_redeem_threshold?.type,
                  date: keyword?.eligibility?.max_redeem_threshold?.date,
                  time: keyword?.eligibility?.max_redeem_threshold?.time,
                  start_date: moment(keyword?.eligibility?.start_period)
                    .utc()
                    .format('YYYY-MM-DD')
                    .toString(),
                  end_date: moment(keyword?.eligibility?.end_period)
                    .utc()
                    .format('YYYY-MM-DD')
                    .toString(),
                  created_at: new Date(), // Sesuaikan dengan nilai yang sesuai
                  updated_at: new Date(), // Sesuaikan dengan nilai yang sesuai
                  deleted_at: null, // Sesuaikan dengan nilai yang sesuai
                };

                await this.maxRedeemTresholdsService.maxRedeemTresholdsCreate(
                  dataThresholdMax,
                );
              }

              console.log(
                '=== STEP 4 THRESHOLD ===',
                this.stock_location_reset,
              );
              //Add stock tresholds
              if (this.type_stock !== 'no_threshold') {
                for (let i = 0; i < this.stock_location_reset.length; i++) {
                  const location = this.stock_location_reset[i];
                  const maximum_threshold_count =
                    location?.stock - this.bonus?.threshold;
                  const dataThreshold: StockThreshold = {
                    keyword_id: keyword?._id,
                    keyword: keyword?.eligibility?.name,
                    location: location?.location_id,
                    bonus_type: this.bonus_type,
                    product_id: this.product_id,
                    stock_threshold: this.bonus?.threshold,
                    maximum_threshold: maximum_threshold_count,
                    schedule: this.bonus?.hour,
                    start_from: moment(this.start_date_stock)
                      .format('YYYY-MM-DD')
                      .toString(),
                    end_at: moment(this.end_date_stock)
                      .format('YYYY-MM-DD')
                      .toString(),
                    created_at: new Date(), // Sesuaikan dengan nilai yang sesuai
                    updated_at: new Date(), // Sesuaikan dengan nilai yang sesuai
                    deleted_at: null,
                    type: this.bonus?.stock_type,
                  };
                  console.log(
                    '=== STOCK ALL VALUE ADD OR EDIT NEW ===',
                    this.stock_all,
                  );
                  await this.serviceStock.stocksTresholdsCreate(dataThreshold);
                }
              }
            }

            // voting program
            const voting = keyword.bonus.filter(
              (e) => e.bonus_type == 'voting',
            );
            if (voting.length > 0) {
              // tambahkan deskripsi program untuk master vote (saat ini)
              await this.voteService.addVoteData(keyword, voting);
            }

            return response;
          })
          .catch((e: Error) => {
            response.status = HttpStatus.BAD_REQUEST;
            response.message = 'Keyword failed to approve';
            response.payload = param;
            throw new Error(e.message);
          });
      }
    } else {
      response.status = HttpStatus.FORBIDDEN;
      response.message = 'Only manager can approve keyword';
      response.payload = param;
    }
    return response;
  }

  // =============================================
  async rejectKeyword(param: string, credential: any): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'KEYWORD_APPROVAL';
    const managerRole = await this.appsService.getConfig(
      'DEFAULT_ROLE_MANAGER',
    );
    const hqLocation = await this.appsService.getConfig('DEFAULT_LOCATION_HQ');
    let isHQ = false;
    for (const a in credential.account_location) {
      if (
        credential.account_location[a].location_detail.type.equals(hqLocation)
      ) {
        isHQ = true;
        break;
      }
    }

    const statusNew = await this.appsService.getConfig(
      'DEFAULT_STATUS_KEYWORD_ADD',
    );
    const statusSet = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_REJECT'),
    );
    let updateData = {};
    if (credential.role.equals(managerRole)) {
      if (isHQ) {
        updateData = {
          keyword_approval: statusSet,
          hq_approver: credential?._id,
        };
      } else {
        updateData = {
          keyword_approval: statusSet,
          non_hq_approver: credential?._id,
        };
      }

      const process = await this.keywordModel.findOneAndUpdate(
        { $and: [{ _id: param }, { keyword_approval: statusNew }] },
        updateData,
      );

      if (process) {
        response.statusCode = HttpStatus.OK;
        response.message = 'Keyword rejected';
        response.payload = {
          program: param,
          status: statusSet,
        };
      } else {
        response.statusCode = HttpStatus.BAD_REQUEST;
        response.message = 'Keyword failed to reject';
      }
    } else {
      response.statusCode = HttpStatus.FORBIDDEN;
      response.message = 'Only manager can reject keyword';
    }
    return response;
  }

  async rejectKeywordV2(
    param: string,
    credential: any,
    reason = '',
  ): Promise<KeywordRejectDTOResponse> {
    const keywordID = new mongoose.Types.ObjectId(param);
    const response = new KeywordRejectDTOResponse();
    response.transaction_classify = 'KEYWORD_REJECT';
    const managerRole = await this.appsService.getConfig(
      'DEFAULT_ROLE_MANAGER',
    );
    const hqLocation = await this.appsService.getConfig('DEFAULT_LOCATION_HQ');
    let isHQ = false;
    if (credential.account_location.location_detail.type.equals(hqLocation)) {
      isHQ = true;
    }

    const statusNew = await this.appsService.getConfig(
      'DEFAULT_STATUS_KEYWORD_ADD',
    );

    //SystemConfig Lovs "Approved by Manager HQ" (Status Keyword Active)
    const statusActive = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_APPROVE_HQ'),
    );

    let statusSet;

    let updateData = {};
    if (credential.role.equals(managerRole)) {
      //Check jika keyword sudah berjalan tidak boleh di reject status
      const checkKeywordActive: any = await this.keywordModel.findOne({
        _id: keywordID,
      });

      if (checkKeywordActive?.eligibility?.flashsale?.status == true) {
        //Update Initial Stock Flashsale 0 jika status flashsale false
        await this.setIntialStockFlashSale(
          checkKeywordActive?.eligibility?.name,
        );
        // console.log('=== NAME KEY ===',dataUpdate)
      }

      if (checkKeywordActive.keyword_approval.equals(statusActive)) {
        throw new Error(
          'The keyword you entered is already active, it cannot be rejected',
        );
      } else {
        if (isHQ) {
          statusSet = new Types.ObjectId(
            await this.appsService.getConfig(
              'DEFAULT_STATUS_KEYWORD_REJECT_HQ',
            ),
          );
          updateData = {
            keyword_approval: statusSet,
            hq_approver: credential?._id,
            need_review_after_edit: false,
          };
        } else {
          statusSet = new Types.ObjectId(
            await this.appsService.getConfig(
              'DEFAULT_STATUS_KEYWORD_REJECT_NON_HQ',
            ),
          );
          updateData = {
            keyword_approval: statusSet,
            non_hq_approver: credential?._id,
            need_review_after_edit: false,
          };
        }

        return await this.keywordModel
          .findOneAndUpdate(
            {
              $and: [{ _id: keywordID }],
            },
            updateData,
          )
          .then(async (res : any) => {
            res.bonus.map(async (bonusData) => {
              switch (bonusData?.bonus_type) {
                case 'direct_redeem':
                  const bonusDirectRedeem = plainToInstance(
                    KeywordDirectRedeem,
                    bonusData,
                  );
                  await this.serviceStock.delete_reserve_rejectByProduct(
                    res?._id,
                    bonusDirectRedeem?.merchandise,
                  );
                  break;
              }
            });

            await this.keywordNotificationModel.deleteMany({
              keyword: res?._id,
            });

            if (checkKeywordActive.notification.length > 0) {
              checkKeywordActive?.notification.map(async (notificationData) => {
                const updatedKeywordName =
                  notificationData.keyword_name.replace('-EDIT', '');
                const newNotification = new this.keywordNotificationModel({
                  keyword: res?._id,
                  ...notificationData,
                  keyword_name: updatedKeywordName,
                });

                await newNotification
                  .save()
                  .then(async (returning) => {
                    return returning;
                  })
                  .catch((e) => {
                    throw new Error(
                      e?.message ? e?.message : 'Internal Server Error',
                    );
                  });
              });
            }

            if (res && res.eligibility.name.endsWith('-EDIT')) {
              console.log('KEYWORD DUPLIKASI');
              //REPLACE TO INTIAL STOCK MAIN
              const newNameKeyword = res.eligibility.name.replace(/-EDIT$/, '');
              const KeywordMain = await this.keywordModel.findOne({
                'eligibility.name': newNameKeyword,
              });

              await this.keywordModel.findOneAndUpdate(
                {
                  _id: res?._id,
                },
                {
                  $set: {
                    'bonus.0.stock_location':
                      KeywordMain?.bonus[0]?.stock_location,
                  },
                },
              );
            }
            //COMENT CODE
            // else{
            //   const locationIds = res.bonus[0].stock_location.map(location => location.location_id);

            //   await this.keywordModel.updateMany(
            //     { _id: keywordID, "bonus.stock_location.location_id": { $in: locationIds } },
            //     { $set: { "bonus.$[].stock_location.$[elem].stock": 0 } },
            //     {
            //       arrayFilters: [{ "elem.location_id": { $in: locationIds } }],
            //       multi: true // Untuk memperbarui semua elemen yang cocok
            //     }
            //   );
            // }

            await new this.keywordApprovalLogModel({
              keyword: keywordID,
              processed_by: credential,
              status: statusSet,
              reason: reason,
            })
              .save()
              .catch((e: Error) => {
                throw new Error(e.message);
              });
            const superior_var = await this.detail(param);
            const credential_detail = await this.accountService.detail(
              credential?._id,
            );
            const trace_id = this.transactionOptional.getTracingId(
              res,
              response,
            );
            if (
              credential_detail.account_location.location_detail.name === 'HQ'
            ) {
              await this.sendKeywordApprovalNotificatioRejectedHQ(
                res,
                res,
                credential_detail,
                superior_var,
                reason,
                trace_id,
              );
            } else {
              await this.sendKeywordApprovalNotificatioRejectedNonHQ(
                res,
                res,
                credential_detail,
                superior_var,
                reason,
                trace_id,
              );
            }
            response.status = HttpStatus.OK;
            response.message = 'Keyword Reject';
            response.payload = {
              keyword: param,
              isHq: isHQ,
              status: statusSet,
            };
            return response;
          })
          .catch((e: Error) => {
            response.status = HttpStatus.BAD_REQUEST;
            response.message = 'Keyword failed to Reject';
            response.payload = param;
            throw new Error(e.message);
          });
      }
    } else {
      response.status = HttpStatus.FORBIDDEN;
      response.message = 'Only manager can approve keyword';
      response.payload = param;
    }
    return response;
  }

  async imageupload(
    data: ImageAuctionAddDTO,
    fileData: LocalFileDto,
  ): Promise<ImageAuctionDTOResponse> {
    const SERVER_URL = `${process.env.FILE_SERVE_URL}/v2/keyword/image-auction/`;
    const response = new ImageAuctionDTOResponse();
    if (response) {
      response.message = 'Image Upload Successfully';
      response.status = HttpStatus.OK;
      response.payload = `${SERVER_URL}${fileData.filename}`;
    } else {
      response.message = 'Image Upload Failed';
      response.status = HttpStatus.FORBIDDEN;
    }
    return response;
  }

  async get_keyword_by_program_id(params: string): Promise<any> {
    const data = await this.keywordModel.aggregate(
      [
        {
          $lookup: {
            from: 'keywordapprovallogs',
            let: { keyword_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$keyword', '$$keyword_id'] }],
                  },
                },
              },
              { $sort: { created_at: 1 } },
              {
                $lookup: {
                  from: 'lovs',
                  let: { status: '$status' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$_id', '$$status'] }],
                        },
                      },
                    },
                    {
                      $project: {
                        group_name: false,
                        created_at: false,
                        updated_at: false,
                        deleted_at: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'status',
                },
              },
              {
                $lookup: {
                  from: 'accounts',
                  let: { account: '$processed_by' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$_id', '$$account'] }],
                        },
                      },
                    },
                    {
                      $project: {
                        created_at: false,
                        updated_at: false,
                        deleted_at: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'processed_by',
                },
              },
              {
                $project: {
                  keyword: false,
                  __v: false,
                },
              },
            ],
            as: 'approval_log',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            let: { keyword_status: '$keyword_approval' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$_id', '$$keyword_status'] }],
                  },
                },
              },
            ],
            as: 'status',
          },
        },
        {
          $lookup: {
            from: 'accounts',
            let: { superior_hq_id: '$created_by.superior_hq' },
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
                              input: '$$superior_hq_id',
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
                $lookup: {
                  from: 'accountlocations',
                  let: { account: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$account', '$$account'] }],
                        },
                      },
                    },
                    {
                      $lookup: {
                        from: 'locations',
                        let: { location: '$location' },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [{ $eq: ['$_id', '$$location'] }],
                              },
                            },
                          },
                          {
                            $project: {
                              _id: false,
                            },
                          },
                        ],
                        as: 'location_detail',
                      },
                    },
                    {
                      $unwind: {
                        path: '$location_detail',
                        preserveNullAndEmptyArrays: true,
                      },
                    },
                    {
                      $project: {
                        _id: false,
                        account: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'account_location',
                },
              },
              {
                $unwind: {
                  path: '$account_location',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  created_at: false,
                  email: false,
                  role: false,
                  phone: false,
                  job_title: false,
                  job_level: false,
                  deleted_at: false,
                  type: false,
                  updated_at: false,
                  user_id: false,
                  superior_hq: false,
                  superior_local: false,
                  __v: false,
                },
              },
            ],
            as: 'created_by.superior_hq',
          },
        },
        {
          $unwind: {
            path: '$created_by.superior_hq',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'accounts',
            let: { superior_local_id: '$created_by.superior_local' },
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
                              input: '$$superior_local_id',
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
                $lookup: {
                  from: 'accountlocations',
                  let: { account: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [{ $eq: ['$account', '$$account'] }],
                        },
                      },
                    },
                    {
                      $lookup: {
                        from: 'locations',
                        let: { location: '$location' },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $and: [{ $eq: ['$_id', '$$location'] }],
                              },
                            },
                          },
                          {
                            $project: {
                              _id: false,
                            },
                          },
                        ],
                        as: 'location_detail',
                      },
                    },
                    {
                      $unwind: {
                        path: '$location_detail',
                        preserveNullAndEmptyArrays: true,
                      },
                    },
                    {
                      $project: {
                        _id: false,
                        account: false,
                        __v: false,
                      },
                    },
                  ],
                  as: 'account_location',
                },
              },
              {
                $unwind: {
                  path: '$account_location',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  created_at: false,
                  email: false,
                  role: false,
                  phone: false,
                  job_title: false,
                  job_level: false,
                  deleted_at: false,
                  type: false,
                  updated_at: false,
                  user_id: false,
                  superior_hq: false,
                  superior_local: false,
                  __v: false,
                },
              },
            ],
            as: 'created_by.superior_local',
          },
        },
        {
          $unwind: {
            path: '$created_by.superior_local',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $and: [
              { 'eligibility.program_id': params },
              { deleted_at: null },
              { keyword_edit: null },
              { 'eligibility.name': { $not: /-EDIT/ } },
            ],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
    return data;
  }

  async checkUniqueKeyword(params: string, keyword_id: string): Promise<any> {
    const response = new GlobalResponse();
    const containsEdit = params.includes('-EDIT');
    response.transaction_classify = 'CHECK_UNIQUE_KEYWORD_NAME';
    const keyword_check =
      (await this.keywordModel
        .findOne({
          keyword_edit: new mongoose.Types.ObjectId(keyword_id),
        })
        .exec()) === null;
    const check_verif = await this.lovModel.findOne({
      group_name: 'ELIGIBILITY_VERIFICATION',
      set_value: 'Keyword Verification',
    });
    if (keyword_id) {
      const checkKeywordName =
        (await this.keywordModel
          .findOne({
            _id: { $ne: new mongoose.Types.ObjectId(keyword_id) },
            'eligibility.name': params,
          })
          .exec()) === null;
      const checkKeywordRegis =
        (await this.programModel
          .findOne({ keyword_registration: params })
          .exec()) === null;
      if (checkKeywordName) {
        if (checkKeywordRegis) {
          if (!containsEdit) {
            const check_keyword_name = await this.keywordModel.findOne(
              { _id: new mongoose.Types.ObjectId(keyword_id) },
              { 'eligibility.name': 1 },
            );
            if (keyword_check) {
              console.log('=== KEYWORD CHECK ===', true);
              if (check_keyword_name?.eligibility?.name !== params) {
                response.message = 'YOU CAN USE THIS KEYWORD NAME';
                response.statusCode = HttpStatus.OK;
              } else {
                const checkNotificationKeywordVer =
                  (await this.keywordNotificationModel
                    .findOne({
                      keyword: { $ne: new mongoose.Types.ObjectId(keyword_id) },
                      keyword_name: params,
                    })
                    .exec()) === null;
                if (checkNotificationKeywordVer) {
                  response.message = 'YOU CAN USE THIS KEYWORD NAME';
                  response.statusCode = HttpStatus.OK;
                } else {
                  response.message =
                    'KEYWORD NAME NOTIFICATION IS ALREADY EXIST';
                  response.statusCode = HttpStatus.OK;
                }
              }
            } else {
              console.log('=== KEYWORD CHECK ===', false);
              if (check_keyword_name?.eligibility?.name !== params) {
                response.message = 'YOU CAN USE THIS KEYWORD NAME';
                response.statusCode = HttpStatus.OK;
              } else {
                const checkNotificationKeyword =
                  (await this.keywordNotificationModel
                    .findOne({
                      keyword: { $ne: new mongoose.Types.ObjectId(keyword_id) },
                      keyword_name: params,
                      code_identifier: check_verif?._id.toString(),
                    })
                    .exec()) === null;
                if (checkNotificationKeyword) {
                  response.message = 'YOU CAN USE THIS KEYWORD NAME';
                  response.statusCode = HttpStatus.OK;
                } else {
                  response.message =
                    'KEYWORD NAME NOTIFICATION IS ALREADY EXIST';
                  response.statusCode = HttpStatus.OK;
                }
              }
            }
          } else {
            response.message = 'YOU CAN USE THIS KEYWORD NAME';
            response.statusCode = HttpStatus.OK;
          }
        } else {
          response.message = 'KEYWORD REGISTRATION IN PROGRAM IS ALREADY EXIST';
          response.statusCode = HttpStatus.OK;
        }
      } else {
        response.message = 'KEYWORD NAME IS ALREADY EXIST';
        response.statusCode = HttpStatus.OK;
      }
    } else {
      const checkKeywordName =
        (await this.keywordModel
          .findOne({ 'eligibility.name': params })
          .exec()) === null;
      const checkKeywordRegis =
        (await this.programModel
          .findOne({ keyword_registration: params })
          .exec()) === null;
      if (checkKeywordName) {
        if (checkKeywordRegis) {
          const checkNotificationKeyword =
            (await this.keywordNotificationModel
              .findOne({ keyword_name: params })
              .exec()) === null;
          if (checkNotificationKeyword) {
            response.message = 'YOU CAN USE THIS KEYWORD NAME';
            response.statusCode = HttpStatus.OK;
          } else {
            response.message = 'KEYWORD NAME NOTIFICATION IS ALREADY EXIST';
            response.statusCode = HttpStatus.OK;
          }
        } else {
          response.message = 'KEYWORD REGISTRATION IN PROGRAM IS ALREADY EXIST';
          response.statusCode = HttpStatus.OK;
        }
      } else {
        response.message = 'KEYWORD NAME IS ALREADY EXIST';
        response.statusCode = HttpStatus.OK;
      }
    }
    return response;
  }

  async editisdraft(
    params: string,
    data: KeywordIsDraftEditDTO,
    account: Account,
  ): Promise<KeywordIsDraftEditDTOResponse> {
    const id = new mongoose.Types.ObjectId(params);
    const keywordFind = await this.keywordModel.findOne({ _id: id });
    //Handler Product Booked Not Reserve waiting status Actived
    for (const bonusData of keywordFind.bonus) {
      switch (bonusData?.bonus_type) {
        case 'direct_redeem':
          const bonusDirectRedeem = plainToInstance(
            KeywordDirectRedeem,
            bonusData,
          );
          for (const location of bonusDirectRedeem?.stock_location || []) {
            const checkStatusReserve =
              await this.serviceStock.getStockReserveByIdProduct(
                bonusDirectRedeem?.merchandise,
                'Booked',
                location?.stock,
              );
            console.log('=== CHECK STATUS RESERVE ===', checkStatusReserve);
            if (checkStatusReserve) {
              throw new Error(
                `Merchandise has been used for keywords and is still in the keyword approval process`,
              );
            }
          }

          //Jika Stock 0 di remaining merchandise
          for (const location of bonusDirectRedeem?.stock_location || []) {
            const checkStatusReserve =
              await this.serviceStock.getStockReserveByIdProduct(
                bonusDirectRedeem?.merchandise,
                'Actived',
                location?.stock,
              );
            console.log('=== CHECK STATUS RESERVE ===', checkStatusReserve);
            if (checkStatusReserve) {
              throw new Error(`Merchandise stock has run out`);
            }
          }
          break;
      }
    }
    const process = this.keywordModel
      .findOneAndUpdate(
        { _id: id },
        {
          is_draft: data.is_draft,
          need_review_after_edit: false,
          updated_at: Date.now(),
        },
      )
      .then((result) => {
        result.bonus.map(async (bonusData) => {
          switch (bonusData?.bonus_type) {
            case 'direct_redeem':
              const bonusDirectRedeem = plainToInstance(
                KeywordDirectRedeem,
                bonusData,
              );
              bonusDirectRedeem?.stock_location?.map(async (location) => {
                // if (location['name'] !== 'HQ') {
                const payloadReserve = new StockReserveDTO();
                payloadReserve.keyword = result?._id?.toString();
                payloadReserve.destination_location = location?.location_id;
                payloadReserve.product = bonusDirectRedeem?.merchandise;
                payloadReserve.qty = location?.stock;
                payloadReserve.origin_location = null;
                try {
                  const locationHQ = await this.serviceStock.getLocationHQ();
                  payloadReserve.origin_location = locationHQ?._id.toString();
                  const a =
                    await this.serviceStock.reserve_process_with_keyword(
                      payloadReserve,
                      account,
                    );
                } catch (error) {
                  console.log('<-- Step :: reserve_process_with_keyword -->');
                  console.log(
                    error?.message ?? 'Fail -> reserve_process_with_keyword',
                  );
                  console.log('<-- Step :: reserve_process_with_keyword -->');
                }
              });
              break;
          }
        });
        return result;
      });

    const response = new KeywordIsDraftEditDTOResponse();
    if (process) {
      response.message = 'Keyword Is Draft Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = data;
    } else {
      response.message = 'Keyword Is Draft Failed to Updated';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  // async getkeywordProfile(name: string): Promise<any> {
  //   const data = await this.keywordModel.aggregate(
  //     [
  //       {
  //         $lookup: {
  //           from: 'lovs',
  //           let: { keyword_approval_id: '$keyword_approval' },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: {
  //                   $and: [
  //                     {
  //                       $eq: [
  //                         '$_id',
  //                         {
  //                           $convert: {
  //                             input: '$$keyword_approval_id',
  //                             to: 'objectId',
  //                             onNull: '',
  //                             onError: '',
  //                           },
  //                         },
  //                       ],
  //                     },
  //                   ],
  //                 },
  //               },
  //             },
  //           ],
  //           as: 'eligibility.keyword_approval_info',
  //         },
  //       },
  //       {
  //         $unwind: {
  //           path: '$eligibility.keyword_approval_info',
  //         },
  //       },
  //       {
  //         $match: {
  //           $and: [{ deleted_at: null }, { 'eligibility.name': name }],
  //         },
  //       },
  //     ],
  //     (err, result) => {
  //       return result;
  //     },
  //   );
  //   return data[0].eligibility;
  // }

  async getkeywordProfile(name: string, full = false): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.KEYWORD_KEY2}-profile-${name}`;
    const redisProgram: any = await this.cacheManager.get(key);
    let result = null;

    if (redisProgram) {
      result = redisProgram;

      console.log(
        `REDIS|Load keyword_profile ${name} from Redis|${Date.now() - now}`,
      );
    } else {
      const data = await this.keywordModel.aggregate(
        [
          {
            $lookup: {
              from: 'lovs',
              let: { keyword_approval_id: '$keyword_approval' },
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
                                input: '$$keyword_approval_id',
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
              ],
              as: 'eligibility.keyword_approval_info',
            },
          },
          {
            $unwind: {
              path: '$eligibility.keyword_approval_info',
            },
          },
          {
            $match: {
              $and: [{ deleted_at: null }, { 'eligibility.name': name }],
            },
          },
        ],
        (err, result) => {
          return result;
        },
      );

      console.log(
        `REDIS|Load keyword_profile ${name} from Redis|${Date.now() - now}`,
      );

      if (data) {
        await this.cacheManager.set(key, data, { ttl: 60 * 15 });
        result = data;
      }
    }

    if (full) {
      return result?.[0];
    }

    return result?.[0]?.eligibility;
  }

  async getKeywordByID(id: any): Promise<Keyword> {
    return await this.keywordModel.findById(id);
  }

  async updateKeywordById(find: any, update: any): Promise<Keyword> {
    return await this.keywordModel.findOneAndUpdate(find, update);
  }

  async getKeywordCustomParams(params: any): Promise<Keyword> {
    return this.keywordModel.findOne(params);
  }

  async getKeywordWhere(obj: any): Promise<Keyword> {
    obj = { ...obj, deleted_at: null };
    return await this.keywordModel.findOne(obj);
  }

  async listRewardCatalogXml(filter: RewardCatalogFilterDTO): Promise<any> {
    const query: any = {};
    const projection: any = {
      eligibility: false,
      bonus: false,
      notification: false,
      created_by: false,
    };

    if (filter.keyword) {
      query['reward_catalog.keyword'] = filter.keyword;
    }

    if (filter.category) {
      query['reward_catalog.category'] = filter.category;
    }

    if (filter.merchant_id) {
      query['reward_catalog.merchant_id'] = filter.merchant_id;
    }

    const match: any = {
      $or: [
        { hq_approver: { $exists: true } },
        { hq_approver: { $exists: false } },
      ],
    };

    let data;

    if (filter.keyword && filter.category && filter.merchant_id) {
      data = await this.keywordModel
        .aggregate([
          {
            $match: {
              'reward_catalog.keyword': filter.keyword,
              'reward_catalog.category': filter.category,
              'reward_catalog.merchant_id': filter.merchant_id,
            },
          },
          {
            $match: match,
          },
          {
            $project: projection,
          },
        ])
        .exec();
    } else if (filter.keyword && filter.category) {
      data = await this.keywordModel
        .aggregate([
          {
            $match: {
              'reward_catalog.keyword': filter.keyword,
              'reward_catalog.category': filter.category,
            },
          },
          {
            $match: match,
          },
          {
            $project: projection,
          },
        ])
        .exec();
    } else if (filter.keyword && filter.merchant_id) {
      data = await this.keywordModel
        .aggregate([
          {
            $match: {
              'reward_catalog.keyword': filter.keyword,
              'reward_catalog.merchant_id': filter.merchant_id,
            },
          },
          {
            $match: match,
          },
          {
            $project: projection,
          },
        ])
        .exec();
    } else if (filter.category && filter.merchant_id) {
      data = await this.keywordModel
        .aggregate([
          {
            $match: {
              'reward_catalog.category': filter.category,
              'reward_catalog.merchant_id': filter.merchant_id,
            },
          },
          {
            $match: match,
          },
          {
            $project: projection,
          },
        ])
        .exec();
    } else {
      data = await this.keywordModel.find({ ...query }, projection).exec();
    }

    const rewardCatalog = data.map((i, index) => {
      const num = index + 1;
      const appliedOn = {};
      const specialAppliedOn = {}; // Initialize specialAppliedOn as an empty object
      let catalog_type = {};
      let catalog_display = {};
      let channel = {};
      let province = {};
      let city = {};
      let approval;
      let is_corporate;
      if (Array.isArray(i.reward_catalog.applied_on)) {
        i.reward_catalog.applied_on.forEach((applied) => {
          if (applied === 'kartuAS') {
            appliedOn['IS_AS'] = 1;
          }
          if (applied === 'kartuHALO') {
            appliedOn['IS_HALO'] = 1;
          }
          if (applied === 'simPATI') {
            appliedOn['IS_SIMPATI'] = 1;
          }
          if (applied === 'Loop') {
            appliedOn['IS_LOOP'] = 1;
          }
        });

        if (!appliedOn['IS_HALO']) {
          appliedOn['IS_HALO'] = 0;
        }
        if (!appliedOn['IS_AS']) {
          appliedOn['IS_AS'] = 0;
        }
        if (!appliedOn['IS_SIMPATI']) {
          appliedOn['IS_SIMPATI'] = 0;
        }
        if (!appliedOn['IS_LOOP']) {
          appliedOn['IS_LOOP'] = 0;
        }
      }

      if (Array.isArray(i.reward_catalog.special_applied_on)) {
        i.reward_catalog.special_applied_on.forEach((special_applied) => {
          if (special_applied === 'kartuAS') {
            specialAppliedOn['SPECIAL_AS'] = 1;
          }
          if (special_applied === 'kartuHALO') {
            specialAppliedOn['SPECIAL_HALO'] = 1;
          }
          if (special_applied === 'simPATI') {
            specialAppliedOn['SPECIAL_SIMPATI'] = 1;
          }
          if (special_applied === 'Loop') {
            specialAppliedOn['SPECIAL_LOOP'] = 1;
          }
        });

        if (!specialAppliedOn['SPECIAL_HALO']) {
          specialAppliedOn['SPECIAL_HALO'] = 0;
        }
        if (!specialAppliedOn['SPECIAL_AS']) {
          specialAppliedOn['SPECIAL_AS'] = 0;
        }
        if (!specialAppliedOn['SPECIAL_SIMPATI']) {
          specialAppliedOn['SPECIAL_SIMPATI'] = 0;
        }
        if (!specialAppliedOn['SPECIAL_LOOP']) {
          specialAppliedOn['SPECIAL_LOOP'] = 0;
        }
      }

      if (
        i.reward_catalog.catalog_type ||
        i.reward_catalog.catalog_display ||
        i.reward_catalog.channel
      ) {
        catalog_type = i.reward_catalog.catalog_type.join(',');
        catalog_display = i.reward_catalog.catalog_display.join(',');
        channel = i.reward_catalog.channel.join(',');
      }

      if (i.reward_catalog.province || i.reward_catalog.city) {
        province = i.reward_catalog.province.join(',');
        city = i.reward_catalog.city.join(',');
      }

      if (i.reward_catalog.enable_for_corporate_subs == 'Both') {
        is_corporate = 1;
      } else {
        is_corporate = 0;
      }

      if (i.hq_approver) {
        approval = 1;
      } else {
        approval = 0;
      }
      const startPeriod = moment.tz(i.reward_catalog.effective, 'Asia/Jakarta');
      const endPeriod = moment.tz(i.reward_catalog.to, 'Asia/Jakarta');

      return {
        ROW: {
          '@num': num,
          APPROVAL: approval,
          KEYWORD: i.reward_catalog.keyword ? i.reward_catalog.keyword : '',
          MERCHANT_ID: i.reward_catalog.merchant_id
            ? i.reward_catalog.merchant_id
            : '',
          HASHTAG: i.reward_catalog.hashtag_1 ?? '',
          TITLE: i.reward_catalog.title ?? i.reward_catalog.title ?? '',
          TEASER: i.reward_catalog.teaser ?? '',
          TEASER_EN: i.reward_catalog.teaser ?? '',
          DESCRIPTION: i.reward_catalog.description ?? '',
          DESCRIPTION_EN: i.reward_catalog.description_en ?? '',
          FAQ: i.reward_catalog.title ?? '',
          FAQ_EN: i.reward_catalog.faq_en ?? '',
          HOW_TO_REDEEM: i.reward_catalog.how_to_redeem ?? '',
          HOW_TO_REDEEM_EN: i.reward_catalog.how_to_redeem_en ?? '',
          EVENT_PERIOD: `${startPeriod.format(
            'DD MMM YYYY',
          )} sd ${endPeriod.format('DD MMM YYYY')}`,
          EXPIRY_PERIOD: moment(i.reward_catalog.to).format('YYYY-MM-DD') ?? '',
          POIN: i.reward_catalog.point_keyword,
          POIN_MARK_UP: '',
          ...appliedOn,
          ...specialAppliedOn,
          IS_CORPORATE:
            i.reward_catalog.enable_for_corporate_subs === 'Both' ? 1 : 0,
          IMAGE_PROMO_LOC: i.reward_catalog.image_promo ?? '',
          IMAGE_DETAIL_LOC: i.reward_catalog.image_detail ?? '',
          IMAGE_DETAIL1_LOC: i.reward_catalog.image_detail_1 ?? '',
          IMAGE_DETAIL2_LOC: i.reward_catalog.image_detail_2 ?? '',
          IMAGE_DETAIL3_LOC: i.reward_catalog.image_detail_3 ?? '',
          IMAGE_SMALL: i.reward_catalog.image_small ?? '',
          IMAGE_MEDIUM: i.reward_catalog.image_medium ?? '',
          IMAGE_LARGE: i.reward_catalog.image_large ?? '',
          PROVINCE: province ?? '',
          CITY: city ?? '',
          VIDEO: i.reward_catalog.video,
          GOOGLE_MAPS: i.reward_catalog.google_maps,
          HOT_PROMO: i.reward_catalog.hot_promo ? 1 : 0,
          SORT_HOT_PROMO: i.reward_catalog.hot_promo ? 1 : 0,
          CATALOGTYPE: i.reward_catalog.catalog_type ? catalog_type : '',
          DISPLAYTYPE: i.reward_catalog.catalog_display ? catalog_display : '',
          CHANNEL: channel ?? '',
          STOCK: i.reward_catalog.stock ?? '',
          CATEGORY: i.reward_catalog.category ? i.reward_catalog.category : '',
          CREATED_DATE:
            moment(i.reward_catalog.created_at).format('YYYY-MM-DD') ?? '',
          UPDATED_DATE:
            moment(i.reward_catalog.updated_at).format('YYYY-MM-DD') ?? '',
        },
      };
    });

    const rowset = { REWARD_CATALOG: { ROWSET: rewardCatalog } };
    const root = { ROOT: rowset };
    const doc = xmlCreate(root, { headless: true });

    const path = './reward-catalog.xml';
    const buffer = doc.end({ pretty: true });
    writeFileSync(path, buffer, { flag: 'a' });

    return {
      message: `File Saved at ${path}`,
    };
    // return {
    //   message: HttpStatus.OK,
    //   payload: {
    //     data: data,
    //   },
    // };
  }

  async sendKeywordApprovalNotificationHQ(
    keywordData,
    detail,
    createdBy,
    superiorVar,
    trace_id,
  ) {
    const getNotificationTemplate =
      await this.notificationService.getDetailbyName(
        NotificationTemplateConfig.APPROVAL_KEYWORD,
      );
    if (!getNotificationTemplate) {
      throw new Error('Notification template not found');
    }

    const startPeriodString = moment(
      keywordData.eligibility.start_period,
    ).format('DD-MM-YY');
    const endPeriodString = moment(keywordData.eligibility.end_period).format(
      'DD-MM-YY',
    );
    const getProgramMain = await this.programModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail?.eligibility?.program_id?.toString(),
      ),
    });
    const getProgramOwner = await this.lovService.getLovDetail(
      getProgramMain?.program_owner?.toString(),
    );
    const getProgramExperience = await this.lovModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail.eligibility.program_experience[0],
      ),
    });
    const subject = getNotificationTemplate.notif_content.substring(
      0,
      getNotificationTemplate.notif_content.indexOf('\n\n'),
    );
    const Content = getNotificationTemplate.notif_content.substring(
      getNotificationTemplate.notif_content.indexOf('\n') + 1,
    );
    const subjectWithValues = subject.replace(
      '[keywordName]',
      keywordData.eligibility.name,
    );
    const ContentWithValues = Content.replace(
      '[keywordCreator]',
      superiorVar.created_by.first_name,
    )
      .replace('[keywordPeriod]', `${startPeriodString} s/d ${endPeriodString}`)
      .replace('[keywordName]', keywordData?.eligibility?.name)
      .replace('[programOwner]', getProgramOwner?.set_value)
      .replace('[programExperience]', getProgramExperience?.set_value);

    const payload = new NotificationFirebaseAddDto();
    (payload.tracing_id = trace_id.replace('SLO', 'TRX')),
      (payload.tracing_master_id = trace_id.replace('SLO', 'TRX'));
    (payload.title = subjectWithValues.replace('Subject: ', '')),
      (payload.content = ContentWithValues.replace(
        '\nBody Email/Content: ',
        '',
      )),
      (payload.keyword_id = detail?._id?.toString()),
      (payload.is_read = false),
      (payload.receiver_id = superiorVar?.created_by?.superior_hq?._id);
    payload.receiver_name = superiorVar?.created_by?.superior_hq?.first_name;
    payload.receiver_email = superiorVar?.created_by?.superior_hq?.email;
    payload.sender_id = superiorVar?.created_by?._id;
    payload.sender_name = superiorVar?.created_by?.first_name;
    payload.created_by = createdBy;
    try {
      console.log('=== SEND NOTIFICATION :: SUCCESS ===');
      await this.notificationService.notificationfirebase(payload);
      const messageBuild = new NotificationGeneralMessageBuild();
      const message = await messageBuild.buildMessageFromProgram(payload);
      console.log(message);
      await this.emitToGeneralNotification(message);
      console.log('=== SEND NOTIFICATION :: SUCCESS ===');
    } catch (e) {
      console.log('=== SEND NOTIFICATION :: ERROR ===');
      console.log(e);
      console.log('=== SEND NOTIFICATION :: ERROR ===');
      throw new Error(e.message);
    }
  }

  async sendKeywordApprovalNotificationNonHQ(
    keywordData,
    detail,
    createdBy,
    superiorVar,
    trace_id,
  ) {
    const getNotificationTemplate =
      await this.notificationService.getDetailbyName(
        NotificationTemplateConfig.APPROVAL_KEYWORD,
      );
    if (!getNotificationTemplate) {
      throw new Error('Notification template not found');
    }

    const startPeriodString = moment(
      keywordData.eligibility.start_period,
    ).format('DD-MM-YY');
    const endPeriodString = moment(keywordData.eligibility.end_period).format(
      'DD-MM-YY',
    );
    const getProgramMain = await this.programModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail?.eligibility?.program_id?.toString(),
      ),
    });
    const getProgramOwner = await this.lovService.getLovDetail(
      getProgramMain?.program_owner?.toString(),
    );
    const getProgramExperience = await this.lovModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail.eligibility.program_experience[0],
      ),
    });
    const subject = getNotificationTemplate.notif_content.substring(
      0,
      getNotificationTemplate.notif_content.indexOf('\n\n'),
    );
    const Content = getNotificationTemplate.notif_content.substring(
      getNotificationTemplate.notif_content.indexOf('\n') + 1,
    );
    const subjectWithValues = subject.replace(
      '[keywordName]',
      keywordData.eligibility.name,
    );
    const ContentWithValues = Content.replace(
      '[keywordCreator]',
      superiorVar.created_by.first_name,
    )
      .replace('[keywordPeriod]', `${startPeriodString} s/d ${endPeriodString}`)
      .replace('[keywordName]', keywordData?.eligibility?.name)
      .replace('[programOwner]', getProgramOwner?.set_value)
      .replace('[programExperience]', getProgramExperience?.set_value);

    const payload = new NotificationFirebaseAddDto();
    (payload.tracing_id = trace_id.replace('SLO', 'TRX')),
      (payload.tracing_master_id = trace_id.replace('SLO', 'TRX'));
    (payload.title = subjectWithValues.replace('Subject: ', '')),
      (payload.content = ContentWithValues.replace(
        '\nBody Email/Content: ',
        '',
      )),
      (payload.keyword_id = detail?._id?.toString()),
      (payload.is_read = false),
      (payload.receiver_id = superiorVar?.created_by?.superior_local?._id);
    payload.receiver_name = superiorVar?.created_by?.superior_local?.first_name;
    payload.receiver_email = superiorVar?.created_by?.superior_local?.email;
    payload.sender_id = superiorVar?.created_by?._id;
    payload.sender_name = superiorVar?.created_by?.first_name;
    payload.created_by = createdBy;
    try {
      await this.notificationService.notificationfirebase(payload);
      const messageBuild = new NotificationGeneralMessageBuild();
      const message = await messageBuild.buildMessageFromProgram(payload);
      await this.emitToGeneralNotification(message);
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async sendKeywordApprovalNotificatioApprovedHQ(
    keywordData,
    detail,
    createdBy,
    superiorVar,
    reason,
    trace_id,
  ) {
    const getNotificationTemplate =
      await this.notificationService.getDetailbyName(
        NotificationTemplateConfig.APPROVAL_KEYWORD_APPROVED,
      );
    if (!getNotificationTemplate) {
      throw new Error('Notification template not found');
    }

    const startPeriodString = moment(
      keywordData.eligibility.start_period,
    ).format('DD-MM-YY');
    const endPeriodString = moment(keywordData.eligibility.end_period).format(
      'DD-MM-YY',
    );
    const getProgramMain = await this.programModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail?.eligibility?.program_id?.toString(),
      ),
    });
    const getProgramOwner = await this.lovService.getLovDetail(
      getProgramMain?.program_owner?.toString(),
    );
    const getProgramExperience = await this.lovModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail.eligibility.program_experience[0],
      ),
    });
    const subject = getNotificationTemplate.notif_content.substring(
      0,
      getNotificationTemplate.notif_content.indexOf('\n'),
    );
    const Content = getNotificationTemplate.notif_content.substring(
      getNotificationTemplate.notif_content.indexOf('\n') + 1,
    );
    const subjectWithValues = subject.replace(
      '[keywordName]',
      keywordData.eligibility.name,
    );
    const ContentWithValues = Content.replace('[ApprovalNotes]', reason)
      .replace('[programName]', getProgramMain.name)
      .replace('[keywordCreator]', superiorVar.created_by.first_name)
      .replace('[keywordPeriod]', `${startPeriodString} s/d ${endPeriodString}`)
      .replace('[keywordName]', keywordData.eligibility.name)
      .replace('[programOwner]', getProgramOwner?.set_value)
      .replace('[programExperience]', getProgramExperience?.set_value);

    const payload = new NotificationFirebaseAddDto();
    (payload.tracing_id = trace_id.replace('SLO', 'TRX')),
      (payload.tracing_master_id = trace_id.replace('SLO', 'TRX'));
    (payload.title = subjectWithValues.replace('Subject: ', '')),
      (payload.content = ContentWithValues.replace(
        '\nBody Email/Content: \n',
        '',
      )),
      (payload.keyword_id = detail?._id?.toString()),
      (payload.is_read = false),
      (payload.receiver_id = superiorVar?.created_by?._id);
    payload.receiver_name = superiorVar?.created_by?.first_name;
    payload.receiver_email = superiorVar?.created_by?.email;
    payload.sender_id = createdBy?._id;
    payload.sender_name = createdBy?.first_name;
    payload.created_by = createdBy;
    try {
      await this.notificationService.notificationfirebase(payload);
      const messageBuild = new NotificationGeneralMessageBuild();
      const message = await messageBuild.buildMessageFromProgram(payload);
      await this.emitToGeneralNotification(message);
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async sendKeywordApprovalNotificatioApprovedNonHQ(
    keywordData,
    detail,
    createdBy,
    superiorVar,
    reason,
    trace_id,
  ) {
    const getNotificationTemplate =
      await this.notificationService.getDetailbyName(
        NotificationTemplateConfig.APPROVAL_KEYWORD_APPROVED,
      );
    if (!getNotificationTemplate) {
      throw new Error('Notification template not found');
    }
    const startPeriodString = moment(
      keywordData.eligibility.start_period,
    ).format('DD-MM-YY');
    const endPeriodString = moment(keywordData.eligibility.end_period).format(
      'DD-MM-YY',
    );
    const getProgramMain = await this.programModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail?.eligibility?.program_id?.toString(),
      ),
    });
    const getProgramOwner = await this.lovService.getLovDetail(
      getProgramMain?.program_owner?.toString(),
    );
    const getProgramExperience = await this.lovModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail.eligibility.program_experience[0],
      ),
    });
    const subject = getNotificationTemplate.notif_content.substring(
      0,
      getNotificationTemplate.notif_content.indexOf('\n'),
    );
    const Content = getNotificationTemplate.notif_content.substring(
      getNotificationTemplate.notif_content.indexOf('\n') + 1,
    );
    const subjectWithValues = subject.replace(
      '[keywordName]',
      keywordData.eligibility.name,
    );
    const ContentWithValues = Content.replace('[ApprovalNotes]', reason)
      .replace('[programName]', getProgramMain.name)
      .replace('[keywordCreator]', superiorVar.created_by.first_name)
      .replace('[keywordPeriod]', `${startPeriodString} s/d ${endPeriodString}`)
      .replace('[keywordName]', keywordData.eligibility.name)
      .replace('[programOwner]', getProgramOwner?.set_value)
      .replace('[programExperience]', getProgramExperience?.set_value);

    const payload = new NotificationFirebaseAddDto();
    (payload.tracing_id = trace_id.replace('SLO', 'TRX')),
      (payload.tracing_master_id = trace_id.replace('SLO', 'TRX'));
    (payload.title = subjectWithValues.replace('Subject: ', '')),
      (payload.content = ContentWithValues.replace(
        '\nBody Email/Content: \n',
        '',
      )),
      (payload.keyword_id = detail?._id?.toString()),
      (payload.is_read = false),
      (payload.receiver_id = superiorVar?.created_by?.superior_hq?._id);
    payload.receiver_name = superiorVar?.created_by?.superior_hq?.first_name;
    payload.receiver_email = superiorVar?.created_by?.superior_hq?.email;
    payload.sender_id = createdBy?._id;
    payload.sender_name = createdBy?.first_name;
    payload.created_by = createdBy;
    try {
      await this.notificationService.notificationfirebase(payload);
      const messageBuild = new NotificationGeneralMessageBuild();
      const message = await messageBuild.buildMessageFromProgram(payload);
      await this.emitToGeneralNotification(message);
    } catch (e) {
      throw new Error(e.message);
    }
    // if (detail.non_hq_approver) {
    // }
    // if (detail.hq_approver) {
    //   (payload.title = subjectWithValues.replace('Subject: ', '')),
    //     (payload.content = ContentWithValues.replace(
    //       '\nBody Email/Content: \n',
    //       '',
    //     )),
    //     (payload.keyword_id = detail._id.toString()),
    //     (payload.is_read = false),
    //     (payload.receiver_id = superiorVar.created_by._id);
    //   payload.receiver_name = superiorVar.created_by.first_name;
    //   payload.receiver_email = superiorVar.created_by.email;
    //   payload.sender_id = createdBy._id;
    //   payload.sender_name = createdBy.first_name;
    //   payload.created_by = createdBy;
    //   try {
    //     await this.notificationService.notificationfirebase(payload);
    //     const messageBuild = new NotificationGeneralMessageBuild();
    //     const message = await messageBuild.buildMessageFromProgram(payload);
    //     await this.emitToGeneralNotification(message);
    //   } catch (e) {
    //     throw new Error(e.message);
    //   }
    // }
  }

  async sendKeywordApprovalNotificatioRejectedHQ(
    keywordData,
    detail,
    createdBy,
    superiorVar,
    reason,
    trace_id,
  ) {
    const getNotificationTemplate =
      await this.notificationService.getDetailbyName(
        NotificationTemplateConfig.APPROVAL_KEYWORD_REJECTED,
      );
    if (!getNotificationTemplate) {
      throw new Error('Notification template not found');
    }

    const startPeriodString = moment(
      keywordData.eligibility.start_period,
    ).format('DD-MM-YY');
    const endPeriodString = moment(keywordData.eligibility.end_period).format(
      'DD-MM-YY',
    );
    const getProgramMain = await this.programModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail?.eligibility?.program_id?.toString(),
      ),
    });
    const getProgramOwner = await this.lovService.getLovDetail(
      getProgramMain?.program_owner?.toString(),
    );
    const getProgramExperience = await this.lovModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail.eligibility.program_experience[0],
      ),
    });
    const subject = getNotificationTemplate.notif_content.substring(
      0,
      getNotificationTemplate.notif_content.indexOf('\n'),
    );
    const Content = getNotificationTemplate.notif_content.substring(
      getNotificationTemplate.notif_content.indexOf('\n') + 1,
    );
    const subjectWithValues = subject.replace(
      '[keywordName]',
      keywordData.eligibility.name,
    );
    const ContentWithValues = Content.replace('[ApprovalNotes]', reason)
      .replace('[programName]', getProgramMain.name)
      .replace('[keywordCreator]', superiorVar.created_by.first_name)
      .replace('[keywordPeriod]', `${startPeriodString} s/d ${endPeriodString}`)
      .replace('[keywordName]', keywordData.eligibility.name)
      .replace('[programOwner]', getProgramOwner?.set_value)
      .replace('[programExperience]', getProgramExperience?.set_value);
    const payload = new NotificationFirebaseAddDto();
    (payload.tracing_id = trace_id.replace('SLO', 'TRX')),
      (payload.tracing_master_id = trace_id.replace('SLO', 'TRX'));
    (payload.title = subjectWithValues.replace('Subject: ', '')),
      (payload.content = ContentWithValues.replace(
        '\nBody Email/Content: \n',
        '',
      )),
      (payload.keyword_id = detail?._id?.toString()),
      (payload.is_read = false),
      (payload.receiver_id = superiorVar?.created_by?._id);
    payload.receiver_name = superiorVar?.created_by?.first_name;
    payload.receiver_email = superiorVar?.created_by?.email;
    payload.sender_id = createdBy?._id;
    payload.sender_name = createdBy?.first_name;
    payload.created_by = createdBy;
    try {
      await this.notificationService.notificationfirebase(payload);
      const messageBuild = new NotificationGeneralMessageBuild();
      const message = await messageBuild.buildMessageFromProgram(payload);
      await this.emitToGeneralNotification(message);
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async sendKeywordApprovalNotificatioRejectedNonHQ(
    keywordData,
    detail,
    createdBy,
    superiorVar,
    reason,
    trace_id,
  ) {
    const getNotificationTemplate =
      await this.notificationService.getDetailbyName(
        NotificationTemplateConfig.APPROVAL_KEYWORD_REJECTED,
      );
    if (!getNotificationTemplate) {
      throw new Error('Notification template not found');
    }
    const startPeriodString = moment(
      keywordData.eligibility.start_period,
    ).format('DD-MM-YY');
    const endPeriodString = moment(keywordData.eligibility.end_period).format(
      'DD-MM-YY',
    );
    const getProgramMain = await this.programModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail?.eligibility?.program_id?.toString(),
      ),
    });
    const getProgramOwner = await this.lovService.getLovDetail(
      getProgramMain?.program_owner?.toString(),
    );
    const getProgramExperience = await this.lovModel.findOne({
      _id: new mongoose.Types.ObjectId(
        detail.eligibility.program_experience[0],
      ),
    });
    const subject = getNotificationTemplate.notif_content.substring(
      0,
      getNotificationTemplate.notif_content.indexOf('\n'),
    );
    const Content = getNotificationTemplate.notif_content.substring(
      getNotificationTemplate.notif_content.indexOf('\n') + 1,
    );
    const subjectWithValues = subject.replace(
      '[keywordName]',
      keywordData.eligibility.name,
    );
    const ContentWithValues = Content.replace('[ApprovalNotes]', reason)
      .replace('[programName]', getProgramMain.name)
      .replace('[keywordCreator]', superiorVar.created_by.first_name)
      .replace('[keywordPeriod]', `${startPeriodString} s/d ${endPeriodString}`)
      .replace('[keywordName]', keywordData.eligibility.name)
      .replace('[programOwner]', getProgramOwner?.set_value)
      .replace('[programExperience]', getProgramExperience?.set_value);

    const payload = new NotificationFirebaseAddDto();
    (payload.tracing_id = trace_id.replace('SLO', 'TRX')),
      (payload.tracing_master_id = trace_id.replace('SLO', 'TRX'));
    (payload.title = subjectWithValues.replace('Subject: ', '')),
      (payload.content = ContentWithValues.replace(
        '\nBody Email/Content: \n',
        '',
      )),
      (payload.keyword_id = detail?._id?.toString()),
      (payload.is_read = false),
      (payload.receiver_id = superiorVar?.created_by?.superior_hq?._id);
    payload.receiver_name = superiorVar?.created_by?.superior_hq?.first_name;
    payload.receiver_email = superiorVar?.created_by?.superior_hq?.email;
    payload.sender_id = createdBy?._id;
    payload.sender_name = createdBy?.first_name;
    payload.created_by = createdBy;
    try {
      await this.notificationService.notificationfirebase(payload);
      const messageBuild = new NotificationGeneralMessageBuild();
      const message = await messageBuild.buildMessageFromProgram(payload);
      await this.emitToGeneralNotification(message);
    } catch (e) {
      throw new Error(e.message);
    }
    // if (detail.non_hq_approver) {
    // }
    // if (detail.hq_approver) {
    //   (payload.title = subjectWithValues.replace('Subject: ', '')),
    //     (payload.content = ContentWithValues.replace(
    //       '\nBody Email/Content: \n',
    //       '',
    //     )),
    //     (payload.keyword_id = detail._id.toString()),
    //     (payload.is_read = false),
    //     (payload.receiver_id = superiorVar.created_by._id);
    //   payload.receiver_name = superiorVar.created_by.first_name;
    //   payload.receiver_email = superiorVar.created_by.email;
    //   payload.sender_id = createdBy._id;
    //   payload.sender_name = createdBy.first_name;
    //   payload.created_by = createdBy;
    //   try {
    //     await this.notificationService.notificationfirebase(payload);
    //     const messageBuild = new NotificationGeneralMessageBuild();
    //     const message = await messageBuild.buildMessageFromProgram(payload);
    //     await this.emitToGeneralNotification(message);
    //   } catch (e) {
    //     throw new Error(e.message);
    //   }
    // }
  }

  async emitToGeneralNotification(payload: NotificationNonTransactionDto) {
    const messageString = JSON.stringify(payload);
    await this.notificationGeneralClient.emit(
      'notification_general',
      messageString,
    );
  }

  async uploadImageRewardCatalog(
    data: KeywordUploadFileDto,
    fileData: LocalFileDto,
  ): Promise<ImageAuctionDTOResponse> {
    const response = new ImageAuctionDTOResponse();
    const fileExtension = fileData.filename.split('.').pop();
    const identifier: any = data.identifier;

    const dir_path = await this.systemConfigModel
      .findOne({
        param_key: identifier,
      })
      .exec();
    if (!dir_path) {
      response.message = 'Path not found';
      response.status = HttpStatus.FORBIDDEN;
      return response;
    }

    // if (!dir_path.additional_value) {
    //   response.message = 'config path local not found';
    //   response.status = HttpStatus.FORBIDDEN;
    //   return response;
    // }

    // fileData = await this.uploadToLocalProcess(fileData, dir_path.additional_value.path_local);

    const fileAndPath = `${dir_path.param_value}${fileData.filename}`;
    const sftpConfig: any = {
      label: 'image_promo',
      host: this.configService.get<string>('reward_catalog_tsel.host'),
      port: this.configService.get<number>('reward_catalog_tsel.port'),
      username: this.configService.get<string>('reward_catalog_tsel.username'),
      fileAndPath: fileAndPath,
    };

    if (
      this.configService.get<string>('reward_catalog_tsel.password') &&
      this.configService.get<string>('reward_catalog_tsel.password') !== ''
    ) {
      sftpConfig.password = this.configService.get<string>(
        'reward_catalog_tsel.password',
      );
    }

    if (
      this.configService.get<string>('reward_catalog_tsel.key') &&
      this.configService.get<string>('reward_catalog_tsel.key') !== ''
    ) {
      sftpConfig.sshKey = this.configService.get<string>(
        'reward_catalog_tsel.key',
      );
    }

    const sftpPayload = {
      generated_file: fileData.path,
      use_timestamp: false,
      file_extension: fileExtension,
      server_destination: [sftpConfig],
    };

    console.log('Upload Data ', sftpPayload);
    const numberOfRetrySftp = await this.getConfigRetrySftp();
    const sendSftp = await this.sftpService.sftpOutgoingImageWithRetry(
      sftpPayload,
      numberOfRetrySftp,
    );
    if (sendSftp) {
      response.message = 'Image Upload Successfully';
      response.status = HttpStatus.OK;

      if (
        !this.configService.get<string>('NODE_ENV') ||
        this.configService.get<string>('NODE_ENV') === '' ||
        this.configService.get<string>('NODE_ENV') === 'development'
      ) {
        // response.payload.local_image = `${this.configService.get<string>(
        //   'application.hostport',
        // )}/${fileData.path.replace('./', '/')}`;
        response.payload = `${this.configService.get<string>(
          'application.hostport',
        )}/${fileData.path.replace('./', '/')}`;
      } else {
        // response.payload.local_image = `${this.configService.get<string>(
        //   'application.hostport',
        // )}/${fileData.path.replace('./', '/')}`;
        response.payload = `${dir_path.path_exposed}${fileData.filename}`;
      }

      // ${this.configService.get<string>(
      // 'application.hostport',
      // )}/

      // const imageLocation = {
      //   image_local: `${dir_path.additional_value.path_local_exposed}${fileData.path.replace('./', '')}`,
      //   image_telkomsel: `${dir_path.path_exposed}${fileData.filename}`
      // }

      // response.payload = imageLocation;
    } else {
      // response.message = 'Image Upload Failed';
      // response.status = HttpStatus.FORBIDDEN;
      throw new ForbiddenException('Image Upload Failed');
    }

    return response;
  }

  private async isEligiblePeriod(
    program: any,
    start_period: any,
    end_period: any,
  ): Promise<boolean> {
    const start = start_period.getTime() >= program.start_period.getTime();
    const end = end_period.getTime() <= program.end_period.getTime();
    if (start_period.getTime() === program.start_period.getTime()) {
      const startHour =
        start_period.getUTCHours() >= program.start_period.getUTCHours();
      const startMinute =
        start_period.getUTCMinutes() >= program.start_period.getUTCMinutes();
      const startSecond =
        start_period.getUTCSeconds() >= program.start_period.getUTCSeconds();
      if (!startHour || !startMinute || !startSecond) {
        return false;
      }
    }
    if (end_period.getTime() === program.end_period.getTime()) {
      const endHour =
        end_period.getUTCHours() <= program.end_period.getUTCHours();
      const endMinute =
        end_period.getUTCMinutes() <= program.end_period.getUTCMinutes();
      const endSecond =
        end_period.getUTCSeconds() <= program.end_period.getUTCSeconds();
      if (!endHour || !endMinute || !endSecond) {
        return false;
      }
    }
    return start && end;
  }

  async stopKeyword(param: string): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    const id = new mongoose.Types.ObjectId(param);
    const keyword: any = await this.keywordModel.findById(id);
    if (!keyword) {
      response.statusCode = HttpStatus.NOT_FOUND;
      response.message = 'Keyword not found';
      return response;
    }

    const getKeywordDetail = await this.detail(param);
    const statusApprovedKeyword = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_APPROVE_HQ'),
    );

    if (
      keyword?.keyword_approval?.toString() ===
        statusApprovedKeyword?.toString() &&
      keyword.is_stoped === false
    ) {
      // Stop Keyword
      await this.keywordModel.findByIdAndUpdate(id, {
        is_stoped: true,
      });
      await this.deleteRedisKeyword(
        getKeywordDetail.eligibility.name,
        'eligibility.name',
      );

      //CLEAR REDIS STOCK
      const stock_location = getKeywordDetail.bonus[0].stock_location;
      for (let i = 0; i < stock_location?.length; i++) {
        const locationId = stock_location[i]?.location_id;

        await this.deleteRedisStock(
          getKeywordDetail?._id.toString(),
          locationId.toString(),
        );
      }

      response.statusCode = HttpStatus.ACCEPTED;
      response.message = 'Keyword has been stopped';
    } else if (keyword.is_stoped === true) {
      if (getKeywordDetail?.eligibility?.program_id_info?.is_stoped === true) {
        response.statusCode = HttpStatus.BAD_REQUEST;
        response.message =
          "Sorry, can't run this keyword because the program linked is currently stoped";
      } else {
        // Resume Keyword
        await this.keywordModel.findByIdAndUpdate(id, {
          is_stoped: false,
        });
        await this.deleteRedisKeyword(
          getKeywordDetail.eligibility.name,
          'eligibility.name',
        );

        //CLEAR REDIS STOCK
        const stock_location = getKeywordDetail.bonus[0].stock_location;
        for (let i = 0; i < stock_location?.length; i++) {
          const locationId = stock_location[i]?.location_id;

          await this.deleteRedisStock(
            getKeywordDetail?._id.toString(),
            locationId.toString(),
          );
        }
        response.statusCode = HttpStatus.ACCEPTED;
        response.message = 'Keyword has been resumed';
      }
    } else {
      response.statusCode = HttpStatus.BAD_REQUEST;
      response.message = 'Invalid program status';
    }
    return response;
  }

  private isDateInRange(
    dateToCheck: Date,
    startDate: Date,
    endDate: Date,
  ): boolean {
    return dateToCheck >= startDate && dateToCheck <= endDate;
  }

  private isKeywordPeriodValid(keyword: any, program: any): boolean {
    const keywordStartDate = new Date(keyword.start_period);
    const keywordEndDate = new Date(keyword.end_period);
    const programStartDate = new Date(program.start_period);
    const programEndDate = new Date(program.end_period);

    return (
      this.isDateInRange(keywordStartDate, programStartDate, programEndDate) &&
      this.isDateInRange(keywordEndDate, programStartDate, programEndDate)
    );
  }

  async getListIdLocation(locationModel, locationIdUser, locationTypeUser) {
    const listIdLocation = [locationIdUser];
    const listChild = await locationModel
      .findOne({ _id: locationIdUser, type: locationTypeUser })
      .exec();

    if (listChild) {
      // if (listChild?.area_id) {
      //   listIdLocation.push(listChild?.area_id);
      // }
      // if (listChild.region_id) {
      //   listIdLocation.push(listChild?.region_id);
      // }

      const getAreaToRegionAndBranch: any = await locationModel
        .find({ area: listChild?.name, data_source: 'Telkomsel' })
        .exec();
      // Mengekstrak _id Region bisa melihat program yg owner detail branch
      if (getAreaToRegionAndBranch && getAreaToRegionAndBranch.length > 0) {
        const areaToRegionAndBranchIds = getAreaToRegionAndBranch.map(
          (branch: any) => branch._id,
        );
        listIdLocation.push(...areaToRegionAndBranchIds);
      }

      const getRegionToBranch: any = await locationModel
        .find({ region: listChild?.name, data_source: 'Telkomsel' })
        .exec();
      // Mengekstrak _id Region bisa melihat program yg owner detail branch
      if (getRegionToBranch && getRegionToBranch.length > 0) {
        const regionToBranchIds = getRegionToBranch.map(
          (branch: any) => branch._id,
        );
        listIdLocation.push(...regionToBranchIds);
      }
    }
    return listIdLocation;
  }

  async checkKeywordRegistration(parameter: any) {
    return (await this.programModel.findOne(parameter).exec()) === null;
  }

  async uploadToLocalProcess(
    file: LocalFileDto,
    path: string,
  ): Promise<LocalFileDto> {
    const fileName = file.filename;
    if (!fileName.match(/^.*\.(jpg|webp|png|jpeg)$/)) {
      throw new BadRequestException(['File format not support']);
    }
    fs.writeFile(`${path}${fileName}`, file.data, (err) => {
      if (err) {
        return console.log(err);
      }
    });
    file.path = `${path}${fileName}`;
    return file;
  }

  //Function Service LOWCR SPRINT-5 ChangeOwner/ChangeCreator Program
  async changeKeywordOwner(
    data: KeywordChangeOwnerDTO,
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    try {
      // Fetch user data
      const getUserData = await this.accountService.detail(data?.user_id);

      // Check if user data is found
      if (!getUserData) {
        throw new NotFoundException({
          message: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        });
      }

      // Convert program_id to ObjectId
      const ObjectIdKeyword = new Types.ObjectId(data?.keyword_id);

      // Update the keyword owner
      const updateChangeOwnerKeyword = await this.keywordModel.updateOne(
        { _id: ObjectIdKeyword },
        { $set: { created_by: getUserData } },
      );

      // Check if the keyword was not found for update
      if (updateChangeOwnerKeyword.modifiedCount === 0) {
        throw new NotFoundException({
          message: 'Keyword not found for update',
          errorCode: 'KEYWORD_NOT_FOUND',
        });
      }

      // Return success message or additional data if needed
      response.message = 'Keyword owner changed successfully';
      response.statusCode = HttpStatus.OK;
      response.payload = updateChangeOwnerKeyword;
      return response;
    } catch (error) {
      // Handle other errors or unexpected exceptions
      throw new InternalServerErrorException({
        message: 'Failed to change keyword owner',
        errorCode: 'CHANGE_OWNER_FAILED',
        errorDetails: error.message, // Optional: Include more details about the error
      });
    }
  }

  /**
   * function for get retry.
   * @returns number of retry sftp with default 3
   */
  private async getConfigRetrySftp() {
    const retryToSftp = await this.systemConfigModel
      .findOne({
        param_key: 'SFTP_MAX_RETRY',
      })
      .exec();
    const retryToSftpFix = retryToSftp?.param_value
      ? parseInt(retryToSftp.param_value.toString())
      : 3;
    return retryToSftpFix;
  }

  async deleteRedisKeyword(param: string, type: string): Promise<any> {
    console.log(`== DELETE REDIS TYPE ${type}-value-${param} ==`);

    await this.appsService.redis_delete(null, { key: `keywordv2-${param}` });
    await this.appsService.redis_delete(null, {
      key: `keywordv2-approved-${param}`,
    });
    await this.appsService.redis_delete(null, {
      key: `keywordv2-profile-${param}`,
    });
  }

  async setIntialStockFlashSale(param: string): Promise<any> {
    const query = this.keywordModel
      .findOneAndUpdate(
        {
          'eligibility.name': param,
        },
        { $set: { 'bonus.0.stock_location.0.stock_flashsale': 0 ,'bonus.0.stock_location.0.balance_flashsale':0} },
        { returnDocument: 'after' },
      )
      .then(async (data) => {
        return data;
      })
      .catch((e: Error) => {
        throw new BadRequestException(e.message);
      });
    return query;
  }

  async deleteRedisStock(idkeyword: string, idlocation: string): Promise<any> {
    console.log(`== DELETE REDIS TYPE nc-stock-${idkeyword}-${idlocation} ==`);

    await this.appsService.redis_delete(null, { key: `stock-${idkeyword}-${idlocation}` });
  }
}
