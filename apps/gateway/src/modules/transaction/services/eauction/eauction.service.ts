/* eslint-disable prefer-const */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';

import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import {
  MyEauctionParamDTO,
  MyEauctionQueryDTO,
  RegistrationStatusEauctionParamDTO,
  RegistrationStatusQueryDTO,
  TopBidderPerKeywordEauctionParamDTO,
  TopBidderPerKeywordQueryDTO,
  TotalBidderPerKeywordEauctionParamDTO,
  TotalBidderPerKeywordQueryDTO,
} from '@/transaction/dtos/eauction/eauction.dto';

import { AuctionService } from '../../../../../../auction/src/auction.service';
import {
  AuctionBidder,
  AuctionBidderDocument,
} from '../../../../../../auction/src/models/auction_bidder.model';

const moment = require('moment-timezone');

@Injectable()
export class EauctionService {
  private httpService: HttpService;
  private url: string;
  private realm: string;
  private branch: string;
  private logger = new Logger('HTTP');

  constructor(
    @InjectModel(AuctionBidder.name)
    private bidderModel: Model<AuctionBidderDocument>,
    httpService: HttpService,
    configService: ConfigService,
    private readonly auctionService: AuctionService,

    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
  ) {
    this.httpService = httpService;
    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
  }

  async my_eauction(
    param: MyEauctionParamDTO,
    query: MyEauctionQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    const first = query.skip ? parseInt(query.skip) : 0;
    const rows = query.limit ? parseInt(query.limit) : 10;
    const filters = query.filter;
    const filter_builder = { $and: [] };

    const pipeline = [];

    for (const field in filters) {
      if (field === 'keyword') {
        filter_builder.$and.push({ keyword: filters[field] });
      } else if (field === 'participation_status') {
        if (Number(filters[field]) === 0) {
          // auction sedang berlangsung
          filter_builder.$and.push({ is_done: false });
        } else if (Number(filters[field]) === 1) {
          // auction sudah selesai
          filter_builder.$and.push({ is_done: true });
          filter_builder.$and.push({ is_winning: true });
        } else {
          // auction sudah selesai
          filter_builder.$and.push({ is_done: true });
          filter_builder.$and.push({ is_winning: false });
        }
      }
    }

    // add filter msisdn
    filter_builder.$and.push({ msisdn: param.msisdn });

    // filter
    pipeline.push({ $match: filter_builder });
    // sort
    pipeline.push({
      $sort: {
        bid_point: -1,
        keyword: -1,
      },
    });
    // group by
    pipeline.push({
      $group: {
        _id: {
          keyword: '$keyword',
          event_time: '$event_time',
        },
        bid: {
          $max: '$bid_point',
        },
        doc: {
          $first: '$$ROOT',
        },
      },
    });

    console.log(JSON.stringify(pipeline));

    // get all data
    // const allDataNoFilter = await this.bidderModel.aggregate(
    //   pipeline,
    //   (err, result) => {
    //     return result;
    //   },
    // );

    pipeline.push({ $skip: first });
    pipeline.push({ $limit: rows });

    // get data with pagination
    const data = await this.bidderModel.aggregate(pipeline, (err, result) => {
      return result;
    });

    // format response
    const result = data.map((item) => {
      let status = 0;
      if (item.doc.is_already_send_notif) {
        if (item.doc.is_winning) {
          status = 1;
        } else {
          status = 9;
        }
      } else {
        status = 0;
      }
      return {
        participation_status: status,
        keyword: item.doc.keyword,
        // doc: item.doc,
      };
    });

    // calculate pagination
    // const current_page = Math.ceil(allDataNoFilter.length / rows);

    let response = new GlobalTransactionResponse();
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    response.payload = {
      // trace_id: true,
      // total_record: allDataNoFilter.length,
      page_size: rows,
      // page_number: current_page,
      list_of_auction: result,
    };
    return response;
  }

  async total_bidder_per_keyword(
    param: TotalBidderPerKeywordEauctionParamDTO,
    query: TotalBidderPerKeywordQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    const currentTime = moment().utc();
    const response = new GlobalTransactionResponse();
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    response.payload = {};

    const filter = { 'eligibility.name': param.keyword };
    const projection = { _id: 1, eligibility: 1, is_stoped: 1 };

    // if keyword is not exist
    const existingKeyword = await this.keywordModel
      .findOne(filter, projection)
      .exec();
    if (!existingKeyword) {
      response.payload = {};

      return response;
    }

    const isKeywordPaused = this.checkKeywordPause(existingKeyword);
    const isInPeriodKeyword = this.checkStartedOrExpiredKeyword(
      existingKeyword,
      currentTime,
    );

    if (isKeywordPaused || !isInPeriodKeyword) {
      response.payload = {};

      return response;
    }

    const auction = await this.bidderModel.aggregate([
      {
        $match: {
          keyword: {
            $eq: param.keyword,
          },
        },
      },
      {
        $count: 'total_bidder',
      },
    ]);

    response.payload = {
      total_bidder: auction.length ? auction[0].total_bidder : 0,
      keyword: param.keyword,
    };

    return response;
  }

  async registration_status(
    param: RegistrationStatusEauctionParamDTO,
    query: RegistrationStatusQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    let response = new GlobalTransactionResponse();
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    response.payload = {
      trace_id: true,
      total_record: 2,
      page_size: 1,
      page_number: 1,
      registration_status: 1,
    };
    return response;
  }

  async top_bidder_per_keyword(
    param: TopBidderPerKeywordEauctionParamDTO,
    query: TopBidderPerKeywordQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    const { keyword: keywordName } = param;
    const currentTime = moment().utc();
    const response = new GlobalTransactionResponse();
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';

    const filter = { 'eligibility.name': keywordName };
    const projection = { _id: 1, eligibility: 1, is_stoped: 1 };

    let existingKeyword = await this.keywordModel
      .findOne(filter, projection)
      .exec();

    if (!existingKeyword) {
      response.payload = { top_bidder: [] };

      return response;
    }

    const isKeywordPaused = this.checkKeywordPause(existingKeyword);
    const isInPeriodKeyword = this.checkStartedOrExpiredKeyword(
      existingKeyword,
      currentTime,
    );

    if (isKeywordPaused || !isInPeriodKeyword) {
      response.payload = { top_bidder: [] };

      return response;
    }

    if (existingKeyword.eligibility.keyword_schedule === 'Shift') {
      existingKeyword = this.detectActiveShift(existingKeyword, currentTime);
    }

    const isActiveAuctionEvent = this.checkWithinEventRange(
      existingKeyword,
      currentTime,
    );

    const eventTime = isActiveAuctionEvent
      ? await this.auctionService.getEventTime({
          keyword: existingKeyword,
        })
      : null;

    const dailyTop3Bidder = await this.auctionService.getTopBidder(
      keywordName,
      eventTime,
      3,
    );

    const responseDailyTop3Bidder = await Promise.all(
      dailyTop3Bidder.map((item, index) => ({
        position: index + 1,
        msisdn: item.msisdn,
        bid_point: item.bid_point,
        bid_date: item.bid_at,
      })),
    );

    response.payload = { top_bidder: responseDailyTop3Bidder };
    return response;
  }

  public checkKeywordPause(keyword: any): boolean {
    const isKeywordPaused = keyword.is_stoped;
    console.log('isKeywordPaused', isKeywordPaused);

    return isKeywordPaused;
  }

  /**
   * Cek apakah keyword tersebut sudah aktif atau expired
   *
   * @param keyword
   * @param currentTime
   * @returns
   */
  public checkStartedOrExpiredKeyword(keyword: any, currentTime: any) {
    const startPeriod = moment(keyword.eligibility.start_period);
    const endPeriod = moment(keyword.eligibility.end_period);

    console.log('keyword', keyword.eligibility.name);
    console.log('currentTime', currentTime);
    console.log('startPeriod', startPeriod);
    console.log('endPeriod', endPeriod);

    const isInPeriodKeyword = currentTime.isBetween(startPeriod, endPeriod);

    console.log('isInPeriodKeyword', isInPeriodKeyword);

    return isInPeriodKeyword;
  }

  public detectActiveShift(keyword: any, currentTime: any) {
    const formatedKeywordShift = [];
    const shifts = keyword.eligibility.keyword_shift;

    for (const shift of shifts) {
      const startTime = moment(shift.from).utc();
      const endTime = moment(shift.to).utc();
      const isRunningShift: boolean = currentTime.isBetween(startTime, endTime);
      const status = isRunningShift;

      formatedKeywordShift.push({
        from: startTime,
        to: endTime,
        status,
      });
    }

    keyword.eligibility.keyword_shift = formatedKeywordShift;

    return keyword;
  }

  public checkWithinEventRange(keyword: any, currentTime: any): boolean {
    if (keyword.eligibility.keyword_schedule === 'Daily') {
      const endPeriod = moment(keyword.eligibility.end_period);
      const isActivePeriod = currentTime.isBefore(endPeriod);

      console.log('is active period daily', isActivePeriod);

      return isActivePeriod;
    }

    const activeShift = keyword.eligibility.keyword_shift.find(
      (shift) => shift.status == true,
    );

    const hasActiveShift = activeShift ? true : false;

    console.log('is active period shift', hasActiveShift);

    return hasActiveShift;
  }
}
