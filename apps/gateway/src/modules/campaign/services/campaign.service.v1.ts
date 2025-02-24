import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { ObjectId } from 'bson';
import { Queue } from 'bull';
import { CronJob } from 'cron';
import * as fs from 'fs';
import mongoose, { Model, Types } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { LocalFileDto } from '@/application/utils/FilterDT/file.dto';
import { CampaignEditDTO } from '@/campaign/dto/campagin.edit.dto.v1';
import {
  CampaignAddDTO,
  CampaignAddDTOResponse,
  CampaignWithReceiptAddDTO,
} from '@/campaign/dto/campaign.add.dto.v1';
import { CampaignAnalyticAddDTO } from '@/campaign/dto/campaign.analytic.add.dto.v1';
import { CampaignAnalyticEditDTO } from '@/campaign/dto/campaign.analytic.edit.dto.v1';
import { CampaignDeleteDTOResponse } from '@/campaign/dto/campaign.delete.dto.v1';
import { CampaignRebroadcastDTO } from '@/campaign/dto/campaign.rebroadcast.add.dto';
import { CampaignRecipientAddDTOResponse } from '@/campaign/dto/campaign.recipient.add.dto.v1';
import {
  BroadcastScheduleType,
  CampaignBroadcastSchedule,
  CampaignBroadcastScheduleDocument,
} from '@/campaign/models/campaign.broadcast.schedule.model';
import {
  CampaignLog,
  CampaignLogDocument,
} from '@/campaign/models/campaign.log.model.v1';
import {
  Campaign,
  CampaignDocument,
  CampaignType,
} from '@/campaign/models/campaign.model';
import { CampaignNotificationConfig } from '@/campaign/models/campaign.notification.config.model';
import {
  CampaignRecipient,
  CampaignRecipientDocument,
  CampaignRecipientStatus,
} from '@/campaign/models/campaign.recipient.model';
import {
  CustomerTier,
  CustomerTierDocument,
} from '@/customer/models/customer.tier.model';
import { CustomerService } from '@/customer/services/customer.service';
import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { Lov, LovDocument } from '@/lov/models/lov.model';

import { dateTimeToCronFormat, generateRandomStr } from '../../../helper';

const moment = require('moment-timezone');

export enum TypeRecipientDeleteProcess {
  SINGLE = 1,
  INVALID = 2,
  All = 0
}

@Injectable()
export class CampaignServiceV1 {
  private readonly logger = new Logger(CampaignServiceV1.name);
  private readonly notifType;
  private loadFileQueue: Queue;
  private core_url: string;

  private customerService: CustomerService;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(HttpService) private readonly httpService: HttpService,

    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,

    @InjectModel(Campaign.name)
    private campaignModel: Model<CampaignDocument>,

    @InjectModel(CampaignLog.name)
    private campaignLogModel: Model<CampaignLogDocument>,

    @InjectModel(CampaignRecipient.name)
    private campaignRecipientModel: Model<CampaignRecipientDocument>,

    @InjectModel(CampaignBroadcastSchedule.name)
    private campaignBroadcastScheduleModel: Model<CampaignBroadcastScheduleDocument>,

    @InjectModel(CustomerTier.name)
    private customerTierModel: Model<CustomerTierDocument>,

    private schedulerRegistry: SchedulerRegistry,

    @Inject('CAMPAIGN')
    private readonly client: ClientKafka,

    @InjectQueue('campaign')
    loadFileQueue: Queue,

    customerService: CustomerService,
  ) {
    this.core_url = `${configService.get<string>(
      'core-backend.raw_core_port',
    )}`;
    this.notifType = new mongoose.Types.ObjectId('645cbad41dd02dde18d87b5b');
    this.loadFileQueue = loadFileQueue;

    this.customerService = customerService;
  }

  /* ============================== */
  /*
    Service Add Function :: Open
  */
  async addCampaign(
    campaignData: CampaignAddDTO,
    created_by: any = null,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.payload = {};

    // check date
    const timeNow = new Date();
    const executeTime = new Date(campaignData.execute_time);
    console.log('add Campaign timeNow', timeNow);
    console.log('add Campaign executeTime', executeTime);

    // Time For Cron
    const executeTimeScheduler = new Date(executeTime);
    executeTimeScheduler.setSeconds(executeTimeScheduler.getSeconds() + 10);
    console.log('add Campaign executeTimeScheduler', executeTimeScheduler);

    if (timeNow.getTime() >= executeTime.getTime()) {
      response.message = 'Date invalid';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_BROADCAST_ADD';

      return response;
    }

    // check campaign name
    const campaign = await this.campaignModel.findOne({
      name: campaignData.name.trim(),
    });
    if (campaign) {
      response.message = 'Campaign Name Is Already Exist';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_BROADCAST_ADD';

      return response;
    }

    const notifVia = [];
    for (let i = 0; i < campaignData.notif_via.length; i++) {
      const lov = await this.lovModel
        .findOne({
          _id: new ObjectId(campaignData.notif_via[i].toString()),
          deleted_at: null,
        })
        .exec();

      if (lov) {
        notifVia.push({
          id: lov._id.toString(),
          value: lov.set_value,
        });
      }
    }

    const notifConfig = new CampaignNotificationConfig(
      campaignData.notification_template,
      this.notifType,
      notifVia,
      campaignData.notification_content,
    );

    const cronFormat = dateTimeToCronFormat(executeTimeScheduler);
    console.log('add Campaign cronFormat', cronFormat);

    const newCampaign = new this.campaignModel({
      type: CampaignType.BROADCAST,
      name: campaignData.name.trim(),
      description: campaignData.description,
      notification_config: notifConfig,
      execute_time: campaignData.execute_time,
      additional: {},
      total_recipient: 0,
      recipient_uploaded: 0,
      recipient_valid: 0,
      sent: 0,
      created_by: created_by.id,
    });

    // return created campaign
    return await newCampaign
      .save()
      .then(async (result) => {
        const schedule = new this.campaignBroadcastScheduleModel({
          campaign_id: result._id,
          type: BroadcastScheduleType.FIRST,
          notification_content: campaignData.notification_content,
          execute_time: executeTime,
          execute_schedule: cronFormat,
          is_execute: false,
          batch: `${result._id.toString()}_${generateRandomStr(
            10,
          )}_${timeNow.toISOString()}`,
        });

        return await schedule
          .save()
          .then(async (_) => {
            response.message = 'Campaign created successfully';
            response.code = HttpCodeTransaction.CODE_SUCCESS_200;
            response.transaction_classify = 'CAMPAIGN_BROADCAST_ADD';
            response.payload = {
              _id: result._id.toString(),
              ...campaignData,
            };

            return response;
          })
          .catch(async (err) => {
            response.message = 'Campaign failed to created';
            response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
            this.logger.error(err);

            return response;
          });
      })
      .catch(async (err) => {
        response.message = 'Campaign failed to created';
        response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
        this.logger.error(err);

        return response;
      });
  }

  /**
   * For update campaign before execute
   * @param campaignData
   * @param id
   */
  async editCampaign(
    campaignData: CampaignEditDTO,
    id: string,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.payload = {};

    const timeNow = new Date();
    const executeTime = new Date(campaignData.execute_time);

    // Time For Cron
    const executeTimeScheduler = new Date(executeTime);
    executeTimeScheduler.setSeconds(executeTimeScheduler.getSeconds() + 10);

    if (timeNow.getTime() >= executeTime.getTime()) {
      response.message = 'Date invalid';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_BROADCAST_EDIT';

      return response;
    }

    // check campaign name
    const campaign = await this.campaignModel.findOne({
      name: campaignData.name.trim(),
    });
    if (campaign && campaign.id !== id) {
      response.message = 'Campaign Name Is Already Exist';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_BROADCAST_EDIT';

      return response;
    }

    const notifVia = [];
    for (let i = 0; i < campaignData.notif_via.length; i++) {
      const lov = await this.lovModel
        .findOne({
          _id: new ObjectId(campaignData.notif_via[i].toString()),
          deleted_at: null,
        })
        .exec();

      if (lov) {
        notifVia.push({
          id: lov._id.toString(),
          value: lov.set_value,
        });
      }
    }

    const dataSchedule = await this.campaignBroadcastScheduleModel
      .findOne({
        campaign_id: new ObjectId(id),
        type: BroadcastScheduleType.FIRST,
        is_execute: false,
        deleted_at: null,
      })
      .exec();

    if (!dataSchedule) {
      response.message = "Can't update. Broadcast already executed or deleted";
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_BROADCAST_ADD';

      return response;
    }

    // set notif config
    const notifConfig = new CampaignNotificationConfig(
      campaignData.notification_template,
      this.notifType,
      notifVia,
      campaignData.notification_content,
    );
    const cronFormat = dateTimeToCronFormat(executeTimeScheduler);

    return await this.campaignModel
      .findOneAndUpdate(
        { _id: new ObjectId(id), deleted_at: null },
        {
          updated_at: Date.now(),
          name: campaignData.name.trim(),
          description: campaignData.description,
          notification_config: notifConfig,
          execute_time: campaignData.execute_time,
        },
      )
      .then(async (result) => {
        return await this.campaignBroadcastScheduleModel
          .findOneAndUpdate(
            { _id: dataSchedule._id },
            {
              updated_at: Date.now(),
              notification_content: campaignData.notification_content,
              execute_time: campaignData.execute_time,
              execute_schedule: cronFormat,
            },
          )
          .then(async (_) => {
            // delete cronjob after update
            if (!result.is_cancelled) {
              const cronName = `${CampaignType.BROADCAST}_${BroadcastScheduleType.FIRST
                }_${id}_${dataSchedule._id.toString()}`;

              const check = this.schedulerRegistry.doesExist('cron', cronName);
              if (check) {
                this.schedulerRegistry.deleteCronJob(cronName);
                this.logger.warn(`Broadcast job ${cronName} has been deleted`);
              }
            }

            response.code = HttpCodeTransaction.CODE_SUCCESS_200;
            response.message = 'Campaign updated successfully';
            response.transaction_classify = 'CAMPAIGN_BROADCAST_EDIT';
            response.payload = {
              _id: result._id.toString(),
              ...campaignData,
            };

            return response;
          })
          .catch(async (err) => {
            response.message = 'Campaign failed to updated';
            response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
            this.logger.error(err);

            return response;
          });
      })
      .catch(async (err) => {
        response.message = 'Campaign failed to updated';
        response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
        this.logger.error(err);

        return response;
      });
  }

  /**
   * @deprecated
   * @param campaignData
   * @param created_by
   */
  async addCampaignWithRecipient(
    campaignData: CampaignWithReceiptAddDTO,
    created_by: any = null,
  ): Promise<any> {
    const response = new CampaignAddDTOResponse();
    // response.transaction_classify = 'CAMPAIGN_ADD';
    if (process) {
      const newCampaign = new this.campaignModel({
        ...campaignData,
        created_by: created_by._id,
      });

      const process = await newCampaign.save().then(async (returning) => {
        return returning;
      });

      // if (process && campaignData.recipient.length > 0) {
      //   await this.addCampaignRecipientBulk(
      //     campaignData.recipient.map((e) => ({
      //       campaign: newCampaign._id,
      //       ...e,
      //     })),
      //   );
      // }

      response.message = 'Campaign created successfully';
      response.status = HttpStatus.OK;
      response.payload = newCampaign;
    } else {
      response.message = 'Campaign failed to created';
      response.status = 400;
      response.payload = process;
    }

    return response;
  }

  async broadcastDetailResult(param: any, campaign_id: string): Promise<any> {
    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    query.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$campaign_id', new ObjectId(campaign_id)] }],
        },
      },
    });

    query.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$deleted_at', null] }],
        },
      },
    });

    query.push({
      $project: {
        __v: false,
        created_by: false,
        updated_at: false,
        deleted_at: false,
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
    }

    const allNoFilter = await this.campaignRecipientModel.aggregate(
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

    const data = await this.campaignRecipientModel.aggregate(
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

  /**
   * Get summary detail (list of msisd)
   * @param param
   * @param summary_id
   */
  async broadcastSummaryDetailResult(
    param: any,
    summary_id: string,
  ): Promise<any> {
    const response = new GlobalTransactionResponse();

    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const summary = await this.campaignBroadcastScheduleModel
      .findOne({ _id: new ObjectId(summary_id) })
      .exec();

    if (!summary) {
      response.code = HttpCodeTransaction.ERR_NOT_FOUND_404;
      response.message = 'Summary not found';
      return response;
    }

    const sort_set = {};

    query.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$broadcast_batch', summary.batch] }],
        },
      },
    });

    query.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$deleted_at', null] }],
        },
      },
    });

    query.push({
      $addFields: {
        summary_id: summary_id,
      },
    });

    query.push({
      $project: {
        __v: false,
        created_by: false,
        created_at: false,
        updated_at: false,
        deleted_at: false,
        campaign_id: false,
        fail_message: false,
        try_count: false,
        is_valid_msisdn: false,
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
    }

    const allNoFilter = await this.campaignRecipientModel.aggregate(
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

    const data = await this.campaignRecipientModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS_200;
    response.payload = {
      totalRecords: allNoFilter.length,
      data: data,
    };

    return response;
  }

  async summaryPerCampaign(param: any, campaign_id: string): Promise<any> {
    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    const checkType = await this.campaignModel.countDocuments({
      _id: new ObjectId(campaign_id),
      type: CampaignType.BROADCAST,
    });

    if (checkType == 0) {
      return {
        message: HttpStatus.OK,
        payload: {
          totalRecords: 0,
          data: [],
        },
      };
    }

    query.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$campaign_id', new ObjectId(campaign_id)] }],
        },
      },
    });

    query.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$deleted_at', null] }],
        },
      },
    });

    query.push({
      $project: {
        __v: false,
        created_by: false,
        updated_at: false,
        deleted_at: false,
      },
    });

    query.push({
      $project: {
        type: 0,
        notification_content: 0,
        batch: 0,
        execute_schedule: 0,
        is_execute: 0,
        created_at: 0,
      },
    });

    query.push({
      $lookup: {
        from: 'campaignrecipients',
        localField: 'batch',
        foreignField: 'broadcast_batch',
        as: 'recipient_all',
      },
    });

    query.push({
      $lookup: {
        from: 'campaignrecipients',
        let: { broadcast_batch: '$batch' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$broadcast_batch', '$$broadcast_batch'] },
                  { $eq: ['$status', CampaignRecipientStatus.SUCCESS] },
                  { $eq: ['$deleted_at', null] },
                ],
              },
            },
          },
        ],
        as: 'recipient_sent',
      },
    });

    query.push({
      $project: {
        campaign_id: true,
        execute_time: true,
        total_recipients: { $size: '$recipient_all' },
        sent: { $size: '$recipient_sent' },
      },
    });

    query.push({
      $addFields: { failed: { $subtract: ['$total_recipients', '$sent'] } },
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
    }

    const allNoFilter = await this.campaignBroadcastScheduleModel.aggregate(
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

    const data = await this.campaignBroadcastScheduleModel.aggregate(
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

  /**
   * @deprecated
   */
  async addCampaignRecipient(
    file: LocalFileDto,
    body: any,
    // request: any
  ): Promise<CampaignRecipientAddDTOResponse> {
    const response = new CampaignRecipientAddDTOResponse();
    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    body.file = file.originalname;
    response.payload = body;
    let revertFile = false;

    const countMsdn = await this.campaignModel.countDocuments({
      _id: new ObjectId(body.campaign_id),
    });

    if (countMsdn != 1) {
      response.code = HttpCodeTransaction.ERR_NOT_FOUND_404;
      response.message = 'Campaign with that ID is not found.';
      revertFile = true;
    } else {
      if (file.mimetype != 'text/csv') {
        response.code = HttpCodeTransaction.ERR_CONTENT_TYPE_INVALID_400;
        response.message = `File format is wrong, must be text/csv (.csv)`;
        revertFile = true;
      } else {
        // IF misdn & file valid
        const content = fs.readFileSync(file.path, 'utf8');
        const contentAry = content.split('\n');
        const filter = { _id: new ObjectId(body.campaign_id) };
        const update = {
          file_recipient: file.path,
          total_recipient: contentAry.length,
          recipient_uploaded: 0,
          recipient_valid: 0,
        };
        await this.campaignModel.findOneAndUpdate(filter, update);

        const testRegex = new RegExp(
          /^((08|628)+(11|12|13|21|22|23|51|52|53))+([0-9]{1,13})$/,
        );

        for (let index = 0; index < contentAry.length; index++) {
          const incMsisdn = testRegex.test(contentAry[index]) ? 1 : 0;
          const recipts = {
            campaign_id: body.campaign_id,
            status: 'new',
            msisdn: contentAry[index],
            is_valid_msisdn: testRegex.test(contentAry[index]),
          };
          const query = await this.campaignRecipientModel.create(recipts);
          if (query) {
            const update = {
              $inc: {
                recipient_uploaded: 1,
                recipient_valid: incMsisdn,
              },
            };
            await this.campaignModel.findOneAndUpdate(filter, update);
          }
        }
      }
    }

    if (revertFile) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.log(error);
      }
    }
    return response;
  }

  async addCampaignRecipientV2(
    file: any,
    body: any,
    // request: any
  ): Promise<CampaignRecipientAddDTOResponse> {
    const response = new CampaignRecipientAddDTOResponse();
    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    // body.file = file.originalname;
    response.payload = { campaign_id: body.campaign_id };
    let revertFile = false;

    const countMsdn = await this.campaignModel.findOne({
      _id: new ObjectId(body.campaign_id),
    });

    if (!countMsdn) {
      response.code = HttpCodeTransaction.ERR_NOT_FOUND_404;
      response.message = 'Campaign with that ID is not found.';
      revertFile = true;
    } else {
      // IF misdn & file valid
      const content = fs.readFileSync(file, 'utf8');
      const contentAry = content.split('\n');
      const filter = { _id: new ObjectId(body.campaign_id) };
      let update =
        (countMsdn.total_recipient > 0) ?
          {
            file_recipient: file,
            total_recipient: (countMsdn.total_recipient > 0) ? contentAry.length + countMsdn.total_recipient : contentAry.length,
          }
          :
          {
            file_recipient: file,
            total_recipient: contentAry.length,
            recipient_uploaded: 0,
            recipient_valid: 0,
          };

      await this.campaignModel.findOneAndUpdate(filter, update);

      const testRegex = new RegExp(
        /^((08|628)+(11|12|13|21|22|23|51|52|53))+([0-9]{1,13})$/,
      );

      // remove duplicate msisdn in file upload
      const cleanMsisdn = contentAry.map((msisdn) => msisdn.replace(/\r/g, '')); // remove enter
      const uniqueMsisdn = [...new Set(cleanMsisdn)];

      // remove existing msisdn in collection
      const recipients = await this.campaignRecipientModel
        .find({
          campaign_id: new ObjectId(body.campaign_id),
          "deleted_at": null
        })
        .exec();
      const recipientList = recipients.map((item) => item.msisdn);

      const whitlist = uniqueMsisdn.filter((item) => {
        if (recipientList.find((msisdn) => msisdn === item)) {
          // msisdn found in collection, don't add it to list whitelist
          return false;
        } else {
          return true;
        }
      });
      for (let index = 0; index < whitlist.length; index++) {
        if (!whitlist[index]) {
          continue;
        }

        const msisdn = whitlist[index].replace(/\r/g, '').replace(/\t/g, '');
        const incMsisdn = testRegex.test(msisdn) ? 1 : 0;

        const recipts = {
          campaign_id: body.campaign_id,
          status: testRegex.test(msisdn)
            ? CampaignRecipientStatus.NEW
            : CampaignRecipientStatus.INVALID,
          msisdn: msisdn,
          is_valid_msisdn: testRegex.test(msisdn),
        };

        const query = await this.campaignRecipientModel.create(recipts);
        if (query) {
          const update = {
            $inc: {
              recipient_uploaded: 1,
              recipient_valid: incMsisdn,
            },
          };
          await this.campaignModel.findOneAndUpdate(filter, update);
        }
      }
    }

    if (revertFile) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        console.log(error);
      }
    }
    return response;
  }

  async uploadSummaryFile(
    param: any,
  ): Promise<CampaignRecipientAddDTOResponse> {
    const response = new CampaignRecipientAddDTOResponse();
    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.payload = param;

    const countMsdn = await this.campaignModel.countDocuments({
      _id: new ObjectId(param.campaign_id),
      type: CampaignType.BROADCAST,
    });

    if (countMsdn != 1) {
      response.code = HttpCodeTransaction.ERR_NOT_FOUND_404;
      response.message =
        'Campaign with that ID is not found, or campaign type is not ' +
        CampaignType.BROADCAST;
    } else {
      const doc = await this.campaignModel.findOne(
        { _id: new ObjectId(param.campaign_id) },
        'file_recipient total_recipient recipient_uploaded recipient_valid',
      );

      const payload = JSON.parse(JSON.stringify(doc));
      payload.recipient_pending_upload =
        doc.total_recipient - doc.recipient_uploaded;
      payload.recipient_invalid = doc.recipient_uploaded - doc.recipient_valid;
      payload.campaign_id = param.campaign_id;

      response.payload = payload;
    }

    return response;
  }

  async summaryAnalyticPerCampaign(
    param: any,
    campaign_id: string,
  ): Promise<any> {
    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    const checkType = await this.campaignModel.countDocuments({
      _id: new ObjectId(campaign_id),
      type: CampaignType.ANALYTIC,
    });

    if (checkType == 0) {
      return {
        message: HttpStatus.OK,
        payload: {
          totalRecords: 0,
          data: [],
        },
      };
    }

    query.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$campaign_id', new ObjectId(campaign_id)] }],
        },
      },
    });

    query.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$deleted_at', null] }],
        },
      },
    });

    query.push({
      $project: {
        __v: false,
        created_by: false,
        updated_at: false,
        deleted_at: false,
      },
    });

    query.push({
      $project: {
        type: 0,
        notification_content: 0,
        batch: 0,
        execute_schedule: 0,
        is_execute: 0,
        created_at: 0,
      },
    });

    query.push({
      $lookup: {
        from: 'campaignrecipients',
        localField: 'batch',
        foreignField: 'broadcast_batch',
        as: 'recipient_all',
      },
    });

    query.push({
      $lookup: {
        from: 'campaignrecipients',
        let: { broadcast_batch: '$batch' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$broadcast_batch', '$$broadcast_batch'] },
                  { $eq: ['$status', CampaignRecipientStatus.SUCCESS] },
                  { $eq: ['$deleted_at', null] },
                ],
              },
            },
          },
        ],
        as: 'recipient_sent',
      },
    });

    query.push({
      $project: {
        campaign_id: true,
        execute_time: true,
        receiver_total: { $size: '$recipient_all' },
        sent: { $size: '$recipient_sent' },
      },
    });

    query.push({
      $addFields: { failed: { $subtract: ['$receiver_total', '$sent'] } },
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
    }

    const allNoFilter = await this.campaignBroadcastScheduleModel.aggregate(
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

    const data = await this.campaignBroadcastScheduleModel.aggregate(
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

  // async summaryAnalyticPerCampaign(
  //   param: any,
  // ): Promise<CampaignRecipientAddDTOResponse> {

  //   const response = new CampaignRecipientAddDTOResponse();
  //   response.code = HttpCodeTransaction.CODE_SUCCESS_200;
  //   response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
  //   response.payload = param;

  //   const countMsdn = await this.campaignModel.countDocuments(
  //     {_id: new ObjectId(param.campaign_id), type: CampaignType.ANALYTIC}
  //   )

  //   if(countMsdn != 1){
  //     response.code = HttpCodeTransaction.ERR_NOT_FOUND_404;
  //     response.message = "Campaign with that ID is not found, or campaign type is not "+CampaignType.ANALYTIC;
  //   }else{
  //     const doc = await this.campaignModel.findOne(
  //       {_id: new ObjectId(param.campaign_id)},
  //       'execute_time total_recipient recipient_valid sent'
  //     )

  //     let payload:any = {};
  //     payload.campaign_id = param.campaign_id;
  //     payload.execute_time = doc.execute_time;
  //     payload.receiver_total = doc.recipient_valid;
  //     payload.sent = doc.sent;
  //     payload.failed = doc.recipient_valid - doc.sent;

  //     response.payload = payload;
  //   }

  //   return response;
  // }

  async getCoreCustomer(
    token: any,
    filter: any,
  ): Promise<CampaignRecipientAddDTOResponse> {
    const response = new CampaignRecipientAddDTOResponse();
    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;
    response.payload = '';

    const queryFilter = {};

    if (filter.hasOwnProperty('customer_tier')) {
      const objIds = filter.customer_tier.map((item) => {
        return new ObjectId(item);
      });
      const getTier = await this.customerTierModel
        .find({ _id: { $in: objIds } })
        .exec();
      const coreIds = getTier.map((item) => {
        return item.core_id;
      });
      queryFilter['tier_id'] = { $in: coreIds };
    }

    if (filter.hasOwnProperty('customer_brand')) {
      queryFilter['brand'] = { $in: filter.customer_brand };
    }

    if (filter.customer_location !== undefined) {
      queryFilter['$or'] = [
        { kecamatan: { $in: filter.customer_location } },
        { kabupaten: { $in: filter.customer_location } },
        { region_sales: { $in: filter.customer_location } },
        { area_sales: { $in: filter.customer_location } },
      ];
    }

    if (filter.hasOwnProperty('customer_los')) {
      let obj = {};
      if (filter.customer_los.operator === 'LessThan') {
        obj = {
          $lt: filter.customer_los.value_start,
        };
      } else if (filter.customer_los.operator === 'LessOrEqualTo') {
        obj = {
          $lte: filter.customer_los.value_start,
        };
      } else if (filter.customer_los.operator === 'EqualTo') {
        obj = filter.customer_los.value_start;
      } else if (filter.customer_los.operator === 'MoreThan') {
        obj = {
          $gt: filter.customer_los.value_start,
        };
      } else if (filter.customer_los.operator === 'MoreOrEqualTo') {
        obj = {
          $gte: filter.customer_los.value_start,
        };
      } else if (filter.customer_los.operator === 'Ranged') {
        obj = {
          los: {
            $gte: filter.customer_los.value_start,
            $lte: filter.customer_los.value_end,
          },
        };
      }
      queryFilter['los'] = obj;
    }

    if (filter.hasOwnProperty('bcp_name')) {
      if (filter.bcp_name.operator === 'EQUAL') {
        queryFilter['app_name'] = {
          $eq: filter.bcp_name.value,
        };
      } else {
        queryFilter['app_name'] = {
          $ne: filter.bcp_name.value,
        };
      }
    }
    if (filter.hasOwnProperty('bcp_category')) {
      if (filter.bcp_category.operator === 'EQUAL') {
        queryFilter['app_cat'] = {
          $eq: filter.bcp_category.value,
        };
      } else {
        queryFilter['app_cat'] = {
          $ne: filter.bcp_category.value,
        };
      }
    }

    const projection = JSON.stringify({
      id: 1,
      phone: 1,
      nickname: 1,
    });

    const data = await this.customerService.getCoreMemberBySegmentation(
      queryFilter,
      projection,
      token,
    );

    response.payload = data;
    return response;
  }

  async getCoreCustomerSummary(
    param: any,
    token: any,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;

    // param.dataType = "count"; // count, member
    //const dt = await this.getMemberFromCore(param);
    console.log(param);
    const dt = await this.getCoreCustomerSegmentation(param, token);

    response.payload = { total: dt.total };
    return response;
  }

  async getMemberFromCore(param: any): Promise<any> {
    const params = {
      limit: param.limit,
      filter: JSON.parse(param.filter),
    };

    /**
     * ----------------
     * SAMPLE OF PARAM
     * ----------------
     * {
        limit: '10',
        filter: '{"nickname": "sahrulrizal"}',
        auth: 'token',
        dataType: 'member' or 'count'
       }
    */

    const dtMember = await lastValueFrom(
      await this.httpService.get(`${this.core_url}/gateway/v3.0/members`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: param.auth,
        },
        params: params,
      }),
    );

    const dtReturn = dtMember.data.payload.members[0];

    if (param.dataType == 'count') {
      return dtMember.data.payload.members[0].total[0];
    }
    if (param.dataType == 'member') {
      return dtMember.data.payload.members[0].result;
    }

    return dtReturn;
  }

  /**
   * @param param
   * @param token
   */
  async getCustomerCore(param: any, token: any) {
    const response = new GlobalTransactionResponse();
    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS;

    //const dt = await this.getCoreCustomerSegmentation(param, token);
    const limit = 100;
    const allCustomer = [];

    const getCustomer = await this.getCoreCustomerSegmentation(
      param,
      token,
      limit,
      0,
    );

    const total = getCustomer.total;
    allCustomer.push(...getCustomer.data);

    /**
     * Important!
     * Core only can provide 100 data,
     * even you set 1000 for limit
     */
    if (total > limit) {
      let initalSkip = limit;
      const length = Math.ceil(total / limit);

      for (let j = 0; j < length - 1; j++) {
        const paginationCust = await this.getCoreCustomerSegmentation(
          param,
          token,
          limit,
          initalSkip,
        );

        allCustomer.push(...paginationCust.data);
        initalSkip += limit;
      }
    }

    // reformat phone number from core
    for (let i = 0; i < allCustomer.length; i++) {
      try {
        const phone = allCustomer[i]?.phone.split('|')[0];
        allCustomer[i].phone = phone;
      } catch (e) {
        this.logger.error(e);
      }
    }

    response.payload = {
      total: total,
      data: allCustomer,
    };
    return response;
  }

  //async addCampaignRecipient(
  //  data: CampaignRecipientAddDTO,
  //): Promise<CampaignRecipientAddDTOResponse> {
  //  const newData = new this.campaignRecipientModel({
  //    ...data,
  //  });

  //  const process = await newData.save().then(async (returning) => {
  //    return returning;
  //  });

  //  const response = new CampaignRecipientAddDTOResponse();
  //  if (newData && process) {
  //    response.message = 'Campaign Recipient Added Successfully';
  //    response.status = HttpStatus.OK;
  //    response.payload = data;

  //    await this.addCampaignLog({
  //      campaign: process.campaign,
  //      recipient: process._id,
  //      status: 'Campaign Recipient Added Successfully',
  //    });
  //  } else {
  //    response.message = 'Campaign Recipient Failed to Created';
  //    response.status = 400;
  //    response.payload = data;
  //  }
  //  return response;
  //}

  /**
   * @deprecated
   * @param data
   */
  async addCampaignRecipientBulk(data: any): Promise<CampaignAddDTOResponse> {
    const newCampaignRecipient = await this.campaignRecipientModel.insertMany(
      data,
    );
    const newCampaignLog = newCampaignRecipient.map((e) => ({
      campaign: e.campaign,
      recipient: e._id,
      status: 'Data added successfully',
    }));

    this.addCampaignLogBulk(newCampaignLog);

    const response = new CampaignAddDTOResponse();
    if (newCampaignRecipient) {
      response.message = 'Campaign Recipient Imported Successfully';
      response.status = HttpStatus.OK;
      response.payload = data;
    } else {
      response.message = 'Campaign Recipient Failed to Created';
      response.status = 400;
      response.payload = data;
    }
    return response;
  }

  async addCampaignLog(data: any): Promise<CampaignAddDTOResponse> {
    const newCampaignLog = new this.campaignLogModel({
      ...data,
    });

    const process = await newCampaignLog.save().then(async (returning) => {
      return returning;
    });

    const response = new CampaignAddDTOResponse();
    if (newCampaignLog && process) {
      response.message = 'Campaign Log Imported Successfully';
      response.status = HttpStatus.OK;
      response.payload = data;
    } else {
      response.message = 'Campaign Log Failed to Created';
      response.status = 400;
      response.payload = data;
    }
    return response;
  }

  async addCampaignLogBulk(data: any): Promise<CampaignAddDTOResponse> {
    const newCampaignLog = await this.campaignLogModel.insertMany(data);
    const response = new CampaignAddDTOResponse();
    if (newCampaignLog) {
      response.message = 'Campaign Log Imported Successfully';
      response.status = HttpStatus.OK;
      response.payload = data;
    } else {
      response.message = 'Campaign Log Failed to Created';
      response.status = 400;
      response.payload = data;
    }
    return response;
  }

  /*
    Service Add Function :: Closed
  */
  /* ============================== */

  /* ============================== */
  /*
    Service Get Data Function :: Open
  */

  /**
   * Get prime table for broadcast campaign
   * @param param
   */
  async getCampaignPrimeTable(param: any): Promise<any> {
    const response = new GlobalTransactionResponse();

    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    query.push(
      {
        $project: {
          _id: 1,
          type: 1,
          name: 1,
          description: 1,
          notification_config: 1,
          execute_time: 1,
          total_recipient: 1,
          recipient_uploaded: 1,
          recipient_valid: 1,
          sent: 1,
          deleted_at: 1,
          created_at: 1,
          is_cancelled: 1,
          cancelled_at: 1,
          notification_template_id: {
            $toObjectId: '$notification_config.source_id',
          },
        },
      },
      {
        "$addFields": {
          "execute_time_utc": {
            "$dateFromString": {
              "dateString": "$execute_time"
            }
          }
        }
      },
      {
        "$addFields": {
          "execute_time_utc": {
            "$add": [
              "$execute_time_utc",
              { "$multiply": [-7, 3600000] }  // -7 hours converted to milliseconds
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'notificationtemplates',
          let: { notification_template_id: '$notification_template_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$notification_template_id'],
                },
              },
            },
            {
              $project: {
                _id: 1,
                value: '$notif_name',
              },
            },
          ],
          as: 'notif_template',
        },
      },
      {
        $unwind: {
          path: '$notif_template',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'campaignbroadcastschedules',
          let: { campaign_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$campaign_id', '$$campaign_id'] },
                    { $eq: ['$type', BroadcastScheduleType.FIRST] },
                    { $eq: ['$deleted_at', null] },
                  ],
                },
              },
            },
            {
              $project: {
                __v: false,
                execute_time: false,
                execute_schedule: false,
                notification_content: false,
                created_by: false,
                created_at: false,
                updated_at: false,
              },
            },
          ],
          as: 'schedules',
        },
      },
    );

    query.push({
      $match: {
        $expr: {
          $and: [
            { $eq: ['$deleted_at', null] },
            { $eq: ['$type', CampaignType.BROADCAST] },
          ],
        },
      },
    });

    query.push({
      $project: {
        __v: false,
        updated_at: false,
        deleted_at: false,
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
          if (a === 'notif_content') {
            autoColumn['notification_config.content'] = {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            }
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
          if (a === '_id') {
            autoColumn[a] = {
              $eq: new mongoose.Types.ObjectId(filterSet[a].value),
            };
          } else if (a === 'executed') {
            autoColumn['schedules.is_execute'] = filterSet[a].value;
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
        } else if (filterSet[a].matchMode === 'in') {
          autoColumn['notification_config.via.id'] = {
            $in: filterSet[a].value,
          };
        } else if (filterSet[a].matchMode === 'between') {
          if (a === 'execute_time') {
            autoColumn['execute_time_utc'] = {
              $gte: new Date(new Date(`${filterSet[a].value[0]}T17:00:00.000Z`).setDate(new Date(`${filterSet[a].value[0]}T17:00:00.000Z`).getDate() - 1)),
              $lte: new Date(`${filterSet[a].value[1]}T16:59:59.000Z`),
            };
          } else {
            autoColumn[a] = {
              $gte: new Date(new Date(`${filterSet[a].value[0]}T17:00:00.000Z`).setDate(new Date(`${filterSet[a].value[0]}T17:00:00.000Z`).getDate() - 1)),
              $lte: new Date(`${filterSet[a].value[1]}T16:59:59.000Z`),
            };
          }
        }

        delete autoColumn['notif_content'];
        delete autoColumn['notif_via'];
        delete autoColumn['executed'];
        delete autoColumn['execute_time'];

        filter_builder.$and.push(autoColumn);
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    }

    const allNoFilter = await this.campaignModel.aggregate(
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

    const data = await this.campaignModel.aggregate(query, (err, result) => {
      return result;
    });

    // adjustment data
    for (let i = 0; i < data.length; i++) {
      const schedule = data[i].schedules[0];
      data[i].executed = schedule ? schedule.is_execute : false;
      data[i].notif_content = data[i].notification_config.content;
      data[i].notif_via = data[i].notification_config.via;
      delete data[i].schedules;
      delete data[i].notification_config;
    }

    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS_200;
    response.payload = {
      totalRecords: allNoFilter.length,
      data: data,
    };

    return response;
  }

  // async getCampaignPrimeTable(param: any): Promise<any> {
  //   const response = new GlobalTransactionResponse();

  //   const first = parseInt(param.first);
  //   const rows = parseInt(param.rows);
  //   const sortField = param.sortField;
  //   const sortOrder = parseInt(param.sortOrder);
  //   const filters = param.filters;
  //   const query = [];

  //   const sort_set = {};

  //   query.push(
  //     {
  //       $project: {
  //         _id: 1,
  //         type: 1,
  //         name: 1,
  //         description: 1,
  //         notification_config: 1,
  //         execute_time: 1,
  //         total_recipient: 1,
  //         recipient_uploaded: 1,
  //         recipient_valid: 1,
  //         sent: 1,
  //         deleted_at: 1,
  //         created_at: 1,
  //         is_cancelled: 1,
  //         cancelled_at: 1,
  //         notification_template_id: {
  //           $toObjectId: '$notification_config.source_id',
  //         },
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'notificationtemplates',
  //         localField: 'notification_template_id',
  //         foreignField: '_id',
  //         as: 'notif_template',
  //         pipeline: [{ $project: { _id: 1, value: '$notif_name' } }],
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$notif_template',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'campaignbroadcastschedules',
  //         localField: '_id',
  //         foreignField: 'campaign_id',
  //         let: {
  //           campaign_id: '$_id',
  //         },
  //         as: 'schedules',
  //         pipeline: [
  //           {
  //             $project: {
  //               __v: false,
  //               execute_time: false,
  //               execute_schedule: false,
  //               notification_content: false,
  //               created_by: false,
  //               created_at: false,
  //               updated_at: false,
  //             },
  //           },
  //           {
  //             $match: {
  //               $expr: {
  //                 $and: [
  //                   { $eq: ['$campaign_id', '$$campaign_id'] },
  //                   { $eq: ['$type', BroadcastScheduleType.FIRST] },
  //                   { $eq: ['$deleted_at', null] },
  //                 ],
  //               },
  //             },
  //           },
  //         ],
  //       },
  //     },
  //   );

  //   query.push({
  //     $match: {
  //       $expr: {
  //         $and: [
  //           { $eq: ['$deleted_at', null] },
  //           { $eq: ['$type', CampaignType.BROADCAST] },
  //         ],
  //       },
  //     },
  //   });

  //   query.push({
  //     $project: {
  //       __v: false,
  //       updated_at: false,
  //       deleted_at: false,
  //     },
  //   });

  //   const filter_builder = { $and: [] };
  //   const filterSet = filters;
  //   for (const a in filterSet) {
  //     if (
  //       a &&
  //       a !== '' &&
  //       filterSet[a].value !== '' &&
  //       filterSet[a].value !== null
  //     ) {
  //       const autoColumn = {};
  //       if (autoColumn[a] === undefined) {
  //         autoColumn[a] = {};
  //       }

  //       if (filterSet[a].matchMode === 'contains') {
  //         autoColumn[a] = {
  //           $regex: new RegExp(`${filterSet[a].value}`, 'i'),
  //         };
  //       } else if (filterSet[a].matchMode === 'notContains') {
  //         autoColumn[a] = {
  //           $not: {
  //             $regex: new RegExp(`${filterSet[a].value}`, 'i'),
  //           },
  //         };
  //       } else if (filterSet[a].matchMode === 'endsWith') {
  //         autoColumn[a] = {
  //           $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
  //         };
  //       } else if (filterSet[a].matchMode === 'equals') {
  //         if (a === '_id') {
  //           autoColumn[a] = {
  //             $eq: new mongoose.Types.ObjectId(filterSet[a].value),
  //           };
  //         } else {
  //           autoColumn[a] = {
  //             $eq: filterSet[a].value,
  //           };
  //         }
  //       } else if (filterSet[a].matchMode === 'notEquals') {
  //         autoColumn[a] = {
  //           $not: {
  //             $eq: filterSet[a].value,
  //           },
  //         };
  //       }

  //       filter_builder.$and.push(autoColumn);
  //     }
  //   }

  //   if (filter_builder.$and.length > 0) {
  //     query.push({
  //       $match: filter_builder,
  //     });
  //   }

  //   const allNoFilter = await this.campaignModel.aggregate(
  //     query,
  //     (err, result) => {
  //       return result;
  //     },
  //   );

  //   query.push({ $skip: first });

  //   query.push({ $limit: rows });

  //   if (sortField && sortOrder && sortField !== null && sortOrder !== null) {
  //     if (sort_set[sortField] === undefined) {
  //       sort_set[sortField] = sortOrder;
  //     }

  //     query.push({
  //       $sort: sort_set,
  //     });
  //   }

  //   const data = await this.campaignModel.aggregate(query, (err, result) => {
  //     return result;
  //   });

  //   // adjustment data
  //   for (let i = 0; i < data.length; i++) {
  //     const schedule = data[i].schedules[0];
  //     data[i].executed = schedule ? schedule.is_execute : false;
  //     data[i].notif_content = data[i].notification_config.content;
  //     data[i].notif_via = data[i].notification_config.via;
  //     delete data[i].schedules;
  //     delete data[i].notification_config;
  //   }

  //   response.code = HttpCodeTransaction.CODE_SUCCESS_200;
  //   response.message = HttpMsgTransaction.DESC_CODE_SUCCESS_200;
  //   response.payload = {
  //     totalRecords: allNoFilter.length,
  //     data: data,
  //   };

  //   return response;
  // }

  async findCampaignById(id: string): Promise<any> {
    const data = await this.campaignModel.aggregate(
      [
        {
          $match: {
            _id: new Types.ObjectId(id),
            deleted_at: null,
          },
        },
        {
          $lookup: {
            from: 'campaignrecipients',
            localField: '_id',
            foreignField: 'campaign',
            as: 'recipient',
            pipeline: [
              {
                $project: {
                  __v: false,
                  campaign: false,
                  created_by: false,
                  group_name: false,
                  created_at: false,
                  updated_at: false,
                  deleted_at: false,
                },
              },
            ],
          },
        },
        {
          $project: {
            __v: false,
            created_by: false,
            updated_at: false,
            deleted_at: false,
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return data[0];
  }

  async getCampaignRecipientPrimeTable(
    param: any,
    campaign: string,
  ): Promise<any> {
    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    query.push(
      {
        "$match": {
          "$and": [
            {
              "campaign_id": new ObjectId(campaign)
            },
            {
              "deleted_at": null
            }
          ]
        }
      },
      {
        "$project": {
          "__v": false,
          "created_by": false,
          "deleted_at": false
        }
      },
      {
        "$lookup": {
          "from": "campaign_notification_log",
          "as": "log",
          "localField": "_id",
          "foreignField": "campaign_recipient_id"
        }
      },
      {
        "$unwind": {
          "path": "$log",
          "preserveNullAndEmptyArrays": true
        }
      },
      {
        "$addFields": {
          "execute_time_utc": {
            "$cond": {
              "if": {
                "$in": ["$status", ["success", "fail"]]
              },
              "then": "$log.created_at",
              "else": null
            }
          },
          "execute_time": {
            "$cond": {
              "if": {
                "$in": ["$status", ["success", "fail"]]
              },
              "then": {
                "$dateToString": {
                  "format": "%Y-%m-%dT%H:%M:%S",
                  "date": {
                    "$add": "$log.created_at"
                  },
                  "timezone": "Asia/Jakarta"
                }
              },
              "else": null
            }
          }
        }
      },
      {
        "$project": {
          "log": false
        }
      }
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

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      });
    }

    const allNoFilter = await this.campaignRecipientModel.aggregate(
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

    const data = await this.campaignRecipientModel.aggregate(
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

  async findCampaignRecipienById(param: any): Promise<any> {
    const data = await this.campaignRecipientModel.aggregate(
      [
        {
          $match: {
            $and: [{ _id: new Types.ObjectId(param) }, { deleted_at: null }],
          },
        },
        {
          $project: {
            __v: false,
            created_by: false,
            updated_at: false,
            deleted_at: false,
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    return data[0];
  }

  /*
    Service Get Data Function :: Close
  */
  /* ============================== */

  /* ============================== */
  /*
    Service Delete Function :: Open
  */

  /**
   * @deprecated
   * @param param
   */
  async deleteCampaign(param: string): Promise<CampaignDeleteDTOResponse> {
    const process = await this.campaignModel
      .findOneAndDelete({ _id: param })
      .then((results) => {
        return results;
      });

    const response = new CampaignDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Campaign Deleted Successfully';

      await this.addCampaignLog({
        campaign: param,
        status: 'Campaign deleted permanently',
      });
    } else {
      response.status = 400;
      response.message = 'Campaign Failed to Deleted';
    }
    return response;
  }

  /**
   * Soft delete campaign
   * @param id
   */
  async deleteSoftCampaign(id: string): Promise<GlobalTransactionResponse> {

    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'CAMPAIGN_BROADCAST_DELETE';
    response.payload = {};

    const campaignId = new ObjectId(id);
    const query = [];

    // get child
    query.push({
      $lookup: {
        from: 'campaignbroadcastschedules',
        let: { campaign_id: '$_id' },
        as: 'schedules',
        pipeline: [
          {
            $project: {
              __v: false,
              execute_time: false,
              execute_schedule: false,
              notification_content: false,
              created_by: false,
              created_at: false,
              updated_at: false,
            },
          },
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$campaign_id', '$$campaign_id'] },
                  { $eq: ['$deleted_at', null] },
                  { $eq: ['$is_execute', true] },
                ],
              },
            },
          },
        ],
      },
    });

    // set id
    query.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$_id', campaignId] }, { $eq: ['$deleted_at', null] }],
        },
      },
    });

    query.push({ $limit: 1 });

    const getCampaign = await this.campaignModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );
    const campaign = getCampaign[0];
    if (!campaign) {
      response.message = "Can't delete. Campaign Broadcast not found";
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;

      return response;
    }

    if (campaign.schedules.length > 0) {
      response.message = "Can't delete. Broadcast already executed";
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;

      return response;
    }

    return await this.campaignModel
      .findOneAndUpdate(
        { _id: campaignId, type: CampaignType.BROADCAST, deleted_at: null },
        { $currentDate: { deleted_at: { $type: 'date' } } },
      )
      .then(async (results) => {
        return await this.campaignBroadcastScheduleModel
          .findOneAndUpdate(
            {
              campaign_id: campaignId,
              is_execute: false,
              type: BroadcastScheduleType.FIRST,
            },
            {
              deleted_at: new Date(),
            },
          )
          .then(async (_) => {
            // get schedule for first broadcast
            const schedule = await this.campaignBroadcastScheduleModel
              .findOne({
                campaign_id: campaignId,
                is_execute: false,
                type: BroadcastScheduleType.FIRST,
              })
              .exec();

            // If has been cancelled, ignore this process
            if (!results.is_cancelled) {
              const cronName = `${CampaignType.BROADCAST}_${BroadcastScheduleType.FIRST
                }_${id}_${schedule._id.toString()}`;

              const check = this.schedulerRegistry.doesExist('cron', cronName);
              if (check) {
                this.schedulerRegistry.deleteCronJob(cronName);
                this.logger.warn(`Broadcast job ${cronName} has been deleted`);
              }
            }

            await this.campaignRecipientModel.updateMany(
              { campaign_id: campaignId, deleted_at: null },
              { deleted_at: new Date() },
            );

            response.code = HttpCodeTransaction.CODE_SUCCESS_200;
            response.message = 'Campaign Deleted Successfully';
            response.payload = results._id;

            return response;
          })
          .catch(async (res) => {
            response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
            response.message = 'Campaign Failed to Deleted';
            this.logger.error(res);

            return response;
          });
      })
      .catch((err) => {
        response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
        response.message = 'Campaign Failed to Deleted';
        this.logger.error(err);

        return response;
      });
  }

  async addRebroadcastCampaign(
    data: CampaignRebroadcastDTO,
    created_by: any = null,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.payload = {};

    const timeNow = new Date();
    const executeTime = new Date(data.execute_time);
    const cronFormat = dateTimeToCronFormat(executeTime);
    const campaignId = new ObjectId(data.campaign_id);

    if (timeNow.getTime() >= executeTime.getTime()) {
      response.message = 'Date invalid';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_REBROADCAST_ADD';

      return response;
    }

    const campaign = await this.campaignModel
      .findOne({ _id: campaignId, deleted_at: null })
      .exec();

    if (!campaign) {
      response.message = 'Campaign broadcast not found';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_REBROADCAST_ADD';
      return response;
    }

    return await this.campaignBroadcastScheduleModel
      .updateOne(
        {
          campaign_id: campaignId,
          is_execute: false,
          type: BroadcastScheduleType.RE,
          deleted_at: null,
        },
        {
          updated_at: Date.now(),
          campaign_id: data.campaign_id,
          type: BroadcastScheduleType.RE,
          notification_content: data.notif_content,
          execute_time: executeTime,
          execute_schedule: cronFormat,
          is_execute: false,
          batch: `${data.campaign_id.toString()}_${generateRandomStr(
            10,
          )}_${timeNow.toISOString()}`,
          created_by: created_by.id,
        },
        {
          upsert: true,
        },
      )
      .then(async (_) => {
        const updated = await this.campaignBroadcastScheduleModel
          .findOne({
            campaign_id: campaignId,
            is_execute: false,
            type: BroadcastScheduleType.RE,
            deleted_at: null,
          })
          .exec();

        //restart schedule
        const cronName = `${CampaignType.BROADCAST}_${BroadcastScheduleType.RE
          }_${campaignId.toString()}_${updated._id.toString()}`;
        const check = this.schedulerRegistry.doesExist('cron', cronName);
        if (check) {
          await this.schedulerRegistry.deleteCronJob(cronName);
        }

        response.message = 'Campaign rebroadcast schedule updated successfully';
        response.code = HttpCodeTransaction.CODE_SUCCESS_200;
        response.transaction_classify = 'CAMPAIGN_REBROADCAST_ADD';
        response.payload = {
          ...data,
        };

        return response;
      });
  }

  /**
   * Delete rebroadcast campaign
   * @param campaign_id
   * @param created_by
   */
  async deleteRebroadcastCampaign(campaign_id: string, created_by: any = null) {
    const response = new GlobalTransactionResponse();
    response.payload = {};

    const campaignId = new ObjectId(campaign_id);
    const check = await this.campaignBroadcastScheduleModel
      .findOne({
        campaign_id: campaignId,
        is_execute: false,
        type: BroadcastScheduleType.RE,
        created_by: created_by.id,
        deleted_at: null,
      })
      .exec();

    if (!check) {
      response.message = 'Campaign rebroadcast schedule not found';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_REBROADCAST_DELETE';
      return response;
    }

    const scheduleId = check._id;
    return await this.campaignBroadcastScheduleModel
      .updateOne(
        {
          campaign_id: campaignId,
          is_execute: false,
          type: BroadcastScheduleType.RE,
          created_by: created_by.id,
          deleted_at: null,
        },
        {
          deleted_at: new Date(),
        },
      )
      .then(async (_) => {
        //restart schedule
        const cronName = `${CampaignType.BROADCAST}_${BroadcastScheduleType.RE
          }_${campaignId.toString()}_${scheduleId.toString()}`;
        const check = this.schedulerRegistry.doesExist('cron', cronName);
        if (check) {
          await this.schedulerRegistry.deleteCronJob(cronName);
        }
        response.message = 'Campaign rebroadcast schedule delete successfully';
        response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
        response.transaction_classify = 'CAMPAIGN_REBROADCAST_DELETE';

        return response;
      });
  }

  /**
   * Using cron for handle broadcast execute schedule
   * Check every 5 second to launch broadcast schedule if exist
   * After broadcast execute, schedule will remove from cron
   */
  // @Cron(CronExpression.EVERY_5_SECONDS)
  async monitorBroadcast() {
    const schedule = await this.campaignBroadcastScheduleModel
      .findOne({
        $and: [
          { is_execute: false },
          { deleted_at: null },
          { is_cancelled: false },
          { is_processing: false },
        ],
      })
      .sort({ execute_time: 1, created_at: 1 })
      .exec();

    console.log('monitorBroadcast schedule', schedule);

    let result = {};
    const campaign = await this.campaignModel
      .findOne({
        _id: schedule.campaign_id,
        deleted_at: null,
        is_cancelled: false,
      })
      .exec();

    console.log(`monitorBroadcast campaign ${schedule.campaign_id}`, campaign);

    if (campaign) {
      // checking executime schedule
      const timeNow = moment.utc();
      console.log(
        `campaid_id ${schedule.campaign_id.toString()} timeNow =`,
        timeNow.toString(),
      );
      const executeTime = moment.utc(schedule.execute_time);
      console.log(
        `campaid_id ${schedule.campaign_id.toString()} executeTime =`,
        executeTime.toString(),
      );
      console.log(
        `campaid_id ${schedule.campaign_id.toString()} timeNow.isSameOrAfter(executeTime) =`,
        timeNow.isSameOrAfter(executeTime),
      );
      if (timeNow.isSameOrAfter(executeTime)) {
        const cronName =
          `${campaign.type}_` +
          `${schedule.type}_` +
          `${schedule.campaign_id.toString()}_` +
          schedule._id.toString();

        console.log(
          `campaid_id ${schedule.campaign_id.toString()} cronName =`,
          cronName,
        );

        const check = this.schedulerRegistry.doesExist('cron', cronName);
        if (!check) {
          console.log(
            `campaid_id ${schedule.campaign_id.toString()} checking cron =`,
            check,
          );
          // override execute_schedule
          const executeTimeScheduler = new Date();
          executeTimeScheduler.setSeconds(
            executeTimeScheduler.getSeconds() + 30,
          );
          const cronSchedule = dateTimeToCronFormat(executeTimeScheduler);
          console.log(
            `New Campaign  ${schedule.campaign_id.toString()} Schedule Cron`,
            executeTimeScheduler,
          );
          console.log(
            `New Campaign  ${schedule.campaign_id.toString()} Schedule Cron cronFormat`,
            cronSchedule,
          );

          const payload = {
            cron_name: cronName,
            campaign,
            schedule,
          };

          await firstValueFrom(this.client.emit('campaign', payload)).then(
            () => {
              console.log(`cron_name ${cronName} emit to topic campaign`);
            },
          );

          const job = new CronJob(cronSchedule, async () => {
            // send to redis
            const payload = {
              cron_name: cronName,
              campaign,
              schedule,
            };

            // set topic base by type
            let redisTopic = 'broadcast-now';
            if (schedule.type === BroadcastScheduleType.RE) {
              redisTopic = 'rebroadcast-now';
            }

            await this.loadFileQueue
              .add(redisTopic, payload, {
                removeOnComplete: true,
                removeOnFail: true,
              })
              .then((job) => {
                return { job: job.id };
              })
              .catch((err) => {
                console.log(err);
              });
          });

          // this.schedulerRegistry.addCronJob(cronName, job);
          // job.start();
          this.logger.warn(`Job for ${cronName} has started...`);
          result = {
            cronName,
            campaign,
            schedule,
          };

          await this.campaignBroadcastScheduleModel
            .updateOne(
              {
                _id: schedule._id,
              },
              {
                is_processing: true,
              },
            )
            .then((res) => {
              console.log(
                `update to processing campaign ${schedule.campaign_id} schedule ${schedule._id}`,
              );
              console.log(res);
            });
        }
      }
    }

    return result;
  }

  async exportFailedCampaignRecipient(res, param) {
    const failedStatus = [
      CampaignRecipientStatus.FAIL,
      CampaignRecipientStatus.INVALID,
    ];

    const query = [
      {
        $match: {
          $and: [
            { campaign_id: new Types.ObjectId(param) },
            {
              status: {
                $in: failedStatus,
              },
            },
            { deleted_at: null },
          ],
        },
      },
    ];

    const data = await this.campaignRecipientModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    let buffer = ['msisdn|status'];
    const bufferData = data.map((el) => `${el.msisdn}|${el.status}`);

    buffer = buffer.concat(bufferData);

    res.set({
      'Content-Disposition': `attachment; filename="campaign-${param}.txt"`,
    });

    return new StreamableFile(Buffer.from(buffer.join('\n'), 'utf-8'));
  }

  /**
   *
   * @param data
   * @param created_by
   */
  async addRebroadcastCampaignAnalytic(
    data: CampaignRebroadcastDTO,
    created_by: any = null,
  ) {
    const response = new GlobalTransactionResponse();
    response.payload = {};

    const timeNow = new Date();
    const executeTime = new Date(data.execute_time);
    const cronFormat = dateTimeToCronFormat(executeTime);
    const campaignId = new ObjectId(data.campaign_id);

    if (timeNow.getTime() >= executeTime.getTime()) {
      response.message = 'Date invalid';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_REBROADCAST_ADD';

      return response;
    }

    const campaign = await this.campaignModel
      .findOne({ _id: campaignId, deleted_at: null })
      .exec();

    if (!campaign) {
      response.message = 'Campaign analytic not found';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_ANALYTIC_REBROADCAST_ADD';
      return response;
    }

    return await this.campaignBroadcastScheduleModel
      .updateOne(
        {
          campaign_id: campaignId,
          is_execute: false,
          type: BroadcastScheduleType.RE,
          deleted_at: null,
        },
        {
          updated_at: Date.now(),
          campaign_id: data.campaign_id,
          type: BroadcastScheduleType.RE,
          notification_content: data.notif_content,
          execute_time: executeTime,
          execute_schedule: cronFormat,
          is_execute: false,
          batch: `${data.campaign_id.toString()}_${generateRandomStr(
            10,
          )}_${timeNow.toISOString()}`,
          created_by: created_by.id,
        },
        {
          upsert: true,
        },
      )
      .then(async (_) => {
        const updated = await this.campaignBroadcastScheduleModel
          .findOne({
            campaign_id: campaignId,
            is_execute: false,
            type: BroadcastScheduleType.RE,
            deleted_at: null,
          })
          .exec();

        //restart schedule
        const cronName = `${campaign.type}_${BroadcastScheduleType.RE
          }_${campaignId.toString()}_${updated._id.toString()}`;
        const check = this.schedulerRegistry.doesExist('cron', cronName);
        if (check) {
          await this.schedulerRegistry.deleteCronJob(cronName);
        }

        response.message =
          'Campaign analytic rebroadcast schedule updated successfully';
        response.code = HttpCodeTransaction.CODE_SUCCESS_200;
        response.transaction_classify = 'CAMPAIGN_ANALYTIC_REBROADCAST_ADD';
        response.payload = {
          ...data,
        };

        return response;
      });
  }

  /**
   * Delete rebroadcast campaign analytic
   * @param campaign_id
   * @param created_by
   */
  async deleteRebroadcastCampaignAnalytic(
    campaign_id: string,
    created_by: any = null,
  ) {
    const response = new GlobalTransactionResponse();
    response.payload = {};

    const campaignId = new ObjectId(campaign_id);
    const check = await this.campaignBroadcastScheduleModel
      .findOne({
        campaign_id: campaignId,
        is_execute: false,
        type: BroadcastScheduleType.RE,
        created_by: created_by.id,
        deleted_at: null,
      })
      .exec();

    if (!check) {
      response.message = 'Campaign analytic rebroadcast schedule not found';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_ANALYTIC_REBROADCAST_DELETE';
      return response;
    }

    const scheduleId = check._id;
    return await this.campaignBroadcastScheduleModel
      .updateOne(
        {
          campaign_id: campaignId,
          is_execute: false,
          type: BroadcastScheduleType.RE,
          created_by: created_by.id,
          deleted_at: null,
        },
        {
          deleted_at: new Date(),
        },
      )
      .then(async (_) => {
        //restart schedule
        const cronName = `${CampaignType.ANALYTIC}_${BroadcastScheduleType.RE
          }_${campaignId.toString()}_${scheduleId.toString()}`;
        const check = this.schedulerRegistry.doesExist('cron', cronName);
        if (check) {
          await this.schedulerRegistry.deleteCronJob(cronName);
          console.log('Delete ' + cronName);
        }
        response.message =
          'Campaign analytic rebroadcast schedule delete successfully';
        response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
        response.transaction_classify = 'CAMPAIGN_ANALYTIC_REBROADCAST_DELETE';

        return response;
      });
  }

  /**
   * Campaign analytic add data
   * @param campaignData
   * @param created_by
   * @param token
   */
  async addCampaignAnalytic(
    campaignData: CampaignAnalyticAddDTO,
    created_by: any = null,
    token: any = '',
  ) {
    const response = new GlobalTransactionResponse();
    response.payload = {};

    // check date
    const timeNow = new Date();
    const executeTime = new Date(campaignData.execute_time);
    if (timeNow.getTime() >= executeTime.getTime()) {
      response.message = 'Date invalid';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_ANALYTIC_ADD';
    }

    const notifVia = [];
    for (let i = 0; i < campaignData.notif_via.length; i++) {
      const lov = await this.lovModel
        .findOne({
          _id: new ObjectId(campaignData.notif_via[i].toString()),
          deleted_at: null,
        })
        .exec();

      if (lov) {
        notifVia.push({
          id: lov._id.toString(),
          value: lov.set_value,
        });
      }
    }

    const notifConfig = new CampaignNotificationConfig(
      campaignData.notification_template,
      this.notifType,
      notifVia,
      campaignData.notification_content,
    );

    const additionalData = {
      keyword: campaignData.keyword,
      segmentation: campaignData.segmentation,
    };

    const cronFormat = dateTimeToCronFormat(executeTime);
    const newCampaign = new this.campaignModel({
      type: CampaignType.ANALYTIC,
      name: campaignData.name,
      description: campaignData.description,
      notification_config: notifConfig,
      execute_time: campaignData.execute_time,
      additional: additionalData,
      total_recipient: 0,
      recipient_uploaded: 0,
      recipient_valid: 0,
      sent: 0,
      created_by: created_by.id,
    });

    // return created campaign
    return await newCampaign
      .save()
      .then(async (result) => {
        const schedule = new this.campaignBroadcastScheduleModel({
          campaign_id: result._id,
          type: BroadcastScheduleType.FIRST,
          notification_content: campaignData.notification_content,
          execute_time: executeTime,
          execute_schedule: cronFormat,
          is_execute: false,
          batch: `${result._id.toString()}_${generateRandomStr(
            10,
          )}_${timeNow.toISOString()}`,
        });

        // set payload
        const payload = {
          filter: campaignData.segmentation,
          token: token,
          campaign_id: result._id,
        };

        // insert customer by filter segmentation, with queue process
        await this.loadFileQueue
          .add('analytic-customer', payload, { removeOnComplete: true })
          .then((job) => {
            return { job: job.id };
          })
          .catch((err) => {
            this.logger.error(err);
          });

        return await schedule
          .save()
          .then(async (_) => {
            response.message = 'Campaign created successfully';
            response.code = HttpCodeTransaction.CODE_SUCCESS_200;
            response.transaction_classify = 'CAMPAIGN_BROADCAST_ADD';
            response.payload = {
              _id: result._id.toString(),
              ...campaignData,
            };

            return response;
          })
          .catch(async (err) => {
            response.message = 'Campaign failed to created';
            response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
            this.logger.error(err);

            return response;
          });
      })
      .catch(async (err) => {
        response.message = 'Campaign failed to created';
        response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
        this.logger.error(err);

        return response;
      });
  }

  /**
   * For update campaign before execute
   * @param campaignData
   * @param id
   * @param token
   */
  async editCampaignAnalytic(
    campaignData: CampaignAnalyticEditDTO,
    id: string,
    token: any = '',
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.payload = {};
    const campaignId = new ObjectId(id);

    const timeNow = new Date();
    const executeTime = new Date(campaignData.execute_time);
    if (timeNow.getTime() >= executeTime.getTime()) {
      response.message = 'Date invalid';
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_ANALYTIC_BROADCAST_EDIT';
    }

    const notifVia = [];
    for (let i = 0; i < campaignData.notif_via.length; i++) {
      const lov = await this.lovModel
        .findOne({
          _id: new ObjectId(campaignData.notif_via[i].toString()),
          deleted_at: null,
        })
        .exec();

      if (lov) {
        notifVia.push({
          id: lov._id.toString(),
          value: lov.set_value,
        });
      }
    }

    const dataSchedule = await this.campaignBroadcastScheduleModel
      .findOne({
        campaign_id: campaignId,
        type: BroadcastScheduleType.FIRST,
        is_execute: false,
        deleted_at: null,
      })
      .exec();

    if (!dataSchedule) {
      response.message = "Can't update. Broadcast already executed or deleted";
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.transaction_classify = 'CAMPAIGN_ANALYTIC_BROADCAST_EDIT';

      return response;
    }

    // set notif config
    const notifConfig = new CampaignNotificationConfig(
      campaignData.notification_template,
      this.notifType,
      campaignData.notif_via,
      campaignData.notification_content,
    );
    const cronFormat = dateTimeToCronFormat(executeTime);

    return await this.campaignModel
      .findOneAndUpdate(
        { _id: campaignId, deleted_at: null },
        {
          updated_at: Date.now(),
          name: campaignData.name,
          description: campaignData.description,
          notification_config: notifConfig,
          execute_time: campaignData.execute_time,
          type: CampaignType.ANALYTIC,
          additional: {
            keyword: campaignData.keyword,
            segmentation: campaignData.segmentation,
          },
        },
      )
      .then(async (result) => {
        return await this.campaignBroadcastScheduleModel
          .findOneAndUpdate(
            { _id: dataSchedule._id },
            {
              updated_at: Date.now(),
              notification_content: campaignData.notification_content,
              execute_time: campaignData.execute_time,
              execute_schedule: cronFormat,
            },
          )
          .then(async (_) => {
            // delete cronjob after update
            const cronName = `${CampaignType.ANALYTIC}_${BroadcastScheduleType.FIRST
              }_${id}_${dataSchedule._id.toString()}`;
            this.schedulerRegistry.deleteCronJob(cronName);
            this.logger.warn(
              `Campaign Analytic Broadcast job ${cronName} has been deleted`,
            );

            // todo: if segmentation filter change, delete all registered customer
            //   and insert new list msisdn

            // clean receiver
            await this.campaignRecipientModel.deleteMany({
              campaign_id: campaignId,
              deleted_at: null,
            });

            // set payload
            const payload = {
              filter: campaignData.segmentation,
              token: token,
              campaign_id: campaignId,
            };

            // insert customer by filter segmentation, with queue process
            await this.loadFileQueue
              .add('analytic-customer', payload, { removeOnComplete: true })
              .then((job) => {
                return { job: job.id };
              })
              .catch((err) => {
                this.logger.error(err);
              });

            response.code = HttpCodeTransaction.CODE_SUCCESS_200;
            response.message = 'Campaign updated successfully';
            response.transaction_classify = 'CAMPAIGN_ANALYTIC_BROADCAST_EDIT';
            response.payload = {
              _id: result._id.toString(),
              ...campaignData,
            };

            return response;
          })
          .catch(async (err) => {
            response.message = 'Campaign failed to updated';
            response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
            this.logger.error(err);

            return response;
          });
      })
      .catch(async (err) => {
        response.message = 'Campaign failed to updated';
        response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
        this.logger.error(err);

        return response;
      });
  }

  /**
   * Soft delete campaign analytic
   * @param id
   */
  async deleteSoftCampaignAnalytic(
    id: string,
  ): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.payload = {};
    response.transaction_classify = 'CAMPAIGN_ANALYTIC_BROADCAST_DELETE';

    const campaignId = new ObjectId(id);
    const query = [];

    // get child
    query.push({
      $lookup: {
        from: 'campaignbroadcastschedules',
        let: { campaign_id: '$_id' },
        as: 'schedules',
        pipeline: [
          {
            $project: {
              __v: false,
              execute_time: false,
              execute_schedule: false,
              notification_content: false,
              created_by: false,
              created_at: false,
              updated_at: false,
            },
          },
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$campaign_id', '$$campaign_id'] },
                  { $eq: ['$deleted_at', null] },
                  { $eq: ['$is_execute', true] },
                ],
              },
            },
          },
        ],
      },
    });

    // set id
    query.push({
      $match: {
        $expr: {
          $and: [{ $eq: ['$_id', campaignId] }, { $eq: ['$deleted_at', null] }],
        },
      },
    });

    query.push({ $limit: 1 });

    const getCampaign = await this.campaignModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );
    const campaign = getCampaign[0];

    if (!campaign) {
      response.message = "Can't delete. Campaign Analytic Broadcast not found";
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;

      return response;
    }

    if (campaign.schedules.length > 0) {
      response.message = "Can't delete. Broadcast already executed";
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      return response;
    }

    return await this.campaignModel
      .findOneAndUpdate(
        { _id: campaignId, type: CampaignType.ANALYTIC, deleted_at: null },
        { $currentDate: { deleted_at: { $type: 'date' } } },
      )
      .then(async (results) => {
        return await this.campaignBroadcastScheduleModel
          .findOneAndUpdate(
            {
              campaign_id: campaignId,
              is_execute: false,
              type: BroadcastScheduleType.FIRST,
            },
            {
              deleted_at: new Date(),
            },
          )
          .then(async (_) => {
            // get schedule for first broadcast
            const schedule = await this.campaignBroadcastScheduleModel
              .findOne({
                campaign_id: campaignId,
                is_execute: false,
                type: BroadcastScheduleType.FIRST,
              })
              .exec();

            const cronName = `${CampaignType.ANALYTIC}_${BroadcastScheduleType.FIRST
              }_${id}_${schedule._id.toString()}`;
            this.schedulerRegistry.deleteCronJob(cronName);
            this.logger.warn(
              `Campaign Analytic Broadcast job ${cronName} has been deleted...`,
            );

            await this.campaignRecipientModel.updateMany(
              { campaign_id: campaignId, deleted_at: null },
              { deleted_at: new Date() },
            );

            response.code = HttpCodeTransaction.CODE_SUCCESS_200;
            response.message = 'Campaign Deleted Successfully';
            response.payload = results._id;

            return response;
          })
          .catch(async (res) => {
            response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
            response.message = 'Campaign Failed to Deleted';
            this.logger.error(res);

            return response;
          });
      })
      .catch((err) => {
        response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
        response.message = 'Campaign Failed to Deleted';
        this.logger.error(err);

        return response;
      });
  }

  /**
   * Get prime table for broadcast campaign
   * @param param
   */
  async getCampaignAnayliticPrimeTable(param: any): Promise<any> {
    const response = new GlobalTransactionResponse();

    const first = parseInt(param.first);
    const rows = parseInt(param.rows);
    const sortField = param.sortField;
    const sortOrder = parseInt(param.sortOrder);
    const filters = param.filters;
    const query = [];

    const sort_set = {};

    query.push({
      $lookup: {
        from: 'campaignbroadcastschedules',
        let: { campaign_id: '$_id' },
        as: 'schedules',
        pipeline: [
          {
            $project: {
              __v: false,
              execute_time: false,
              execute_schedule: false,
              notification_content: false,
              created_by: false,
              created_at: false,
              updated_at: false,
            },
          },
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$campaign_id', '$$campaign_id'] },
                  { $eq: ['$type', BroadcastScheduleType.FIRST] },
                  { $eq: ['$deleted_at', null] },
                ],
              },
            },
          },
        ],
      },
    });

    query.push({
      $match: {
        $expr: {
          $and: [
            { $eq: ['$deleted_at', null] },
            { $eq: ['$type', CampaignType.ANALYTIC] },
          ],
        },
      },
    });

    query.push({
      $project: {
        __v: false,
        created_by: false,
        updated_at: false,
        deleted_at: false,
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
    }

    const allNoFilter = await this.campaignModel.aggregate(
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

    const data = await this.campaignModel.aggregate(query, (err, result) => {
      return result;
    });

    // adjustment data
    for (let i = 0; i < data.length; i++) {
      const schedule = data[i].schedules[0];
      data[i].executed = schedule ? schedule.is_execute : false;
      data[i].notif_template = data[i].notification_config.source_id;
      data[i].notif_content = data[i].notification_config.content;
      data[i].notif_via = data[i].notification_config.via;
      delete data[i].schedules;
      delete data[i].notification_config;
    }

    response.code = HttpCodeTransaction.CODE_SUCCESS_200;
    response.message = HttpMsgTransaction.DESC_CODE_SUCCESS_200;
    response.payload = {
      totalRecords: allNoFilter.length,
      data: data,
    };

    return response;
  }

  /**
   * Get customer by segmentation filter for campaign analytic
   * Integrated with core
   * Data can get from core only 100, so limit max is 100
   * @param filter
   * @param token
   * @param skip
   * @param limit
   */
  async getCoreCustomerSegmentation(
    filter: any,
    token: any,
    limit = null,
    skip = null,
  ) {
    const queryFilter = {};

    if (filter.customer_location !== undefined) {
      queryFilter['$or'] = [
        { kecamatan: { $in: filter.customer_location } },
        { kabupaten: { $in: filter.customer_location } },
        { region_sales: { $in: filter.customer_location } },
        { area_sales: { $in: filter.customer_location } },
      ];
    }

    if (filter.hasOwnProperty('customer_brand')) {
      queryFilter['brand'] = { $in: filter.customer_brand };
    }

    if (filter.hasOwnProperty('customer_los')) {
      let obj = {};
      if (filter.customer_los.operator === 'LessThan') {
        obj = {
          $lt: filter.customer_los.value_start,
        };
      } else if (filter.customer_los.operator === 'LessOrEqualTo') {
        obj = {
          $lte: filter.customer_los.value_start,
        };
      } else if (filter.customer_los.operator === 'EqualTo') {
        obj = filter.customer_los.value_start;
      } else if (filter.customer_los.operator === 'MoreThan') {
        obj = {
          $gt: filter.customer_los.value_start,
        };
      } else if (filter.customer_los.operator === 'MoreOrEqualTo') {
        obj = {
          $gte: filter.customer_los.value_start,
        };
      } else if (filter.customer_los.operator === 'Ranged') {
        obj = {
          los: {
            $gte: filter.customer_los.value_start,
            $lte: filter.customer_los.value_end,
          },
        };
      }

      queryFilter['los'] = obj;
    }

    if (filter.hasOwnProperty('customer_tier')) {
      const objIds = filter.customer_tier.map((item) => {
        return new ObjectId(item);
      });

      const getTier = await this.customerTierModel
        .find({ _id: { $in: objIds } })
        .exec();

      const coreIds = getTier.map((item) => {
        return item.core_id;
      });

      queryFilter['tier_id'] = { $in: coreIds };
    }

    if (filter.hasOwnProperty('bcp_name')) {
      if (filter.bcp_name.operator === 'EQUAL') {
        queryFilter['app_name'] = {
          $eq: filter.bcp_name.value,
        };
      } else {
        queryFilter['app_name'] = {
          $ne: filter.bcp_name.value,
        };
      }
    }

    if (filter.hasOwnProperty('bcp_category')) {
      if (filter.bcp_category.operator === 'EQUAL') {
        queryFilter['app_cat'] = {
          $eq: filter.bcp_category.value,
        };
      } else {
        queryFilter['app_cat'] = {
          $ne: filter.bcp_category.value,
        };
      }
    }

    // todo, filter by point range
    // todo, filter by most redeem trx

    const projection = JSON.stringify({
      id: 1,
      phone: 1,
      nickname: 1,
    });

    const data = await this.customerService.getCoreMemberBySegmentation(
      queryFilter,
      projection,
      token,
      limit,
      skip,
    );

    return data;
  }

  async cancelCampaign(id: string): Promise<GlobalTransactionResponse> {
    const response = new GlobalTransactionResponse();
    response.transaction_classify = 'CAMPAIGN_BROADCAST_CANCELLED';
    response.payload = {};

    const campaignId = new ObjectId(id);
    const query = [];

    query.push({
      $match: {
        _id: campaignId,
        deleted_at: null,
        is_cancelled: false,
        // $expr: {
        //   $and: [{ $eq: ['$_id', campaignId] }, { $eq: ['$deleted_at', null] }],
        // },
      },
    });

    // get child
    query.push({
      $lookup: {
        from: 'campaignbroadcastschedules',
        let: { campaign_id: '$_id' },
        as: 'schedules',
        pipeline: [
          {
            $project: {
              __v: false,
              execute_time: false,
              execute_schedule: false,
              notification_content: false,
              created_by: false,
              created_at: false,
              updated_at: false,
            },
          },
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$campaign_id', '$$campaign_id'] },
                  { $eq: ['$deleted_at', null] },
                  { $eq: ['$is_execute', true] },
                ],
              },
            },
          },
        ],
      },
    });

    // set id
    query.push({ $limit: 1 });

    const getCampaign = await this.campaignModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );
    const campaign = getCampaign[0];

    if (!campaign) {
      response.message = "Can't cancelled. Campaign Broadcast not found";
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;

      return response;
    }

    // if (campaign.schedules.length > 0) {
    //   response.message = "Can't cancelled. Broadcast already executed";
    //   response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
    //   return response;
    // }

    return await this.campaignModel
      .findOneAndUpdate(
        {
          _id: campaignId,
          type: CampaignType.BROADCAST,
          deleted_at: null,
          is_cancelled: false,
        },
        {
          $currentDate: { cancelled_at: { $type: 'date' } },
          is_cancelled: true,
        },
      )
      .then(async (results) => {
        return await this.campaignBroadcastScheduleModel
          .findOneAndUpdate(
            {
              campaign_id: campaignId,
              // is_execute: false,
              type: BroadcastScheduleType.FIRST,
            },
            {
              cancelled_at: new Date(),
              is_cancelled: true,
            },
          )
          .then(async (_) => {
            // get schedule for first broadcast
            const schedule = await this.campaignBroadcastScheduleModel
              .findOne({
                campaign_id: campaignId,
                is_cancelled: true,
                type: BroadcastScheduleType.FIRST,
              })
              .exec();

            const cronName = `${CampaignType.BROADCAST}_${BroadcastScheduleType.FIRST
              }_${id}_${schedule._id.toString()}`;

            const check = this.schedulerRegistry.doesExist('cron', cronName);
            if (check) {
              this.schedulerRegistry.deleteCronJob(cronName);
              this.logger.warn(`Broadcast job ${cronName} has been deleted...`);
            }

            await this.campaignRecipientModel.updateMany(
              {
                campaign_id: campaignId,
                status: { $ne: CampaignRecipientStatus.SUCCESS },
              },
              { cancelled_at: new Date(), is_cancelled: true },
            );

            response.code = HttpCodeTransaction.CODE_SUCCESS_200;
            response.message = 'Campaign Cancel Successfully';
            response.payload = results._id;

            return response;
          })
          .catch(async (res) => {
            response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
            response.message = 'Campaign Failed to Cancel';
            this.logger.error(res);

            return response;
          });
      })
      .catch((err) => {
        response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
        response.message = 'Campaign Failed to Cancel';
        this.logger.error(err);

        return response;
      });
  }

  async getCampaignRecipientSummary(campaign_id: string) {
    const data = await this.campaignRecipientModel.aggregate([
      {
        $match: {
            campaign_id: new ObjectId(campaign_id), deleted_at: null    
        },
      },
      {
        $group: {
          _id: {
            campaign_id: "$campaign_id",
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          campaign_id: "$_id.campaign_id",
          status: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id.status", "success"] }, then: "total_delivered" },
                { case: { $eq: ["$_id.status", "fail"] }, then: "total_undelivered" }
              ],
              default: "$_id.status"
            }
          },
          count: 1
        }
      },
      {
        $group: {
          _id: "$campaign_id",
          counts: {
            $push: {
              k: "$status",
              v: "$count"
            }
          }
        }
      },
      {
        $addFields: {
          counts: {
            $arrayToObject: {
              $concatArrays: [
                [
                  { k: "new", v: 0 },
                  { k: "processing", v: 0 },
                  { k: "total_delivered", v: 0 },
                  { k: "total_undelivered", v: 0 },
                  { k: "invalid", v: 0 }
                ],
                "$counts"
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          campaign_id: "$_id",
          statusCounts: "$counts"
        }
      }
    ]);

    const dataSummary = (data.length) ? 
    {
      totalRecords: data.length,
      data: data[0],
    } :
    {
      totalRecords: 1,
      data: {
        campaign_id: campaign_id,
        statusCounts: {
          "new": 0,
          "processing": 0,
          "total_delivered": 0,
          "total_undelivered": 0,
          "invalid": 0
        }
      },
    };

    return {
      message: HttpStatus.OK,
      payload: dataSummary,
    };
  }

  async deleteRecipient(payload: {
    campaign_id?: string,
    recipient_id?: string,
    type: number,
    credential: any
  }) {
    const response = new GlobalTransactionResponse();

    let query;
    let update = {
      deleted_at: new Date(),
      deleted_by: payload.credential._id
    };

    switch (payload.type) {
      case TypeRecipientDeleteProcess.All:
        query = { campaign_id: new ObjectId(payload.campaign_id), deleted_at: null };
        break;

      case TypeRecipientDeleteProcess.INVALID:
        query = { campaign_id: new ObjectId(payload.campaign_id), deleted_at: null, is_valid_msisdn: false };
        break;

      case TypeRecipientDeleteProcess.SINGLE:
        query = { _id: new ObjectId(payload.recipient_id), deleted_at: null };
        break;

      default:
        query = null;
        update = null
        break;
    }

    try {
      const deleteCount = await this.campaignRecipientModel.updateMany(query, update);
      if (deleteCount.modifiedCount > 0) {
        let updateCampaingCalculate;
        let campaginId = (payload.campaign_id) ? payload.campaign_id : null;
        switch (payload.type) {
          case TypeRecipientDeleteProcess.All:
            updateCampaingCalculate = {
              recipient_uploaded: 0,
              recipient_valid: 0,
              total_recipient: 0
            };
            break;
          case TypeRecipientDeleteProcess.INVALID:
            updateCampaingCalculate = {
              $inc: {
                recipient_uploaded: -deleteCount.modifiedCount,
                total_recipient: -deleteCount.modifiedCount,
              },
            };
            break;
          case TypeRecipientDeleteProcess.SINGLE:
            const recipientData = await this.campaignRecipientModel.findOne({
              _id: new ObjectId(payload.recipient_id)
            })
            campaginId = recipientData.campaign_id.toString();
            if (recipientData.is_valid_msisdn) {
              updateCampaingCalculate = {
                $inc: {
                  recipient_uploaded: -deleteCount.modifiedCount,
                  total_recipient: -deleteCount.modifiedCount,
                  recipient_valid: -deleteCount.matchedCount
                },
              }
            } else {
              updateCampaingCalculate = {
                $inc: {
                  recipient_uploaded: -deleteCount.modifiedCount,
                  total_recipient: -deleteCount.modifiedCount,
                },
              }
            }
            break;
        }

        await this.campaignModel.findOneAndUpdate(new ObjectId(campaginId), updateCampaingCalculate);
      }

      response.code = HttpCodeTransaction.CODE_SUCCESS_200;
      response.message = 'Recipient Deleted Successfully';
      response.payload = deleteCount;

      return response;
    } catch (err) {
      response.code = HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400;
      response.message = 'Recipient Failed to Delete';
      this.logger.error(err);
      return response;
    }
  }
}
