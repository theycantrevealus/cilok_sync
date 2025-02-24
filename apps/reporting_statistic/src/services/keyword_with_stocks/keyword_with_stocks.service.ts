import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
import { Stock, StockDocument } from '@/stock/models/stock.model';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';
import {
  ReportKeywordTransaction,
  ReportKeywordTransactionDocument,
} from '../../model/keyword-transaction/report-keyword-transaction.model';
import { ReportingNotificationService } from '../reporting_notification/reporting-notification.service';

const moment = require('moment-timezone');

@Injectable()
export class ReportKeywordWithStockService {
  constructor(
    @InjectModel(ProgramV2.name)
    private programModel: Model<ProgramV2Document>,

    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,

    @InjectModel(Stock.name)
    private stockModel: Model<StockDocument>,

    @InjectModel(ReportKeywordTransaction.name, 'reporting')
    private reportKeywordTransactionModel: Model<ReportKeywordTransactionDocument>,

    private reportingNotificationService: ReportingNotificationService,
  ) { }

  async createReport(payload): Promise<ReportingServiceResult> {
    const period = payload.period;
    console.log('-> [START] Generate Keyword Report With Stock ..');

    try {
      // program list
      const programs = await this.getAllPrograms(payload?.parameter?.program);

      for (let p = 0; p < programs.length; p++) {
        const program = programs[p];

        // keyword list
        const keywords = await this.getAllKeywords(
          period,
          program._id.toString(),
        );

        const generated_keywords = [];
        for (let k = 0; k < keywords.length; k++) {
          const keyword = keywords[k];

          let trx_success = 0;
          let trx_fail = 0;
          let stock_amount = 0;
          let stock_default = 0;
          let trx_total = 0;
          // apakah ada transaksi?
          const keyword_trans: any = await this.getKeywordTransaction(
            keyword.eligibility.name,
            program.name,
          );
          if (keyword_trans.length) {
            trx_success = keyword_trans?.[0]?.total_success || 0;
            trx_fail = keyword_trans?.[0]?.total_fail || 0;
            trx_total = keyword_trans?.[0]?.total_trx;
          }

          // sisa stock
          const stock = await this.getStockFromKeywordId(keyword._id);
          if (stock.length > 0) {
            const total_sisa_stock = stock.reduce((acc, obj) => {
              return acc + obj.balance;
            }, 0);

            stock_amount = total_sisa_stock;
          }

          // default stock
          if (keyword?.bonus?.[0]?.stock_location?.length) {
            const total_stock_default =
              keyword?.bonus?.[0]?.stock_location.reduce((acc, obj) => {
                return acc + obj.stock;
              }, 0);

            stock_default = total_stock_default;
          }

          // push data
          generated_keywords.push({
            period: String(period).replace(/-/g, ''),
            keyword: keyword.eligibility.name,
            trx_success,
            trx_fail,
            // total_trx: Number(trx_success) + Number(trx_fail),
            total_trx: trx_total,
            stock_amount,
            stock_default,
          });
        }

        // generate html
        const htmlResult = await this.generateHtml({
          program: program.name,
          keywords: generated_keywords,
        });

        console.log('HTML LAMA', htmlResult)
        // kirim
        await this.reportingNotificationService.sendNotificationKeywordWithStock(
          payload.parameter,
          payload.period,
          htmlResult,
          {
            program: program.name,
          },
        );
      }

      console.log('-> [END] Generate Keyword Report With Stock ..');

      return new ReportingServiceResult({
        is_error: false,
        message: 'Success generate keyword report with stock',
      });
    } catch (e) {
      return new ReportingServiceResult({
        is_error: true,
        message: e.message,
        stack: e.stack,
      });
    }
  }

  private async getAllPrograms(program) {
    const query = [];

    if (program || program?.length) {
      query.push({
        $match: {
          name: {
            $in: program,
          },
        },
      });
    }

    query.push({
      $project: {
        _id: 1,
        name: 1,
      },
    });

    return await this.programModel.aggregate(query);
  }

  private async getAllKeywords(period, program_id) {
    const data = await this.keywordModel.aggregate([
      {
        $match: {
          $and: [
            { 'eligibility.program_id': program_id },
            { 'eligibility.name': { $not: /-/ } },
            { hq_approver: { $exists: true } },
          ],
          // date: {
          //   $gte: moment(period).startOf('day').toDate(),
          //   $lte: moment(period).endOf('day').toDate(),
          // },
        },
      },
    ]);

    return data;
  }

  //TODO : Check this query
  private async getKeywordTransaction(keyword_name, program_name) {
    return this.reportKeywordTransactionModel.aggregate(
      [
        {
          $project: {
            total_success: 1,
            total_fail: 1,
            total_trx: 1,
            keyword_name: 1,
            program_name: {
              $trim: {
                input: '$program_name',
              },
            },
          },
        },
        {
          $match: {
            keyword_name: keyword_name,
            program_name: program_name,
          },
        },
        {
          $group: {
            _id: '$keyword_name',
            keyword: {
              $first: '$keyword_name',
            },
            total_success: {
              $sum: '$total_success',
            },
            total_fail: {
              $sum: '$total_fail',
            },
            total_trx: {
              $sum: '$total_trx',
            },
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
  }

  private async getStockFromKeywordId(keywordId: string) {
    const query = [];
    const filter_builder = { $and: [] };

    /*
    query.push({
      $lookup: {
        from: 'locations',
        localField: 'location',
        foreignField: '_id',
        as: 'location',
      },
    });

    query.push({
      $unwind: {
        path: '$location',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productinventories',
        localField: 'product',
        foreignField: '_id',
        as: 'product',
      },
    });

    query.push({
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productcategories',
        localField: 'product.category_id',
        foreignField: 'core_product_category_id',
        as: 'product.category',
      },
    });

    query.push({
      $unwind: {
        path: '$product.category',
        preserveNullAndEmptyArrays: true,
      },
    });

    query.push({
      $lookup: {
        from: 'productsubcategories',
        localField: 'product.sub_category_id',
        foreignField: 'core_product_subcategory_id',
        as: 'product.sub_category',
      },
    });

    query.push({
      $unwind: {
        path: '$product.sub_category',
        preserveNullAndEmptyArrays: true,
      },
    });

    filter_builder.$and.push({
      'product.deleted_at': null,
    });

    filter_builder.$and.push({
      'location.name': 'HQ',
    });
    */

    filter_builder.$and.push({
      keyword: new Types.ObjectId(keywordId),
    });

    query.push({
      $match: filter_builder,
    });

    const data = await this.stockModel.aggregate(query, (err, result) => {
      return result;
    });

    return data;
  }

  private formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private async generateHtml(payload) {
    const program = payload.program;
    const keyword_table = payload.keywords;

    const html = [];

    html.push('<table>');
    html.push('<thead>');
    html.push('<tr>');
    html.push('<th>TANGGAL</th>');
    html.push('<th>KEYWORD</th>');
    html.push('<th>SUKSES</th>');
    html.push('<th>GAGAL</th>');
    html.push('<th>TOTAL TRX</th>');
    html.push('<th>SISA STOCK</th>');
    html.push('<th>DEFAULT STOCK</th>');
    html.push('</tr>');
    html.push('</thead>');
    html.push('<tbody>');

    // keyword table
    for (let k = 0; k < keyword_table.length; k++) {
      const keyword = keyword_table[k];

      html.push('<tr>');
      html.push(`<td>${keyword.period}</td>`);
      html.push(`<td>${keyword.keyword}</td>`);
      html.push(
        `<td class='counter'>${this.formatNumber(keyword.trx_success)}</td>`,
      );
      html.push(
        `<td class='counter'>${this.formatNumber(keyword.trx_fail)}</td>`,
      );
      html.push(
        `<td class='counter'>${this.formatNumber(keyword.total_trx)}</td>`,
      );
      html.push(
        `<td class='counter'>${this.formatNumber(keyword.stock_amount)}</td>`,
      );
      html.push(
        `<td class='counter'>${this.formatNumber(keyword.stock_default)}</td>`,
      );
      html.push('</tr>');
    }

    html.push('</tbody>');
    html.push('</table>');

    return html.join('');
  }
}
