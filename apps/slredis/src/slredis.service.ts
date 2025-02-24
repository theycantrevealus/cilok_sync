import { InjectQueue } from '@nestjs/bull';
import { CACHE_MANAGER, CacheStore } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import { Cache } from 'cache-manager';
import { isNotEmptyObject } from 'class-validator';
import { Model } from 'mongoose';

import {
  SystemConfig,
  SystemConfigDocument,
} from '@/application/models/system.config.model';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import {
  KeywordPriority,
  KeywordPriorityDocument,
} from '@/keyword/models/keyword.priority.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import {
  NotificationTemplate,
  NotificationTemplateDocument,
} from '@/notification/models/notification.model';

import { RedisDataKey } from './const/redis.key';

@Injectable()
export class SlRedisService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
    @Inject(CACHE_MANAGER) private cacheManagerKey: Cache,

    @InjectQueue('redis-config-queue')
    private readonly redisConfigQueue: Queue,

    @InjectModel(Keyword.name)
    private readonly keywordModel: Model<KeywordDocument>,

    @InjectModel(SystemConfig.name)
    private readonly systemConfigModel: Model<SystemConfigDocument>,

    @InjectModel(Lov.name)
    private readonly lovModel: Model<LovDocument>,

    @InjectModel(NotificationTemplate.name)
    private readonly notificationTemplateModel: Model<NotificationTemplateDocument>,

    @InjectModel(KeywordPriority.name)
    private readonly keywordPriorityModel: Model<KeywordPriorityDocument>,
  ) {}

  async reloadAll(param = {}) {
    let parameter: any = param;
    if (!isNotEmptyObject(parameter)) {
      parameter = {
        keyword: true,
        lov: true,
        notificationtemplate: true,
        systemconfig: true,
        keywordpriority: true,
      };
    }

    console.log(`Reloading redis with param: ${JSON.stringify(parameter)}`);
    if (parameter?.keyword) {
      // console.log('\nFetch keyword data...');
      // this.loadKeyword()
      //   .then(() => true)
      //   .catch((error) => {
      //     console.error(error);
      //   });
    }

    if (parameter?.lov) {
      console.log('\nFetch lov data...');
      this.loadLov()
        .then(() => true)
        .catch((error) => {
          console.error(error);
        });
    }

    if (parameter?.notificationtemplate) {
      // console.log('\nFetch notificationtemplate data...');
      // this.loadNotificationTemplate()
      //   .then(() => true)
      //   .catch((error) => {
      //     console.error(error);
      //   });
    }

    if (parameter?.systemconfig) {
      console.log('\nFetch SystemConfig data...');
      this.loadSystemConfig()
        .then(() => true)
        .catch((error) => {
          console.error(error);
        });
    }

    if (parameter?.keywordpriority) {
      console.log('\nFetch Keyword Priority data...');
      this.loadKeywordPriority({
        start: { $lte: new Date() },
        end: { $gte: new Date() },
      })
        .then(() => true)
        .catch((error) => {
          console.error(error);
        });
    }
  }

  async deleteAll(key) {
    const fullKey = `nc-${key}`;
    console.log(`Redis -> Deleting '${fullKey}' Redis data ...`);

    const redisData: any = await this.cacheManagerKey.store.keys(fullKey);
    if (!redisData.length) {
      console.log(`Redis -> No keys found with key pattern ${fullKey}`);
    }

    console.log(`Redis -> Found ${redisData?.length} keys`);

    let success = 0;
    const fail = [];

    for (let i = 0; i < redisData?.length; i++) {
      const oneKey = redisData[i];

      try {
        await this.cacheManager.del(oneKey);
        success++;
      } catch (err) {
        console.error(
          `Redis -> Unable to delete Redis data with key pattern '${oneKey}'`,
        );

        fail.push(oneKey);
      }
    }

    console.log(`Redis -> ${success}/${redisData?.length} deleted!`);

    return {
      total: redisData.length,
      success: success,
      failed: {
        count: fail.length,
        data: fail,
      },
    };
  }

  /**
   * KEYWORD
   */
  async loadKeyword(parameter = {}) {
    console.log(`Reloading keyword ${[JSON.stringify(parameter)]}`);
    const now = Date.now();
    const query = [];

    if (isNotEmptyObject(parameter)) {
      query.push({
        $match: {
          $and: [
            {
              ...parameter,
              deleted_at: null,
              keyword_edit: null,
              'eligibility.name': { $not: /-EDIT-/ },
            },
          ],
        },
      });
    } else {
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
    }

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

    await this.keywordModel.aggregate(query, async (err, result) => {
      await Promise.all(
        result.map(async (a) => {
          await this.cacheManager.set(
            `${RedisDataKey.KEYWORD_KEY}-${a._id.toString()}`,
            a,
          );
          await this.cacheManager.set(
            `${RedisDataKey.KEYWORD_KEY}-${a.eligibility.name.toString()}`,
            a,
          );
        }),
      ).then(() => {
        console.log(
          '**********************************************************************',
        );
        console.log(
          `*              Finish load on    : ${(Date.now() - now) / 1000}s`,
        );
        console.log(`*              Keyword count     : ${result.length}`);
        console.log(
          '**********************************************************************',
        );
      });
    });
  }

  async reloadKeyword(parameter: any) {
    return await this.redisConfigQueue
      .add('reload-keyword', parameter, { removeOnComplete: true })
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }

  /**
   * LOV
   */
  async loadLov(parameter = {}) {
    console.log(`Reloading lov ${[JSON.stringify(parameter)]}`);
    const now = Date.now();
    const query = {
      $and: [
        { group_name: { $ne: null } },
        { group_name: { $ne: '' } },
        { deleted_at: null },
      ],
    };

    await this.lovModel
      .find(query)
      .then(async (result) => {
        await Promise.all(
          result.map(async (a) => {
            if (a._id && a.group_name) {
              await this.cacheManager.set(
                `${RedisDataKey.LOV_KEY}-${a._id.toString()}`,
                a,
              );

              // await this.cacheManager.set(
              //   `${
              //     RedisDataKey.LOV_KEY
              //   }-${a._id.toString()}-${a.group_name.toString()}`,
              //   a,
              // );
            }
          }),
        ).then(() => {
          console.log(
            '**********************************************************************',
          );
          console.log(
            `*              Finish load on    : ${(Date.now() - now) / 1000}s`,
          );
          console.log(`*              Lov count         : ${result.length}`);
          console.log(
            '**********************************************************************',
          );
        });
      })
      .catch((err) => {
        console.error('An error occured!', err);
      });
  }

  async reloadLov(parameter: any) {
    return await this.redisConfigQueue
      .add('reload-lov', parameter, { removeOnComplete: true })
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async deleteLov(id) {
    const key = `${RedisDataKey.LOV_KEY}-${id}`;
    const lovRedis = await this.cacheManager.get(key);
    if (lovRedis) {
      await this.cacheManager.del(key);
    }
  }

  /**
   * Notification Template
   */
  async loadNotificationTemplate(parameter = {}) {
    console.log(
      `Reloading notificationtemplate ${[JSON.stringify(parameter)]}`,
    );
    const now = Date.now();
    const query = {};

    await this.notificationTemplateModel
      .find(query)
      .then(async (result) => {
        await Promise.all(
          result.map(async (a) => {
            await this.cacheManager.set(
              `${RedisDataKey.NOTIFICATIONTEMPLATE_KEY}-${a._id.toString()}`,
              a,
            );

            await this.cacheManager.set(
              `${
                RedisDataKey.NOTIFICATIONTEMPLATE_KEY
              }-${a.notif_name.toString()}`,
              a,
            );
          }),
        ).then(() => {
          console.log(
            '**********************************************************************',
          );
          console.log(
            `*       Finish load on                 : ${
              (Date.now() - now) / 1000
            }s`,
          );
          console.log(
            `*       Notification Template count    : ${result.length}`,
          );
          console.log(
            '**********************************************************************',
          );
        });
      })
      .catch((err) => {
        console.error('An error occured!', err);
      });
  }

  async reloadNotificationTemplate(parameter: any) {
    return await this.redisConfigQueue
      .add('reload-notificationtemplate', parameter, { removeOnComplete: true })
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }

  /**
   * System Config
   */
  async loadSystemConfig(parameter = {}) {
    console.log(`Reloading systemconfig ${[JSON.stringify(parameter)]}`);
    const now = Date.now();
    const query = [];

    this.systemConfigModel.find({}).then(async (result) => {
      await Promise.all(
        result.map(async (a) => {
          await this.cacheManager.set(
            `${RedisDataKey.SYSTEMCONFIG_KEY}-${a._id.toString()}`,
            a,
          );
          await this.cacheManager.set(
            `${RedisDataKey.SYSTEMCONFIG_KEY}-${a.param_key.toString()}`,
            a,
          );
        }),
      ).then(() => {
        console.log(
          '**********************************************************************',
        );
        console.log(
          `*              Finish load on    : ${(Date.now() - now) / 1000}s`,
        );
        console.log(`*              SystemConfig count     : ${result.length}`);
        console.log(
          '**********************************************************************',
        );
      });
    });
  }

  /**
   * Keyword Priority
   */
  async loadKeywordPriority(parameter = {}) {
    console.log(`Reloading keywordpriority ${[JSON.stringify(parameter)]}`);
    const now = Date.now();
    let query = {};

    if (isNotEmptyObject(parameter)) {
      query = {
        ...parameter,
      };
    }

    await this.keywordPriorityModel.find(query).then(async (result) => {
      await Promise.all(
        result.map(async (a) => {
          await this.cacheManager.set(
            `${RedisDataKey.KEYWORDPRIORITY_KEY}-${a.keyword.toString()}`,
            a,
            { ttl: 0 }, // never expired
          );
        }),
      ).then(() => {
        console.log(
          '**********************************************************************',
        );
        console.log(
          `*           Finish load on            : ${
            (Date.now() - now) / 1000
          }s`,
        );
        console.log(`*           KeywordPriority count     : ${result.length}`);
        console.log(
          '**********************************************************************',
        );
      });
    });
  }
}
