import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { KeywordDonation } from '@/keyword/models/keyword.donation.model';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import {
  MyDonationParamDTO,
  MyDonationQueryDTO,
} from '@/transaction/dtos/donation/my-donation.dto';
import {
  DonationProcess,
  DonationProcessDocument,
} from '@/transaction/models/donation/donation.logger.model';
import {
  Donation,
  DonationDocument,
} from '@/transaction/models/donation/donation.model';
import {
  TransactionDonation,
  TransactionDonationDocument,
} from '@/transaction/models/donation/transaction_donation.model';

const moment = require('moment-timezone');

@Injectable()
export class DonationService {
  constructor(
    @InjectModel(Donation.name)
    private donationModel: Model<DonationDocument>,
    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,
    @InjectModel(TransactionDonation.name)
    private transactionDonationModel: Model<TransactionDonationDocument>,
    @InjectModel(DonationProcess.name)
    private donationProcessModel: Model<DonationProcessDocument>,
  ) {}

  // async donate(payload): Promise<void> {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       const existingDonation: any = await this.donationModel.findOne({
  //         keyword: payload.keyword,
  //       });
  //       const keyword = await this.keywordModel.findOne({
  //         _id: payload.keyword,
  //       });
  //
  //       // 1. Save to "donation"
  //       if (existingDonation) {
  //         // MARK: For testing (Add donation_queue)
  //         // existingDonation.donation_queue = payload.total_redeem;
  //
  //         existingDonation.donation_current += existingDonation.donation_queue;
  //         existingDonation.donation_queue = 0;
  //
  //         await existingDonation.save();
  //       } else {
  //         const newDonation = new this.donationModel({
  //           keyword: payload.keyword,
  //           donation_target: (keyword.bonus[0] as KeywordDonation).target_poin,
  //           donation_current: payload.total_redeem,
  //           donation_queue: 0,
  //           start_time: keyword.eligibility.start_period,
  //           end_time: keyword.eligibility.end_period,
  //         });
  //
  //         await newDonation.save();
  //       }
  //
  //       // 2. Save to "transaction donation"
  //       const donationTransaction = new this.transactionDonationModel({
  //         trace_id: payload.trace_id,
  //         keyword: payload.keyword,
  //         msisdn: payload.msisdn,
  //         total_redeem: payload.total_redeem,
  //         time: payload.time,
  //       });
  //       await donationTransaction.save();
  //
  //       resolve();
  //     } catch (error) {
  //       console.log(error);
  //       reject(error);
  //     }
  //   });
  // }

  private async generateId() {
    let inc = await this.donationModel.count();
    inc = Number(inc) + 1;

    const curr_date = new Date().toISOString().split('T')[0];
    return `DON_${curr_date}_${inc.toString().padStart(3, '0')}`;
  }

  async inject_donation(keyword, payload) {
    const _this = this;

    await new Promise(async (resolve, reject) => {
      const donation = new _this.transactionDonationModel({
        ...payload,
        // keyword: keyword.eligibility.name,
        trace_id: await this.generateId(),
      });

      await donation
        .save()
        .then((a) => {
          resolve(a);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  async donate(payload): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const existingDonation = await this.donationModel.findOne({
          keyword: payload.keyword,
        });
        const keyword = await this.keywordModel.findOne({
          _id: payload.keyword,
        });

        //todo: Tidak perlu select lagi
        console.log(existingDonation);

        // 1. Save to "donation"
        if (existingDonation) {
          // MARK: For testing (Add donation_queue)
          // existingDonation.donation_queue = payload.total_redeem;

          existingDonation.donation_current += existingDonation.donation_queue;
          existingDonation.donation_queue = 0;

          await existingDonation.save();
        } else {
          const newDonation = new this.donationModel({
            keyword: payload.keyword,
            donation_target: (keyword.bonus[0] as KeywordDonation).target_poin,
            donation_current: payload.total_redeem,
            donation_queue: 0,
            start_time: keyword.eligibility.start_period,
            end_time: keyword.eligibility.end_period,
          });

          await newDonation.save().catch((e: Error) => {
            console.log(e.message);
          });
        }

        // tambah transaction_vote
        let parent_transaction_id = payload.master_id;
        if (payload?.incoming?.additional_param) {
          const parse_additional_param = payload.incoming.additional_param;

          if (parse_additional_param?.parent_transaction_id) {
            parent_transaction_id =
              parse_additional_param.parent_transaction_id;
          }
        }

        // 2. Save to "transaction donation"
        const donationTransaction = new this.transactionDonationModel({
          master_id: payload.master_id,
          parent_master_id: parent_transaction_id,
          trace_id: payload.trace_id,
          keyword: payload.keyword,
          msisdn: payload.msisdn,
          total_redeem: payload.total_redeem,
          time: payload.time,
        });
        await donationTransaction.save().catch((e: Error) => {
          console.log(e.message);
        });

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  async donateEligibility(payload) {
    const keyword = await this.keywordModel.findOne({
      'eligibility.name': payload.keyword,
    });

    const existingDonation = await this.donationModel.findOne({
      keyword: keyword._id,
    });

    if (existingDonation) {
      // Update "donation" counter
      existingDonation.donation_queue += payload.total_redeem;
      return await existingDonation.save();
    } else {
      // Save to "donation"
      const newDonation = new this.donationModel({
        keyword: keyword._id,
        donation_target: (keyword.bonus[0] as KeywordDonation).target_poin,
        donation_current: 0,
        donation_queue: payload.total_redeem,
        start_time: keyword.eligibility.start_period,
        end_time: keyword.eligibility.end_period,
      });

      return await newDonation.save();
    }
  }

  async my_donation(
    paramDto: MyDonationParamDTO,
    queryDto: MyDonationQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    const skip = Number(queryDto.skip ?? 0);
    const limit = Number(queryDto.limit ?? 5);
    const filters = queryDto.filter ?? {};
    const query: any = [
      {
        $match: {
          msisdn: paramDto.msisdn,
          trace_id: queryDto.transaction_id ?? /.*/,
        },
      },
      {
        $group: {
          _id: '$keyword',
          keyword: { $first: '$keyword' },
          total_point: { $sum: '$total_redeem' },
        },
      },
      {
        $lookup: {
          from: 'keywords',
          let: { keyword_id: '$keyword' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$_id', '$$keyword_id'] }],
                },
              },
            },
            {
              $project: { 'eligibility.name': 1, 'eligibility.end_period': 1 },
            },
          ],
          as: 'keyword_detail',
        },
      },
      {
        $unwind: {
          path: '$keyword_detail',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const filter_builder = { $and: [] };
    const filterSet = filters as any;
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
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      });
    }

    const allData = await this.transactionDonationModel.aggregate(
      query,
      (err, result) => {
        if (err) {
          console.error(err);
        }
        return result;
      },
    );

    query.push({ $skip: skip });
    query.push({ $limit: limit });

    const data = await this.transactionDonationModel.aggregate(
      query,
      (err, result) => {
        if (err) {
          console.error(err);
        }
        return result;
      },
    );

    const response = new GlobalTransactionResponse();
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    // response.transaction_classify = 'MY_DONATION';
    response.payload = {
      total_record: allData.length,
      page_size: data.length,
      page_number: skip == 0 ? 1 : allData.length / skip,
      list_of_donation: data.map((item) => ({
        keyword: item.keyword_detail.eligibility.name,
        total_point: item.total_point,
        expired_date: this.convertDate(
          item.keyword_detail.eligibility.end_period,
        ),
      })),
    };
    return response;
  }

  async get_donation_process_by_keyword(keyword: string) {
    return await this.donationProcessModel.findOne({ keyword: keyword }).exec();
  }

  async getDonationByKeyword(param, query) {
    const response = new GlobalTransactionResponse();

    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    // response.transaction_classify = 'DONATION_KEYWORD';

    const filter_set =
      query.filter && query.filter !== undefined && query.filter !== ''
        ? JSON.parse(query.filter)
        : {};

    const filter_builder: any = {
      // 'keyword_detail.eligibility.name': {
      //   $regex: new RegExp(`${param.keyword}`, `i`),
      // },
      'keyword_detail.eligibility.name': param.keyword,
      deleted_at: null,
    };

    // if (query.transaction_id) {
    //   filter_builder['transaction_id'] = query.transaction_id;
    // }

    // if (query.channel_id) {
    //   filter_builder['channel_id'] = query.channel_id;
    // }

    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id' || a === 'type' || a === 'parent'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    const donations = await this.transactionDonationModel.aggregate(
      [
        {
          $group: {
            _id: '$keyword',
            keyword: { $first: '$keyword' },
            // total_msisdn: {
            //   $sum: 1,
            // },
            total_msisdn: { $addToSet: '$msisdn' },
            total_point: {
              $sum: '$total_redeem',
            },
          },
        },
        {
          $lookup: {
            from: 'keywords',
            // localField: 'keyword',
            // foreignField: '_id',
            as: 'keyword_detail',
            let: { keyword_id: '$keyword' },
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
                              input: '$$keyword_id',
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
          },
        },
        { $unwind: '$keyword_detail' },
        {
          $match: filter_builder,
        },
      ],
      (err, result) => {
        return result;
      },
    );

    response.payload = {
      list_of_donation: donations.map((el) => {
        return {
          keyword: el.keyword_detail.eligibility.name,
          total_msisdn: el.total_msisdn.length,
          total_point: el.total_point,
        };
      }),
    };

    return response;
  }
  /**
   * Get data from location donation process by keyword
   * @param keyword
   */

  private convertDate(date: string): Date {
    if (date == null) return null;

    const timezone = 'Asia/Jakarta';
    return moment.tz(moment.utc(date), timezone).format('YYYY-MM-DD');
  }

  async donationCurrentByKeyword(keywordId: string) {
    const dtDonation = await this.donationModel
      .findOne({ keyword: keywordId })
      .exec();
    return dtDonation;
  }
}
