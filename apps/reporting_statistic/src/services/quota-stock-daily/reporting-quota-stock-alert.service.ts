import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { Model } from 'mongoose';

import { Location, LocationDocument } from '@/location/models/location.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { PIC, PICDocument } from '@/pic/models/pic.model';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
import { Stock, StockDocument } from '@/stock/models/stock.model';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';
import { tableGenerate } from '../../helpers/html.generatate';
import {
  REPORT_QUOTA_ALERT_PER_PROGRAM_QUERY_AGGREGATION,
  REPORT_QUOTA_ALERT_QUERY_AGGREGATION,
} from './aggregate-query-quota-stock-alert.const';
import {
  QuotaStockAlertDTO,
  QuotaStockPerProgramDTO,
} from './dto/quota-stock-alert.dto';

@Injectable()
export class ReportingQuotaStockAlertService {
  constructor(
    @InjectModel(Stock.name) private stockModel: Model<StockDocument>,
    @InjectModel(Lov.name) private lovModel: Model<LovDocument>,
    @InjectModel(ProgramV2.name) private programModel: Model<ProgramV2Document>,
    @InjectModel(PIC.name) private picModel: Model<PICDocument>,
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @Inject('NOTIFICATION_GENERAL_PRODUCER')
    private readonly notificationGeneralClient: ClientKafka,
  ) {}

  async generateReportingQuotaStockService(payload: any): Promise<any> {
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      await this.getStockData().then(async (data) => {
        // console.log('get data' + JSON.stringify(data));
        await this.generateQuotaStockDailyHTML(data).then(async (bodyHtml) => {
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
                to: payload.parameter?.notification.to[i],
                cc: payload.parameter?.notification.cc[i],
                html: bodyHtml,
                subject: payload.parameter?.notification.subject,
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

      serviceResult.message = 'Success generate reporting quota stock service';
      return serviceResult;
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      return serviceResult;
    }
  }

  async generateReportingQuotaStockAlertSummaryService(
    payload: any,
  ): Promise<any> {
    const serviceResult = new ReportingServiceResult({ is_error: false });

    try {
      await this.getStockData().then(async (data) => {
        console.log('get data' + JSON.stringify(data));
        await this.generateHTML(data, payload?.parameter?.threshold)
          .then(async (bodyHtml) => {
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
                  to: payload.parameter?.notification.to[i],
                  cc: payload.parameter?.notification.cc[i],
                  html: bodyHtml,
                  subject: payload.parameter?.notification.subject,
                },
              });
            }
            await this.notificationGeneralClient.emit(
              payload.target_topic,
              notificationPayload,
            );
          })
          .catch((e) => {
            console.error(e);
          });
      });
      //.catch((e) => {
      //  console.error(e);
      //});

      serviceResult.message =
        'Success generate reporting quota stock alert summary service';
      return serviceResult;
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;

      return serviceResult;
    }
  }

  async generateReportingProgramSentNotifByPIC(payload: any): Promise<any> {
    try {
      //return
      await this.getStockDataPerProgram().then(
        async (data: QuotaStockPerProgramDTO[]) => {
          console.log('get data' + JSON.stringify(data));
          if (data.length > 0) {
            const group_name = payload?.group_name;
            const set_value = payload?.set_value;
            this.lovModel
              .findOne({
                group_name: group_name,
                set_value: set_value,
              })
              .exec()
              .then((lov) => {
                data.forEach(async (item) => {
                  const program = item?.program;
                  const keyword = item?.keyword;

                  // hanya jika program dan keywordnya TIDAK DI-SOFT DELETE
                  if (!keyword?.deleted_at && !program?.deleted_at) {
                    if (item.balance > 0) {
                      const stock = item.stock?.stock;
                      const percentage = stock
                        ? (item.balance / stock) * 100
                        : 0;
                      if (percentage < program?.threshold_alarm_voucher) {
                        const locations: string[] = await Promise.all(
                          item.locations.map(async (val): Promise<string> => {
                            return await this.getLocationName(val);
                          }),
                        );
                        const programNotification: any =
                          program.program_notification;
                        const templateIndex = programNotification.find(
                          (i) => i.notif_type === lov._id.toString(),
                        );
                        const viaId = templateIndex.via;
                        const templateContent = templateIndex.template_content
                          .replaceAll('[', '')
                          .replaceAll(']', '');
                        const remainingQuota = item.balance;
                        const mapObj = {
                          programName: program.name,
                          keywordName: item.keyword_name,
                          thresholdQuota: program.threshold_alarm_voucher,
                          remainingQuota: remainingQuota,
                          location: locations,
                          threshold: program.threshold_alarm_expired,
                          timeZone: program.program_time_zone,
                          totalQuota: stock ?? 0,
                        };

                        const templateReplaced = templateContent.replace(
                          /\b(?:programName|keywordName|thresholdQuota|remainingQuota|location|threshold|timeZone|totalQuota)\b/gi,
                          (matched) => mapObj[matched],
                        );
                        for (const val of program.alarm_pic) {
                          const pic: any = await this.picModel
                            .findOne(
                              {
                                _id: new ObjectId(val),
                              },
                              { msisdn: true, email: true },
                            )
                            .exec()
                            .catch((e) => {
                              console.error(e);
                            });
                          const notification = [];
                          await Promise.all(
                            viaId.map(async (item1) => {
                              await this.lovModel
                                .findOne(
                                  {
                                    _id: new ObjectId(item1.toString()),
                                  },
                                  { set_value: true },
                                )
                                .exec()
                                .then((data) => {
                                  if (data.set_value?.toUpperCase() === 'SMS') {
                                    notification.push({
                                      via: data.set_value,
                                      template_content: templateReplaced,
                                      param: {
                                        msisdn: pic?.msisdn,
                                      },
                                    });
                                  }
                                  if (
                                    data.set_value?.toUpperCase() === 'EMAIL'
                                  ) {
                                    notification.push({
                                      via: data.set_value,
                                      template_content: templateReplaced,
                                      param: {
                                        to: [pic?.email],
                                        cc: [],
                                        text: templateReplaced,
                                        subject:
                                          'Reporting Quota Stock Alert Per PIC Program',
                                      },
                                    });
                                  }
                                });
                              //.catch((e) => {
                              //  console.error(e);
                              //});
                            }),
                          );
                          const notificationPayload = {
                            origin: payload.origin,
                            tracing_id: false,
                            tracing_master_id: false,
                            notification: notification,
                          };
                          this.notificationGeneralClient.emit(
                            payload.target_topic,
                            notificationPayload,
                          );
                        }
                      }
                    }
                  }
                });
              });
            //.catch((e) => {
            //  console.error('error get data lov by group name ' + e);
            //});
          }
        },
      );
      //.catch((e) => {
      //  console.error('error get data per program ' + e);
      //});

      return new ReportingServiceResult({
        is_error: false,
        message: 'Success Generate Reporting Program Sent Notif By PIC',
      });
    } catch (error) {
      return new ReportingServiceResult({
        is_error: true,
        message: error.message,
        stack: error.stack,
      });
    }
  }
  async getLocationName(locations): Promise<string> {
    return this.locationModel
      .findOne(
        { _id: new ObjectId(locations.toString()) },
        {
          _id: false,
          name: true,
        },
      )
      .exec()
      .then((res) => {
        return res?.name;
      });
  }

  async generateQuotaStockDailyHTML(
    data: QuotaStockAlertDTO[],
  ): Promise<string> {
    const html = [];
    const headerHtml = `<html><head><title>Reporting Quota Stock</title><style type='text/css'> table{border-collapse: collapse;}table, th, td{border: 1px solid rgb(156, 156, 156);}th{color: white; background-color: #b90024; text-align: center;}th, td{padding: 5px;}.flex-container{margin-top: 10px; display: flex; flex-wrap: wrap;}.flex-container > table{margin-right: 3px;margin-bottom: 3px;}.counter{text-align: right;}</style></head><body>`;
    html.push(headerHtml);
    html.push(`<div class='flex-container'>`);
    const bodies = [];
    await Promise.all(
      data.map(async (item, index) => {
        if (
          item.balance > 0 &&
          item.program_name !== null &&
          typeof item.program_name === 'string' &&
          typeof item.keyword_name === 'string' &&
          typeof item.location_name === 'string'
        ) {
          // const locations: string[] = await Promise.all(
          //   item.locations.map(async (val): Promise<string> => {
          //     return await this.getLocationName(val);
          //   }),
          // );
          bodies.push({
            program_name: item.program_name,
            keyword_name: item.keyword_name,
            location: item.location_name,
            active: item.balance,
          });
        }
      }),
    );
    // Generate table html with data stock
    const payloadHtml = {
      title: `Reporting Quota Stock Daily ${new Date().toLocaleString()}`,
      headers: ['PROGRAM NAME', 'KEYWORD NAME', 'LOCATION', 'QUOTA'],
      bodies: bodies,
    };
    const htmlGenerate = await tableGenerate(payloadHtml);
    html.push(htmlGenerate);
    html.push(`</body></html>`);
    const result = html.join('').toString();
    return result;
  }

  async generateHTML(data: QuotaStockAlertDTO[], threshold): Promise<string> {
    const html = [];
    const headerHtml = `<html><head><title>Reporting Quota Stock Alert Summary</title><style type='text/css'> table{border-collapse: collapse;}table, th, td{border: 1px solid rgb(156, 156, 156);}th{color: white; background-color: #b90024; text-align: center;}th, td{padding: 5px;}.flex-container{margin-top: 10px; display: flex; flex-wrap: wrap;}.flex-container > table{margin-right: 3px;margin-bottom: 3px;}.counter{text-align: right;}</style></head><body>`;
    html.push(headerHtml);
    html.push(`<div class='flex-container'>`);
    const bodies = [];
    await Promise.all(
      data.map(async (item, index) => {
        if (item.balance > 0) {
          const stock = item?.stock?.stock;
          const percentage = (item.balance / stock) * 100;
          if (percentage < threshold) {
            const locations: string[] = await Promise.all(
              item.locations.map(async (val): Promise<string> => {
                return await this.getLocationName(val);
              }),
            );
            bodies.push({
              program_name: item.program_name,
              keyword_name: item.keyword_name,
              location: locations.toString(),
              active: item.balance,
              use: stock - item.balance,
              percentage: `${percentage} %`,
            });
          }
        }
      }),
    );
    // Generate table html with data stock
    const payloadHtml = {
      title: `Report Alert Quota Stock Smaller From Threshold ${threshold}% Program Periode ${new Date()}`,
      headers: [
        'PROGRAM NAME',
        'KEYWORD NAME',
        'LOCATION',
        'AKTIF',
        'TERPAKAI',
        'PERSENTASE',
      ],
      bodies: bodies,
    };
    const htmlGenerate = await tableGenerate(payloadHtml);
    html.push(htmlGenerate);
    html.push(`</body></html>`);
    const result = html.join('').toString();
    return result;
  }

  async getStockData(): Promise<QuotaStockAlertDTO[]> {
    const data: QuotaStockAlertDTO[] = await this.stockModel
      .aggregate(REPORT_QUOTA_ALERT_QUERY_AGGREGATION)
      .exec();
    return data;
  }

  async getStockDataPerProgram(): Promise<QuotaStockPerProgramDTO[]> {
    const data: QuotaStockPerProgramDTO[] = await this.stockModel
      .aggregate(REPORT_QUOTA_ALERT_PER_PROGRAM_QUERY_AGGREGATION)
      .exec();
    return data;
  }
}
