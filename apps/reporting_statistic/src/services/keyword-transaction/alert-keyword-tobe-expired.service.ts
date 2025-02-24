import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import moment from 'moment-timezone';
import { Model } from 'mongoose';

import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { PIC, PICDocument } from '@/pic/models/pic.model';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';
import { tableGenerate } from '../../helpers/html.generatate';
import { QuotaStockPerProgramDTO } from '../quota-stock-daily/dto/quota-stock-alert.dto';
import { ALERT_KEYWORD_TOBE_EXPIRED_AGGREGATION } from './alert-keyword-tobe-expired.const';
import { AlertKeywordTobeExpired } from './dto/alert-keyword-tobe-expired.dto';

@Injectable()
export class AlertKeywordTobeExpiredService {
  constructor(
    @InjectModel(ProgramV2.name) private programModel: Model<ProgramV2Document>,
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
    @InjectModel(Lov.name) private lovModel: Model<LovDocument>,
    @InjectModel(PIC.name) private picModel: Model<PICDocument>,
    @Inject('NOTIFICATION_GENERAL_PRODUCER')
    private readonly notificationGeneralClient: ClientKafka,
  ) {}

  async generateReportingKeywordTobeExpired(
    payload: any,
  ): Promise<ReportingServiceResult> {
    try {
      const amount: number = payload.threshold.amount;
      const unit: string = payload.threshold.unit;
      const moment = require('moment-timezone');
      const thresholdDate = new Date(moment().add(amount, unit));
      await this.getData(thresholdDate).then(async (data) => {
        console.log('get data' + JSON.stringify(data));
        await this.generateHTML(payload, data).then(async (bodyHtml) => {
          console.log('html generation' + bodyHtml);
          const notificationPayload = {
            origin: payload.origin,
            tracing_id: false,
            tracing_master_id: false,
            notification: [],
          };
          for (let i = 0; i < payload.parameter.notification.to.length; i++) {
            notificationPayload.notification.push({
              via: payload.parameter?.notification?.via,
              template_content: bodyHtml,
              param: {
                to: payload.parameter.notification.to[i],
                cc: payload.parameter.notification.cc[i],
                html: bodyHtml,
                subject: payload.parameter.notification.subject,
              },
            });
          }
          await this.notificationGeneralClient.emit(
            payload.target_topic,
            notificationPayload,
          );
        });
        //.catch((e) => {
        //  console.error(e);
        //});
      });
      //.catch((e) => {
      //  console.error(e);
      //});

      return new ReportingServiceResult({
        is_error: false,
        message: 'Success Generate ReportingKeyword Tobe Expired',
      });
    } catch (error) {
      return new ReportingServiceResult({
        is_error: true,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  async generateReportingKeywordTobeExpiredSentNotifByPIC(
    payload: any,
  ): Promise<any> {
    const group_name = payload?.group_name;
    const set_value = payload?.set_value;
    this.lovModel
      .findOne({
        group_name: group_name,
        set_value: set_value,
      })
      .exec()
      .then(async (lov) => {
        const program = payload?.program;
        const programNotification: any = program.program_notification;
        const templateIndex = programNotification.find(
          (i) => i.notif_type === lov._id.toString(),
        );
        const viaId = templateIndex.via;
        const templateContent = templateIndex.template_content
          .replaceAll('[', '')
          .replaceAll(']', '');
        const mapObj = {
          programName: program.name,
          keywordName: payload.keyword_name,
          keywordEndDate: payload.end_period?.toLocaleDateString(),
          keywordEndTime: payload.end_period?.toLocaleTimeString(),
          location: payload.location_name,
          timeZone: program.program_time_zone,
        };
        const templateReplaced = templateContent.replace(
          /\b(?:programName|keywordName|keywordEndDate|keywordEndTime|location|timeZone)\b/gi,
          (matched) => mapObj[matched],
        );
        for (const item of program.alarm_pic) {
          const pic: any = await this.picModel
            .findOne(
              {
                _id: new ObjectId(item),
              },
              { msisdn: true, email: true },
            )
            .exec()
            .catch((e) => {
              console.error(e);
            });
          const notification = [];
          for (let i = 0; i < viaId.length; i++) {
            this.lovModel
              .findOne(
                {
                  _id: new ObjectId(viaId[i].toString()),
                },
                { set_value: true },
              )
              .exec()
              .then(async (data) => {
                if (data.set_value?.toUpperCase() === 'SMS') {
                  notification.push({
                    via: data.set_value,
                    template_content: templateReplaced,
                    param: {
                      msisdn: pic?.msisdn,
                    },
                  });
                }
                if (data.set_value?.toUpperCase() === 'EMAIL') {
                  notification.push({
                    via: data.set_value,
                    template_content: templateReplaced,
                    param: {
                      to: [pic?.email],
                      cc: [],
                      text: templateReplaced,
                      subject: 'Alert Tobe Expired per PIC Program',
                    },
                  });
                }
                const notificationPayload = {
                  origin: payload.origin,
                  tracing_id: false,
                  tracing_master_id: false,
                  notification: notification,
                };
                await this.notificationGeneralClient.emit(
                  payload.target_topic,
                  notificationPayload,
                );
                console.log('notification emit', notificationPayload);
              })
              .catch((e) => {
                console.error(e);
              });
          }
        }
      })
      .catch((e) => {
        console.error('error get data lov by group name ' + e);
      });
  }

  async generateHTML(
    payload,
    data: AlertKeywordTobeExpired[],
  ): Promise<string> {
    const html = [];
    const headerHtml = `<html><head><title>Reporting</title><style type='text/css'> table{border-collapse: collapse;}table, th, td{border: 1px solid rgb(156, 156, 156);}th{color: white; background-color: #b90024; text-align: center;}th, td{padding: 5px;}.flex-container{margin-top: 10px; display: flex; flex-wrap: wrap;}.flex-container > table{margin-right: 3px;margin-bottom: 3px;}.counter{text-align: right;}</style></head><body>`;
    html.push(headerHtml);
    html.push(`<div class='flex-container'>`);
    const bodies = [];
    for (const item of data) {
      // sent notification to pic
      await this.generateReportingKeywordTobeExpiredSentNotifByPIC({
        origin: payload?.origin,
        target_topic: payload?.target_topic,
        group_name: payload?.group_name,
        set_value: payload?.set_value,
        ...item,
      });
      // end
      bodies.push({
        program_name: item.program.name,
        keyword_name: item.keyword_name,
        location_name: item.location_name,
        expired: item.expired,
        notes: item.notes,
      });
    }
    const payloadHtml = {
      title: `Report keyword yang akan expired`,
      headers: [
        'PROGRAM NAME',
        'KEYWORD NAME',
        'LOCATION',
        'EXPIRED ',
        'NOTES',
      ],
      bodies: bodies,
    };
    const htmlGenerate = await tableGenerate(payloadHtml);
    html.push(htmlGenerate);
    html.push(`</body></html>`);
    const result = html.join('').toString();
    return result;
  }

  async getData(thresholdDate): Promise<AlertKeywordTobeExpired[]> {
    const toDay = new Date();
    const noData = 'Data tidak ditemukan';
    const data: AlertKeywordTobeExpired[] = await this.keywordModel
      .aggregate([
        {
          $match: {
            keyword_approval: {
              $exists: true,
              $ne: null,
            },
            'eligibility.end_period': {
              $gte: toDay,
              $lt: thresholdDate,
            },
          },
        },
        {
          $addFields: {
            end_period: '$eligibility.end_period',
            program_id: {
              $cond: [
                { $gte: ['$eligibility.program_id', ''] },
                { $toObjectId: '$eligibility.program_id' },
                '',
              ],
            },
            location_type: {
              $cond: [
                { $gte: ['$eligibility.location_type', ''] },
                { $toObjectId: '$eligibility.location_type' },
                '',
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'programv2',
            localField: 'program_id',
            foreignField: '_id',
            as: 'program',
          },
        },
        {
          $unwind: {
            path: '$program',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'location_type',
            foreignField: 'type',
            as: 'location',
          },
        },
        {
          $project: {
            _id: 0,
            end_period: '$eligibility.end_period',
            program: '$program',
            keyword_name: {
              $cond: [
                { $gte: ['$eligibility.name', ''] },
                '$eligibility.name',
                noData,
              ],
            },
            location_name: {
              $cond: [
                { $gte: ['$location.name', ''] },
                '$location.name',
                noData,
              ],
            },
            expired: {
              $cond: [
                { $gte: ['$eligibility.end_period', ''] },
                '$eligibility.end_period',
                noData,
              ],
            },
            notes: 'REDEEM',
          },
        },
      ])
      .exec();
    return data;
  }
}
