import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Stock, StockDocument } from '@/stock/models/stock.model';

import { QuotaStockDailyDTO } from './dto/quota-stock-daily.dto';
import { REPORT_QUOTA_STOCK_DAILY_QUERY_AGGREGATION } from './reporting-quota-stock-daily-query.const';

@Injectable()
export class ReportingQuotaStockDailyService {
  constructor(
    @InjectModel(Stock.name) private stockModel: Model<StockDocument>,
    @Inject('NOTIFICATION_GENERAL_PRODUCER')
    private readonly notificationGeneralClient: ClientKafka,
  ) {}

  async generateReportingQuotaStockDailyService(payload: any): Promise<any> {
    const data = await this.getStockData();
    const bodyHtml = await this.transformDataToTableHtml(payload.period, data);

    const notification_message = [];

    // Check if any of the parameters is undefined
    if (
      payload.notification === undefined ||
      payload.notification.to === undefined ||
      payload.notification.cc === undefined ||
      payload.notification.subject === undefined
    ) {
      console.error(
        'One or more parameters are undefined : ' + payload.notification,
      );
    }

    try {
      notification_message.push({
        via: 'Email',
        template_content: bodyHtml,
        param: {
          email: payload.notification.to,
          cc: payload.notification.cc,
          subject: payload.notification.subject,
        },
      });

      this.notificationGeneralClient.emit(process.env.KAFKA_NOTIFICATION_GENERAL_TOPIC, {
        origin: 'cron.notification_general',
        keyword: 'REPORT_QUOTA_STOCK_DAILY',
        notification: notification_message,
      });
    } catch (error) {
      console.error('-- Generate Quota Stock Daily Error: ' + error);
    }
  }

  async getStockData(): Promise<QuotaStockDailyDTO[]> {
    const data: QuotaStockDailyDTO[] = await this.stockModel
      .aggregate(REPORT_QUOTA_STOCK_DAILY_QUERY_AGGREGATION)
      .exec();

    return data;
  }

  transformDataToTableHtml(date: any, data: QuotaStockDailyDTO[]): string {
    const title = `Quota Stock Daily ${date}`;
    const headers = ['PROGRAM NAME', 'KEYWORD', 'LOCATION', 'QUOTA'];

    // create the header row (<tr>), using the property names
    const headerRow = headers.map((header) => `<th>${header}</th>`).join('');

    // create the table rows (<tr>), using the property values
    const tableRows = data
      .map((item) => {
        return `<tr>
        <td>${item.program_name || '-'}</td>
        <td>${item.keyword_name || '-'}</td>
        <td>${item.location_name || '-'}</td>
        <td>${item.balance}</td>
      </tr>`;
      })
      .join('');

    // create the final HTML table, with the header row and table rows
    const htmlTable = `
      ${title}
      <br>
      <table>
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;

    return htmlTable;
  }
}
