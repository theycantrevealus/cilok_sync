import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { GlobalResponse } from '@/dtos/response.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { KeywordService } from '@/keyword/services/keyword.service';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { StockService } from '@/stock/services/stock.service';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';
import { VoucherService } from '@/transaction/services/voucher/voucher.service';

const moment = require('moment-timezone');

@Injectable()
export class TelegramService {
  private httpService: HttpService;
  private url: string;
  private branch: string;
  private realm: string;
  private merchant: string;
  private raw_port: number;
  private raw_core: string;

  private keywordService: KeywordService;
  private programService: ProgramServiceV2;
  private stockService: StockService;
  private voucherService: VoucherService;

  constructor(
    configService: ConfigService,
    httpService: HttpService,

    @InjectModel(ProgramV2.name) private programModel: Model<ProgramV2Document>,
    @InjectModel(Redeem.name) private redeemModel: Model<RedeemDocument>,
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,

    keywordService: KeywordService,
    programService: ProgramServiceV2,
    stockService: StockService,
    voucherService: VoucherService,
  ) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;

    this.keywordService = keywordService;
    this.programService = programService;
    this.stockService = stockService;
    this.voucherService = voucherService;
  }

  private async getRedeemTransaction(keyword: any) {
    const now = moment();

    // YTD
    const ytdStartDate = moment().startOf('year');
    const ytdEndDate = now;

    // MTD
    const mtdStartDate = moment().startOf('month');
    const mtdEndDate = now;

    // Today
    const todayStartDate = moment().startOf('day');
    const todayEndDate = now;

    const periods = [
      { name: 'ytd', start: ytdStartDate, end: ytdEndDate },
      { name: 'mtd', start: mtdStartDate, end: mtdEndDate },
      { name: 'today', start: todayStartDate, end: todayEndDate },
    ];

    const result = {};

    for (const period of periods) {
      const dtTrx = await this.redeemModel
        .find({
          keyword: { $in: keyword },
          status: 'Success', // Only count transactions with 'Success' status
          updated_at: {
            $gte: period.start.toDate(),
            $lt: period.end.toDate(),
          },
        })
        .exec();

      const msisdnSet = new Set();
      let totalTrx = 0;
      let trxCount = 0;

      for (const trx of dtTrx) {
        if (trx.total_redeem) {
          // Only consider transactions with a total_redeem value
          msisdnSet.add(trx.msisdn);
          totalTrx += trx.total_redeem;
          trxCount++;
        }
      }

      result[period.name] = {
        unique_redeemer: msisdnSet.size,
        trx: trxCount,
        point_burned: totalTrx,
      };
    }

    return result;
  }

  async getTotalTransactionByKeywordName(name: string) {
    const todayDate = new Date().toISOString();

    let keyword = await this.keywordService.findRegexKeywordByName(name);
    if (keyword.length == 0) return {};

    keyword = keyword[0];
    const keywordName = keyword.eligibility.name;

    const transaction = await this.getRedeemTransaction([keywordName]);

    const response = new GlobalResponse();

    response.statusCode = HttpStatus.OK;
    response.message = 'Success';
    response.payload = {
      date: todayDate,
      keyword: keywordName,
      ...transaction,
    };

    return response;
  }

  async findAllKeywordByNameRegex(name: string) {
    const keywords = await this.keywordService.findRegexKeywordByName(name);

    const response = new GlobalResponse();

    response.statusCode = HttpStatus.OK;
    response.message = 'Success';

    response.payload = keywords.map((key) => {
      return key.eligibility.name;
    });

    return response;
  }

  async getKeywordStock(name: string) {
    const keywords = await this.keywordService.findRegexKeywordByName(name);
    if (keywords.length == 0) return {};

    const keyword = keywords[0];

    // stock
    let stockAmount = 0;
    const stock = await this.stockService.getStockFromKeywordId(keyword._id);
    if (stock.length > 0) {
      stockAmount = stock[0].balance;
    }

    // voucher
    let voucherAmount = 0;
    const voucher = await this.voucherService.getFromKeywordId(
      keyword?._id?.toString(),
    );
    if (voucher.length > 0) {
      voucherAmount = voucher.length;
    }

    const response = new GlobalResponse();

    response.statusCode = HttpStatus.OK;
    response.message = 'Success';
    response.payload = {
      program_name: keyword.eligibility.program_id_info[0].name,
      program_desc: keyword.eligibility.program_id_info[0].desc,
      keyword: keyword.eligibility.name,
      stockLeft: stockAmount,
      voucherLeft: voucherAmount,
    };

    return response;
  }

  async findKeywordsByName(program_name: string) {
    const programs = await this.programModel.aggregate(
      [
        {
          $lookup: {
            from: 'keywords',
            let: { id: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          {
                            $convert: {
                              input: '$eligibility.program_id',
                              to: 'objectId',
                              onNull: '',
                              onError: '',
                            },
                          },
                          '$$id',
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
            as: 'keywords',
          },
        },
        {
          $match: {
            $and: [{ name: program_name }, { deleted_at: null }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );

    if (programs.length == 0) return {};

    const program = programs[0];

    const response = new GlobalResponse();

    response.statusCode = HttpStatus.OK;
    response.message = 'Success';
    response.payload = {
      name: program.name,
      desc: program.desc,
      keywords: program.keywords.map((keyword) => keyword.eligibility.name),
    };

    return response;
  }

  async getTotalTransactionByProgramName(program_name: string) {
    const todayDate = new Date().toISOString();

    const program = await this.programService.getProgramByName(program_name);
    if (!program) return {};

    const programKeywords = await this.keywordModel
      .find({
        'eligibility.program_id': program._id.toString(),
      })
      .exec();

    const programKeywordsName = programKeywords.map(
      (keyword) => keyword.eligibility.name,
    );

    const transaction = await this.getRedeemTransaction(programKeywordsName);

    const response = new GlobalResponse();

    response.statusCode = HttpStatus.OK;
    response.message = 'Success';
    response.payload = {
      date: todayDate,
      program: program.name,
      ...transaction,
    };

    return response;
  }

  async getActiveProgram(program_name: string) {
    const programs = await this.programService.getProgramByName(
      program_name,
      true,
    );
    if (programs.length == 0) return {};

    const response = new GlobalResponse();

    response.statusCode = HttpStatus.OK;
    response.message = 'Success';
    response.payload = programs.map((program) => {
      return {
        id: program._id,
        name: program.name,
      };
    });

    return response;
  }
}
