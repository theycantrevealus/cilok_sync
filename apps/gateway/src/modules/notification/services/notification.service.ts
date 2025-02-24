import { CacheStore } from '@nestjs/cache-manager';
import { CACHE_MANAGER, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisDataKey } from '@slredis/const/redis.key';
import { ObjectId } from 'bson';
import { Cache } from 'cache-manager';
import { response } from 'express';
import mongoose, { Model } from 'mongoose';

import { CredentialAccount } from '@/decorators/auth.decorator';
import { GlobalErrorResponse, GlobalResponse } from '@/dtos/response.dto';

import {
  NotificationAddDTO,
  NotificationAddDTOResponse,
} from '../dto/notification.add.dto';
import { NotificationDeleteDTOResponse } from '../dto/notification.delete.dto';
import {
  NotificationEditDTO,
  NotificationEditDTOResponse,
} from '../dto/notification.edit.dto';
import { NotificationFirebaseAddDto } from '../dto/notification.firebase.add.dto';
import {
  NotificationFirebaseEditDTO,
  NotificationFirebaseEditDTOResponse,
} from '../dto/notification.firebase.edit.dto';
import {
  NotificationFirebasDocument,
  NotificationFirebase,
} from '../models/notification.firebase.model';
import {
  NotificationTemplate,
  NotificationTemplateDocument,
} from '../models/notification.model';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(NotificationTemplate.name)
    private notificationModel: Model<NotificationTemplateDocument>,

    @InjectModel(NotificationFirebase.name)
    private notificationFirebase: Model<NotificationFirebasDocument>,

    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
  ) {
    //
  }

  // async notificationfirebase(
  //   title: string,
  //   content: string,
  //   detail: string,
  //   receiver_id: string,
  //   receiver_name: string,
  //   sender_id: string,
  //   sender_name: string,
  //   created_by: any,
  // ): Promise<any> {
  //   const newNotificationFireBase = new this.notificationFirebase({
  //     title: title,
  //     content: content,
  //     detail: detail,
  //     receiver_id: receiver_id,
  //     receiver_name: receiver_name,
  //     sender_id: sender_id,
  //     sender_name: sender_name,
  //     created_by: created_by,
  //   })
  //   await newNotificationFireBase.save()
  //     .then(async (returning) => {
  //       return returning
  //     })
  //     .catch((e: Error) => {
  //       throw new Error(e.message);
  //     });
  // }

  async notificationfirebase(
    payload: NotificationFirebaseAddDto,
  ): Promise<any> {
    const newNotificationFireBase = new this.notificationFirebase(payload);
    await newNotificationFireBase
      .save()
      .then(async (returning) => {
        return returning;
      })
      .catch((e: Error) => {
        throw new Error(e.message);
      });
  }

  async getnotificationFirebasePrime(param, credential: any): Promise<any> {
    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
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

        filter_builder.$and.push(autoColumn);
      }
    }

    query.push({
      $match: {
        $and: [
          {
            receiver_id: credential._id,
          },
        ],
      },
    });

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null, receiver_id: credential._id }],
        },
      });
    }

    query.push({ $group: { _id: '$_id', doc: { $first: '$$ROOT' } } });
    query.push({
      $replaceRoot: {
        newRoot: { $mergeObjects: ['$doc'] },
      },
    });

    const allNoFilter = await this.notificationFirebase.aggregate(
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
    } else {
      query.push({
        $sort: { created_at: -1 },
      });
    }

    query.push({ $skip: first });

    query.push({ $limit: rows });

    const data = await this.notificationFirebase.aggregate(
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

  async updateNotificationFirebase(
    _id: string,
    request: NotificationFirebaseEditDTO,
  ): Promise<NotificationFirebaseEditDTOResponse> {
    const response = new NotificationFirebaseEditDTOResponse();
    response.transaction_classify = 'EDIT_NOTIFICATION_FIREBASE';

    await this.notificationFirebase
      .findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(_id),
        },
        {
          ...request,
          updated_at: new Date(),
        },
      )
      .catch((e) => {
        throw new Error(e.message);
      })
      .then((res) => {
        response.status = HttpStatus.OK;
        response.message = 'Data edit success';
        response.payload = res;
      });
    return response;
  }

  async deleteNotificationFirebase(
    _id: string,
    soft = true,
  ): Promise<NotificationFirebaseEditDTOResponse> {
    const response = new NotificationFirebaseEditDTOResponse();
    response.transaction_classify = 'DELETE_EXAMPLE';
    const oid = new mongoose.Types.ObjectId(_id);
    if (soft) {
      await this.notificationFirebase
        .findOneAndUpdate(
          {
            _id: oid,
          },
          {
            deleted_at: new Date(),
          },
        )
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(async (res) => {
          response.status = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
          response.payload = res;
          return response;
        });
    } else {
      await this.notificationFirebase
        .findOneAndDelete({
          _id: oid,
        })
        .catch((e) => {
          throw new Error(e.message);
        })
        .then(async (res) => {
          response.status = HttpStatus.NO_CONTENT;
          response.message = 'Data delete success';
          response.payload = res;
          return response;
        });
    }
    return response;
  }

  async checkAvailCodeNotif(parameter: any): Promise<boolean> {
    return (
      (await this.notificationModel
        .findOne({
          $and: [parameter],
        })
        .exec()) === null
    );
  }

  async getNotificationSelectBox(param: any): Promise<any> {
    const filter_set = JSON.parse(param.filter);
    const sort_set = JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = this.notificationModel
      .find(filter_builder)
      .skip(skip)
      .limit(limit)
      .sort(sort_set)
      .exec()
      .then((results) => {
        return results;
      });

    return data;
  }

  async getNotification(param: any): Promise<any> {
    const filter_set =
      param.filter && param.filter !== '' ? JSON.parse(param.filter) : {};
    const sort_set =
      param.sort && param.sort !== '' && param.sort === '{}'
        ? JSON.parse(param.sort)
        : { _id: 1 };
    const skip: number =
      param.skip && param.skip !== '' ? parseInt(param.skip) : 0;
    const limit: number =
      param.limit && param.limit !== '' ? parseInt(param.limit) : 10;
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = await this.notificationModel.aggregate(
      [
        {
          $project: {
            code: true,
            notif_type: true,
            notif_name: true,
            notif_content: true,
            variable: true,
            receiver: {
              $map: {
                input: {
                  $filter: {
                    input: '$receiver',
                    as: 'receiver_info',
                    cond: {
                      $and: [
                        { $ne: ['$$receiver_info', null] },
                        { $ne: ['$$receiver_info', ''] },
                      ],
                    },
                  },
                },
                as: 'receiver_info',
                in: {
                  $toObjectId: '$$receiver_info',
                },
              },
            },
            channel_id: {
              $map: {
                input: {
                  $filter: {
                    input: '$channel_id',
                    as: 'channel_id_info',
                    cond: {
                      $and: [
                        { $ne: ['$$channel_id_info', null] },
                        { $ne: ['$$channel_id_info', ''] },
                      ],
                    },
                  },
                },
                as: 'channel_id_info',
                in: {
                  $toObjectId: '$$channel_id_info',
                },
              },
            },
            notif_via: {
              $map: {
                input: {
                  $filter: {
                    input: '$notif_via',
                    as: 'notif_via_info',
                    cond: {
                      $and: [
                        { $ne: ['$$notif_via_info', null] },
                        { $ne: ['$$notif_via_info', ''] },
                      ],
                    },
                  },
                },
                as: 'notif_via_info',
                in: {
                  $toObjectId: '$$notif_via_info',
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'lovs',
            let: { receiver_id: '$receiver' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$receiver_id'],
                  },
                },
              },
            ],
            as: 'receiver',
          },
        },
        {
          $lookup: {
            from: 'channels',
            let: { channels_id: '$channel_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$channels_id'],
                  },
                },
              },
            ],
            as: 'channel_id',
          },
        },
        {
          $lookup: {
            from: 'lovs',
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
            as: 'notif_type_info',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            let: { notif_via_id: '$notif_via' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$notif_via_id'],
                  },
                },
              },
            ],
            as: 'notif_via_info',
          },
        },
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

  async getNotificationPrime(param): Promise<any> {
    const first = param.first ? parseInt(param.first) : 0;
    const rows = param.rows ? parseInt(param.rows) : 20;
    const sortField = param.sortField ? param.sortField : 'created_at';
    const sortOrder = param.sortOrder ? parseInt(param.sortOrder) : 1;
    const filters = param.filters;
    const query = [];
    const sort_set = {};

    query.push({
      $project: {
        code: true,
        notif_type: true,
        notif_name: true,
        notif_content: true,
        variable: true,
        receiver: {
          $map: {
            input: {
              $filter: {
                input: '$receiver',
                as: 'receiver_info',
                cond: {
                  $and: [
                    { $ne: ['$$receiver_info', null] },
                    { $ne: ['$$receiver_info', ''] },
                  ],
                },
              },
            },
            as: 'receiver_info',
            in: {
              $toObjectId: '$$receiver_info',
            },
          },
        },
        channel_id: {
          $map: {
            input: {
              $filter: {
                input: '$channel_id',
                as: 'channel_id_info',
                cond: {
                  $and: [
                    { $ne: ['$$channel_id_info', null] },
                    { $ne: ['$$channel_id_info', ''] },
                  ],
                },
              },
            },
            as: 'channel_id_info',
            in: {
              $toObjectId: '$$channel_id_info',
            },
          },
        },
        notif_via: {
          $map: {
            input: {
              $filter: {
                input: '$notif_via',
                as: 'notif_via_info',
                cond: {
                  $and: [
                    { $ne: ['$$notif_via_info', null] },
                    { $ne: ['$$notif_via_info', ''] },
                  ],
                },
              },
            },
            as: 'notif_via_info',
            in: {
              $toObjectId: '$$notif_via_info',
            },
          },
        },
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
        let: { receiver_id: '$receiver' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$receiver_id'],
              },
            },
          },
        ],
        as: 'receiver',
      },
    });

    query.push({
      $lookup: {
        from: 'channels',
        let: { channels_id: '$channel_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$channels_id'],
              },
            },
          },
        ],
        as: 'channel_id',
      },
    });
    query.push({
      $lookup: {
        from: 'lovs',
        let: { notif_via_id: '$notif_via' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', '$$notif_via_id'],
              },
            },
          },
        ],
        as: 'notif_via_info',
      },
    });

    query.push({
      $lookup: {
        from: 'lovs',
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
        as: 'notif_type_info',
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
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      });
    }

    const allNoFilter = await this.notificationModel.aggregate(
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

    const data = await this.notificationModel.aggregate(
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

  async getDetail(param: string) {
    const data = await this.notificationModel.aggregate(
      [
        {
          $project: {
            code: true,
            notif_type: true,
            notif_name: true,
            notif_content: true,
            variable: true,
            receiver: {
              $map: {
                input: '$receiver',
                as: 'receiver_info',
                in: {
                  $toObjectId: '$$receiver_info',
                },
              },
            },
            channel_id: {
              $map: {
                input: '$channel_id',
                as: 'channel_id_info',
                in: {
                  $toObjectId: '$$channel_id_info',
                },
              },
            },
            notif_via: {
              $map: {
                input: '$notif_via',
                as: 'notif_via_info',
                in: {
                  $toObjectId: '$$notif_via_info',
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'lovs',
            let: { receiver_id: '$receiver' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$receiver_id'],
                  },
                },
              },
            ],
            as: 'receiver',
          },
        },
        {
          $lookup: {
            from: 'channels',
            let: { channels_id: '$channel_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$channels_id'],
                  },
                },
              },
            ],
            as: 'channel_id',
          },
        },
        {
          $lookup: {
            from: 'lovs',
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
            as: 'notif_type_info',
          },
        },
        {
          $lookup: {
            from: 'lovs',
            let: { notif_via_id: '$notif_via' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$notif_via_id'],
                  },
                },
              },
            ],
            as: 'notif_via_info',
          },
        },
        {
          $match: {
            $and: [{ _id: new mongoose.Types.ObjectId(param) }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
    return data[0];
  }

  async addNotification(
    notificationData: NotificationAddDTO,
  ): Promise<GlobalResponse> {
    const checkCode = await this.checkAvailCodeNotif({
      code: notificationData.code,
    });
    const response = new GlobalResponse();
    response.transaction_classify = 'NOTIFICATION_ADD';
    if (checkCode) {
      const newData = new this.notificationModel(notificationData);
      return await newData
        .save()
        .catch((e: Error) => {
          throw new Error(e.message);
        })
        .then(() => {
          response.message = 'Notification Template Created Successfully';
          response.statusCode = HttpStatus.OK;
          response.payload = newData;
          return response;
        });
    } else {
      response.statusCode = 400;
      response.message = 'Duplicate code are not allowed';
    }
    return response;
  }

  async editNotification(
    data: NotificationEditDTO,
    param: string,
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'NOTIFICATION_UPDATE';
    await this.notificationModel
      .findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(param),
        },
        {
          ...data,
        },
      )
      .catch((e) => {
        throw new Error(e.message);
      })
      .then((res) => {
        response.message = 'Notification Template Updated Successfully';
        response.statusCode = HttpStatus.OK;
        response.payload = res;
      });
    return response;
  }

  async deleteNotification(
    param: string,
  ): Promise<NotificationDeleteDTOResponse> {
    const process = this.notificationModel
      .findOneAndDelete({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new NotificationDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Notification Template Deleted Successfully';
      response.payload = process;
    } else {
      response.status = 400;
      response.message = 'Notification Template Failed to Deleted';
      response.payload = process;
    }
    return response;
  }

  async getDetailbyName(param: string): Promise<any> {
    // return await this.notificationModel.findOne({ notif_name: param });
    return await this.getNotificationTemplateDetailByName(param);
  }

  async getNotificationTemplateDetail(param: string): Promise<any> {
    const now = Date.now();

    const key = `${RedisDataKey.NOTIFICATIONTEMPLATE_KEY}-${param.toString()}`;
    const notifTemplateRedis = await this.cacheManager.get(key);
    let result = null;

    if (notifTemplateRedis) {
      console.log(
        `REDIS|Load notificationtemplate ${param} from Redis|${
          Date.now() - now
        }`,
      );

      result = notifTemplateRedis;
    } else {
      const notifTemplate = await this.notificationModel.findOne({
        _id: new ObjectId(param),
      });

      console.log(
        `REDIS|Load notificfationtemplate ${param} from Database|${
          Date.now() - now
        }`,
      );

      if (notifTemplate) {
        await this.cacheManager.set(key, notifTemplate);
        result = notifTemplate;
      }
    }

    return result;
  }

  async getNotificationTemplateDetailByName(param: string): Promise<any> {
    const key = `${RedisDataKey.NOTIFICATIONTEMPLATE_KEY}-${param.toString()}`;
    const notifTemplateRedis = await this.cacheManager.get(key);
    let result = null;

    if (notifTemplateRedis) {
      result = notifTemplateRedis;
    } else {
      const notifTemplate = await this.notificationModel.findOne({
        notif_name: param,
      });

      if (notifTemplate) {
        await this.cacheManager.set(key, notifTemplate);
        result = notifTemplate;
      }
    }

    return result;
  }
}
