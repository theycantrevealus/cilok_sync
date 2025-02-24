import {
  BadRequestException,
  Injectable,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import * as moment from 'moment';
import { Model, Types } from 'mongoose';

import { ApplicationService } from '@/application/services/application.service';
import { formatMsisdnToID } from '@/application/utils/Msisdn/formatter';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { LovService } from '@/lov/services/lov.service';
import {
  ProgramV2,
  ProgramV2Document,
} from '@/program/models/program.model.v2';
import { Stock, StockDocument } from '@/stock/models/stock.model';
import { StockThresholdCounter } from '@/stock/models/stock-threshold-counter.model';

import {
  MyVoteDetailDTO,
  MyVoteDetailListDTO,
  MyVoteResponseDto,
  PaginatedMyVoteResponseDTO,
} from '../dto/myvote.response';
import {
  PaginatedVoteResponseDTO,
  VoteResponseDto,
} from '../dto/vote.response';
import {
  DetailVoteResultResponseDTO,
  VoteResultResponseDto,
} from '../dto/vote.result.response';
import {
  DetailVoteResponseDTO,
  VoteOptionDTO,
  VoteResponseSingleDto,
} from '../dto/vote.single.response';
// import { StockService } from '@/stock/services/stock.service';
import { Vote, VoteDocument } from '../models/vote.model';
import { VoteOption, VoteOptionDocument } from '../models/vote_option.model';
import {
  TransactionVote,
  TransactionVoteDocument,
} from '../models/vote_transaction.model';

@Injectable()
export class VoteService {
  private votingProductId: string;
  constructor(
    private applicationService: ApplicationService,
    private lovService: LovService,
    private configService: ConfigService,
    // private stockService: StockService,

    @InjectModel(Vote.name)
    private voteModel: Model<VoteDocument>,

    @InjectModel(VoteOption.name)
    private voteOptionModel: Model<VoteOptionDocument>,

    @InjectModel(TransactionVote.name)
    private voteTransactionModel: Model<TransactionVoteDocument>,

    @InjectModel(Keyword.name)
    private keywordModel: Model<KeywordDocument>,

    @InjectModel(ProgramV2.name)
    private programV2Model: Model<ProgramV2Document>,

    @InjectModel(Stock.name)
    private stockModel: Model<StockDocument>,
  ) {
    this.votingProductId = `${configService.get<string>(
      'core-backend.voting_product.id',
    )}`;
  }

  async addVoteData(payload, voting) {
    console.log(voting);
    // lihat semua isi voting
    for (let i = 0; i < voting.length; i++) {
      const vote = voting[i];
      // const program = await this.programV2Model.findById(
      //   payload.eligibility.program_id,
      // );

      const programAndKeyword = {
        program: new ObjectId(payload.eligibility.program_id),
        keyword: new ObjectId(payload._id),
      };

      const votingData = {
        ...programAndKeyword,
        // title: program?.name,
        // description: program?.desc,
        title: payload?.eligibility?.program_title_expose,
        description: payload?.eligibility?.program_title_expose,
        image: vote.voting_image,
        start_time: new Date(payload.eligibility.start_period).toISOString(),
        end_time: new Date(payload.eligibility.end_period).toISOString(),
        target_votes: vote.target_vote,
        // current_votes: 0, // init
        // current_points: 0, // init
      };

      // const dataExistence = await this.voteModel
      //   .findOne(programAndKeyword)
      //   .then((res) => res);

      // if (!dataExistence) {
      //   const newData = await new this.voteModel(votingData);
      //   await newData
      //     .save()
      //     .catch((e: BadRequestException) => {
      //       throw new BadRequestException(e.message); // Error untuk mongoose
      //     })
      //     .then(async (data) => {
      //       console.log(`Voting saved for '${votingData.title}'`);
      //       // generate voting optionnya
      //       await this.addVoteOptionData(payload, data, vote.voting_options);
      //     });
      // }

      await this.voteModel
        .findOneAndUpdate(programAndKeyword, votingData, {
          upsert: true,
          new: true,
        })
        .then(async (voted) => {
          console.log(`Voting saved for '${votingData.title}'`);
          // generate voting optionnya
          await this.addVoteOptionData(payload, voted, vote.voting_options);
        })
        .catch((e: BadRequestException) => {
          throw new BadRequestException(e.message); // Error untuk mongoose
        });
    }
  }

  private async addVoteOptionData(payload, vote, options) {
    console.log('With option:');

    const optionNameArr = options.map((opt) => opt.name);

    for (let i = 0; i < options.length; i++) {
      const voteOption = options[i];
      const votingImage = payload?.reward_catalog?.voting_options?.filter(
        (e) => e.name == voteOption?.name,
      );

      const voteOptionData = {
        vote: new ObjectId(vote._id),
        option: voteOption.name,
        description: voteOption.description ?? '',
        image: votingImage[0]?.image ?? '',
      };

      // const dataExistence = await this.voteOptionModel
      //   .findOne(voteOptionData)
      //   .then((res) => res);

      // if (!dataExistence) {
      //   const newData = await new this.voteOptionModel(voteOptionData);
      //   await newData
      //     .save()
      //     .catch((e: BadRequestException) => {
      //       throw new BadRequestException(e.message); // Error untuk mongoose
      //     })
      //     .then(async (data) => {
      //       console.log(`'${data.option}'`);
      //     });
      // }

      await this.voteOptionModel
        .findOneAndUpdate(voteOptionData, voteOptionData, {
          upsert: true,
          new: true,
        })
        .then(async (voted) => {
          console.log(`'${voted.option}'`);
        })
        .catch((e: BadRequestException) => {
          throw new BadRequestException(e.message); // Error untuk mongoose
        });

      // hapus jika opsinya tidak ada di payload
      // await this.voteOptionModel.updateMany(
      //   {
      //     option: {
      //       $nin: optionNameArr,
      //     },
      //   },
      //   {
      //     deleted_at: new Date(),
      //   },
      // );
    }
  }

  /**
   * Transaction
   */
  async processVote_old(payload): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const voting = payload?.payload?.voting;
        const program = payload.program._id;
        const keyword = payload.keyword._id;

        // simpan data vote
        const voteData = await this.voteModel.findOne({
          program: new ObjectId(program),
          keyword: new ObjectId(keyword),
        });
        if (!voteData) {
          reject("Vote doesn't exist");
        }

        voteData.current_votes += 1;
        await voteData.save().catch((e: Error) => {
          console.error(e.message);
        });

        // tambah transaction_donation
        const vote_trace_id = payload.tracing_master_id.replace('TRX', 'VOT');
        const voteTransaction = new this.voteTransactionModel({
          master_id: payload.tracing_master_id,
          trace_id: vote_trace_id, // replace
          program: new ObjectId(program),
          keyword: new ObjectId(keyword),
          option: voting.option,
          msisdn: formatMsisdnToID(payload.customer.msisdn),
          amount: Math.abs(payload.payload.deduct.amount),
          time: payload.submit_time,
        });

        await voteTransaction.save().catch((e: Error) => {
          console.log(e.message);
        });

        // kurangi stock
        // await this.stockService.deduct()
        // await this.deductStock(payload);
        resolve();
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  }

  async checkStock(payload) {
    // Get data stock
    const stock = await this.getStockData(
      payload,
      payload.customer.location_id,
    );

    if (!stock || !stock.balance) {
      return false;
    }

    return true;
  }

  async deductStock(payload) {
    const stock = await this.getStockData(
      payload,
      payload.customer.location_id,
    );
    stock.balance -= 1;
    await stock.save();
  }

  /**
   * General Function
   */
  async checkVoteOptionAvailableFromVote(keyword, option) {
    const vote = await this.voteModel.findOne({
      keyword: new ObjectId(keyword._id.toString()),
    });
    if (vote) {
      const voteOption = await this.voteOptionModel.findOne({
        _id: new ObjectId(option),
        vote: new ObjectId(vote._id.toString()),
        // deleted_at: null,
      });
      if (voteOption) return true;
    }
    return false;
  }

  private async getStockData(payload: any, location_id: string): Promise<any> {
    return this.stockModel
      .findOne({
        product: this.votingProductId, // new ObjectId(this.votingProductId),
        keyword: new ObjectId(payload.keyword._id),
        location: new ObjectId(location_id),
      })
      .exec();
  }

  private async getVoteMsisdn(keyword) {
    const vote_trx = await this.voteTransactionModel.find({
      // program: new ObjectId(vote.program_id),
      keyword: new ObjectId(keyword),
    });

    const vote_msisdn: string[] = [];
    vote_trx.map((trx) => {
      if (!vote_msisdn.includes(trx.msisdn)) {
        vote_msisdn.push(trx.msisdn);
      }
    });

    return vote_msisdn;
  }

  /**
   * CRUD
   */
  async voting_all(reqQuery): Promise<VoteResponseDto> {
    const skip = Number(reqQuery?.skip ?? 0);
    const limit = Number(reqQuery?.limit ?? 5);

    const query: any = [];
    const filter_builder: any = {
      deleted_at: null,
    };

    const filter_set =
      query.filter && reqQuery.filter !== undefined && reqQuery.filter !== ''
        ? JSON.parse(reqQuery.filter)
        : {};

    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }

      if (a === '_id') {
        filter_builder[a] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'program_id') {
        filter_builder['program'] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'program_name') {
        const res = await this.programSearch(filter_set[a]);

        filter_builder['keyword'] = new Types.ObjectId(res);
      } else if (a === 'keyword_id') {
        filter_builder['keyword'] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'keyword_name') {
        const keyword = await this.keywordModel.findOne({
          'eligibility.name': filter_set[a],
        });

        filter_builder['keyword'] = new Types.ObjectId(keyword?._id);
      } else {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
    }

    delete filter_builder['program_id'];
    delete filter_builder['program_name'];
    delete filter_builder['keyword_id'];
    delete filter_builder['keyword_name'];

    query.push({ $sort: { created_at: -1 } });
    query.push({ $match: filter_builder });
    query.push(
      {
        $lookup: {
          from: 'keywords',
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
    );

    // const allData = await this.voteModel.aggregate(query, (err, result) => {
    //   if (err) {
    //     console.error(err);
    //   }
    //   return result;
    // });

    // only active keyword
    query.push({
      $match: {
        'keyword_detail.is_stoped': false,
        'keyword_detail.eligibility.end_period': {
          $gt: moment().utc().toDate(),
        },
      },
    });

    //
    query.push({ $skip: skip });
    query.push({ $limit: limit });

    const data = await this.voteModel.aggregate(query, (err, result) => {
      if (err) {
        console.error(err);
      }
      return result;
    });

    const response = new VoteResponseDto();
    let votePayload = new PaginatedVoteResponseDTO();

    votePayload = {
      page_size: data.length,
      // page_number: skip == 0 ? 1 : allData.length / skip,
      list_of_vote: data.map((item) => ({
        program_id: item.program.toString(),
        program_name: item.title, // TODO: dari create
        keyword_id: item.keyword_detail._id.toString(),
        keyword_name: item.keyword_detail.eligibility.name,
        // description: item.description,
        // image: item.image,
        // start_time: item.start_time,
        end_time: item.end_time,
        target_votes: item.target_votes,
        current_votes: item.current_votes,
      })),
    };

    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';
    response.payload = votePayload;
    return response;
  }

  async voting_desc(reqQuery): Promise<VoteResponseSingleDto> {
    const query: any = [];
    const filter_builder: any = {
      deleted_at: null,
    };

    const filter_set =
      query.filter && reqQuery.filter !== undefined && reqQuery.filter !== ''
        ? JSON.parse(reqQuery.filter)
        : {};

    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      if (a === '_id') {
        filter_builder[a] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'program_id') {
        filter_builder['program'] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'program_name') {
        const res = await this.programSearch(filter_set[a]);

        filter_builder['keyword'] = new Types.ObjectId(res);
      } else if (a === 'keyword_id') {
        filter_builder['keyword'] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'keyword_name') {
        const keyword = await this.keywordModel.findOne({
          'eligibility.name': filter_set[a],
        });

        filter_builder['keyword'] = new Types.ObjectId(keyword?._id);
      } else {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
    }

    delete filter_builder['program_id'];
    delete filter_builder['program_name'];
    delete filter_builder['keyword_id'];
    delete filter_builder['keyword_name'];

    query.push({ $match: filter_builder });
    query.push({
      $lookup: {
        from: 'vote_option',
        let: { vote_id: '$_id' },
        pipeline: [
          {
            // $match: {
            //   $expr: {
            //     $and: [
            //       { $eq: ['$vote', '$$vote_id'] },
            //       // { $eq: ['$deleted_at', null] },
            //     ],
            //   },
            // },
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$vote', '$$vote_id'] },
                },
                { deleted_at: null },
              ],
            },
          },
          {
            $project: {
              _id: true,
              option: true,
              description: true,
            },
          },
        ],
        as: 'vote_options',
      },
    });

    query.push(
      {
        $lookup: {
          from: 'keywords',
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
    );

    let data = await this.voteModel.aggregate(query, (err, result) => {
      if (err) {
        console.error(err);
      }
      return result;
    });

    data = await Promise.all(
      data.map(async (d) => {
        const options = await Promise.all(
          d.vote_options.map(async (o) => {
            const option = await this.voteTransactionModel.find({
              program: d.program,
              keyword: d.keyword,
              option: o._id,
            });

            return {
              _id: o._id,
              option: o.option,
              description: o.description ?? '',
              point: option.reduce((a, o) => a + o.amount, 0) ?? 0,
              vote: option.length ?? 0,
            };
          }),
        );

        let vote = new DetailVoteResponseDTO();
        vote = {
          program_id: d.program.toString(),
          program_name: d.title,
          keyword_id: d.keyword_detail._id.toString(),
          keyword_name: d.keyword_detail.eligibility.name,
          end_time: d.end_time,
          total_point: options.reduce((a, o) => a + o.point, 0),
          total_vote: d.current_votes,
          vote_options: options,
        };
        return vote;
      }),
    );

    const response = new VoteResponseSingleDto();
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';

    const payloadData: DetailVoteResponseDTO[] = data;
    response.payload = payloadData;

    return response;
  }

  private async getMyVoteOption(payload) {
    const query = [
      {
        $match: {
          msisdn: payload.msisdn,
          program: payload.program,
          keyword: payload.keyword,
        },
      },
      {
        $group: {
          _id: '$option',
          vote: { $first: '$$ROOT' },
          total_vote: {
            $sum: 1,
          },
          total_point: {
            $sum: '$amount',
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$vote',
              { total_vote: '$total_vote' },
              { total_point: '$total_point' },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'vote_option',
          as: 'option_detail',
          let: { option_id: '$option' },
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
                            input: '$$option_id',
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
      { $unwind: '$option_detail' },
      {
        $project: {
          _id: '$option_detail._id',
          total_vote: true,
          total_point: true,
          option: '$option_detail.option',
          // description: '$option_detail.description',
          description: { $ifNull: ['$option_detail.description', ''] },
        },
      },
    ];

    const data = await this.voteTransactionModel.aggregate(query);
    return data;
  }

  async my_votes(msisdn, reqQuery) {
    const response = new MyVoteResponseDto();

    const skip = Number(reqQuery?.skip ?? 0);
    const limit = Number(reqQuery?.limit ?? 5);

    let match = {
      msisdn: formatMsisdnToID(msisdn),
    };

    if (reqQuery?.filter) {
      const filterQuery = await this.generateFilters(reqQuery);
      match = {
        ...match,
        ...filterQuery,
      };
    }

    const query: any = [
      {
        $match: match,
      },
      {
        $group: {
          _id: '$keyword',
          vote: { $first: '$$ROOT' },
          latestVote: {
            $max: '$created_at', // latest
          },
          total_vote: {
            $sum: 1,
          },
          total_point: {
            $sum: '$amount',
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$vote',
              { total_vote: '$total_vote' },
              { total_point: '$total_point' },
              {
                latestVote: '$latestVote',
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'keywords',
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
        $lookup: {
          from: 'programv2',
          as: 'program_detail',
          let: { program_id: '$program' },
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
          ],
        },
      },
      { $unwind: '$program_detail' },
      {
        $sort: {
          latestVote: -1, // latest first
        },
      },
      { $skip: skip },
      { $limit: limit },
    ];

    let data = await this.voteTransactionModel.aggregate(
      query,
      (err, result) => {
        if (err) {
          console.error(err);
        }
        return result;
      },
    );

    JSON.stringify(data, null, 2);

    data = await Promise.all(
      data.map(async (d) => {
        const myVote: MyVoteDetailListDTO[] = await this.getMyVoteOption({
          msisdn: msisdn,
          program: d.program,
          keyword: d.keyword,
        });

        let myVoteDetail = new MyVoteDetailDTO();
        myVoteDetail = {
          program_id: d.program_detail._id.toString(),
          // program_name: d.program_detail.name,
          // program_name: d.title, // keyword_detail.eligibility?.program_title_expose, // TODO
          program_name:
            d.keyword_detail.eligibility?.program_title_expose ?? '',
          keyword_id: d.keyword_detail._id,
          keyword_name: d.keyword_detail.eligibility.name,
          end_time: d.end_time,
          total_point: myVote?.reduce(
            (n, { total_point }) => n + total_point,
            0,
          ),
          total_vote: myVote?.reduce((n, { total_vote }) => n + total_vote, 0),
          votes: myVote,
        };

        return myVoteDetail;
      }),
    );

    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';

    let myVoteRespone = new PaginatedMyVoteResponseDTO();
    myVoteRespone = {
      page_size: data.length,
      list_of_vote: data,
    };

    response.payload = myVoteRespone;

    return response;
  }

  async vote_result(keyword_id): Promise<VoteResultResponseDto> {
    const vote = await this.voting_desc({
      filter: `{ "keyword_id": "${keyword_id.toString()}" }`,
    });

    const { payload } = vote;
    if (!payload.length) {
      throw new BadRequestException([{ isNotFoundGeneral: 'Vote Not Found' }]);
    }

    const payloadSingle = payload[0];

    const vote_msisdn = await this.getVoteMsisdn(payloadSingle.keyword_id);
    const vote_option: VoteOptionDTO[] = payloadSingle.vote_options.map(
      (opt) => {
        return {
          id: opt.id,
          title: opt.title,
          description: opt.description ?? '',
          point: opt.point,
          vote: opt.vote,
        };
      },
    );

    const response = new VoteResultResponseDto();
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';

    let data = new DetailVoteResultResponseDTO();
    data = {
      program_id: payloadSingle.program_id,
      program_name: payloadSingle.program_name,
      keyword_id: payloadSingle.keyword_id,
      keyword_name: payloadSingle.keyword_name,
      end_time: payloadSingle.end_time,
      vote_options: vote_option,
      msisdn: vote_msisdn,
    };
    response.payload = data;

    return response;
  }

  async vote_result_msisdn(res, keyword_id) {
    let vote: any = await this.voting_desc({
      filter: `{ "keyword_id": "${keyword_id.toString()}" }`,
    });

    vote = vote.payload;
    if (!vote.length) {
      throw new BadRequestException([{ isNotFoundGeneral: 'Vote Not Found' }]);
    }

    vote = vote[0];

    const vote_msisdn = await this.getVoteMsisdn(vote.keyword_id);

    res.set({
      'Content-Disposition': `attachment; filename="voting-${vote.program_name}-${vote.keyword_name}-result.csv"`,
    });

    return new StreamableFile(Buffer.from(vote_msisdn.join('\n'), 'utf-8'));
  }

  async editVoteData(payloadMain, payloadEdit, votingOld, VotingNew) {
    console.log(VotingNew);
    console.log(votingOld);
    // lihat semua isi voting
    for (let i = 0; i < votingOld.length; i++) {
      const vote = votingOld[i];
      for (let j = 0; j < VotingNew.length; j++) {
        const voteNew = VotingNew[j];
        const programAndKeyword = {
          program: new ObjectId(payloadMain.eligibility.program_id),
          keyword: new ObjectId(payloadMain._id),
        };

        const votingData = {
          ...programAndKeyword,
          title: payloadEdit?.eligibility?.program_title_expose,
          description: payloadEdit?.eligibility?.program_title_expose,
          image: voteNew.voting_image,
          start_time: new Date(
            payloadEdit.eligibility.start_period,
          ).toISOString(),
          end_time: new Date(payloadEdit.eligibility.end_period).toISOString(),
          target_votes: voteNew.target_vote,
        };

        await this.voteModel
          .findOneAndUpdate(programAndKeyword, votingData, {
            upsert: true,
            new: true,
          })
          .then(async (voted) => {
            console.log(`Voting saved for '${voted}'`);
            // generate voting optionnya
            await this.editVoteOptionData(
              payloadEdit,
              voted,
              vote.voting_options,
              voteNew.voting_options,
            );
          })
          .catch((e: BadRequestException) => {
            throw new BadRequestException(e.message); // Error untuk mongoose
          });
      }
    }
  }

  private async editVoteOptionData(payload, vote, optionsOld, optionsNew) {
    console.log('With option:');

    const sortedOldOptions = optionsOld; //.toReversed();
    const sortedNewOptions = optionsNew; //.toReversed();

    const maxLength = Math.max(
      sortedOldOptions.length,
      sortedNewOptions.length,
    );

    for (let i = 0; i < maxLength; i++) {
      const voteOptionOld = sortedOldOptions?.[i];
      const voteOptionsNew = sortedNewOptions?.[i];

      console.log(`VoteOptionOld: ${i}`, JSON.stringify(voteOptionOld));
      console.log(`VoteOptionNew: ${i}`, JSON.stringify(voteOptionsNew));
      console.log('-- VOTE_OPTION --');

      // data tidak ada di opsi old?
      if (!voteOptionOld) {
        const voteOptionImage = payload?.reward_catalog?.voting_options?.filter(
          (e) => e.name == voteOptionsNew?.name,
        );

        // tambahkan opsi baru
        await this.voteOptionModel.create({
          vote: new ObjectId(vote._id),
          option: voteOptionsNew.name,
          description: voteOptionsNew.description,
          image: voteOptionImage[0]?.image ?? '',
        });
      } else {
        // data ada di old? berarti update

        // cari data oldnya di coll vote_options
        const oldVoteOptionData = await this.voteOptionModel.findOne({
          vote: new Object(vote._id),
          option: voteOptionOld.name,
        });

        // apakah opsi ada?
        if (oldVoteOptionData) {
          const voteOptionImage =
            payload?.reward_catalog?.voting_options?.filter(
              (e) => e.name == voteOptionsNew?.name,
            );

          await this.voteOptionModel.updateOne(
            {
              _id: oldVoteOptionData._id,
            },
            {
              option: voteOptionsNew.name,
              description: voteOptionsNew.description,
              image: voteOptionImage[0]?.image ?? '',
            },
          );
        } else {
          // data vote lama tidak ditemukan?
          console.log(
            `[VOTE_OPTION_ERROR] ${voteOptionOld.name} does not exitst in old voting options!`,
          );
        }
      }
    }
  }

  private async generateFilters(reqQuery) {
    const query: any = [];
    const filter_builder: any = {
      deleted_at: null,
    };

    const filter_set =
      query.filter && reqQuery.filter !== undefined && reqQuery.filter !== ''
        ? JSON.parse(reqQuery.filter)
        : {};

    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    /**
     program_name: d.keyword_detail.eligibility?.program_title_expose, // TODO
     keyword_id: d.keyword_detail._id,
     keyword_name: d.keyword_detail.eligibility.name,
     */
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      if (a === '_id') {
        filter_builder[a] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'program_id') {
        filter_builder['program'] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'program_name') {
        const res = await this.programSearch(filter_set[a]);

        filter_builder['keyword'] = new Types.ObjectId(res);
      } else if (a === 'keyword_id') {
        filter_builder['keyword'] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'keyword_name') {
        const keyword = await this.keywordModel.findOne({
          'eligibility.name': filter_set[a],
        });

        filter_builder['keyword'] = new Types.ObjectId(keyword?._id);
      } else {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
    }

    delete filter_builder['program_id'];
    delete filter_builder['program_name'];
    delete filter_builder['keyword_id'];
    delete filter_builder['keyword_name'];

    return filter_builder;
  }

  private async checkIsValidObjectId(str) {
    try {
      const check = new ObjectId(str);
      if (check?.toString() == str) {
        return true;
      }

      return false;
    } catch (err) {
      return false;
    }
  }

  async voting_detail(
    keyword: string,
    reqQuery,
  ): Promise<VoteResponseSingleDto> {
    const skip = Number(reqQuery?.skip ?? 0);
    const limit = Number(reqQuery?.limit ?? 5);

    const query: any = [];
    const filter_builder: any = {
      deleted_at: null,
    };

    const filter_set =
      query.filter && reqQuery.filter !== undefined && reqQuery.filter !== ''
        ? JSON.parse(reqQuery.filter)
        : {};

    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] =
        a === '_id'
          ? new Types.ObjectId(filter_set[a])
          : new RegExp(`${filter_set[a]}`, 'i');
    }

    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      if (a === '_id') {
        filter_builder[a] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'program_id') {
        filter_builder['program'] = new Types.ObjectId(filter_set[a]);
      } else if (a === 'program_name') {
        const res = await this.programSearch(filter_set[a]);

        filter_builder['keyword'] = new Types.ObjectId(res);
      } else {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
    }

    const qor: any = [
      {
        'eligibility.name': keyword,
      },
    ];

    if (await this.checkIsValidObjectId(keyword)) {
      qor.push({
        _id: new ObjectId(keyword),
      });
    }

    const singleKeyword = await this.keywordModel.findOne({ $or: qor });

    filter_builder['keyword'] = new Types.ObjectId(singleKeyword?._id);

    delete filter_builder['program_id'];
    delete filter_builder['program_name'];
    delete filter_builder['keyword_id'];
    delete filter_builder['keyword_name'];

    query.push({ $match: filter_builder });
    query.push({
      $lookup: {
        from: 'vote_option',
        let: { vote_id: '$_id' },
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$vote', '$$vote_id'] },
                },
                { deleted_at: null },
              ],
            },
          },
          {
            $project: {
              _id: true,
              option: true,
              description: true,
            },
          },
        ],
        as: 'vote_options',
      },
    });

    query.push(
      {
        $lookup: {
          from: 'keywords',
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
    );

    query.push({ $skip: skip });
    query.push({ $limit: limit });

    let data = await this.voteModel.aggregate(query, (err, result) => {
      if (err) {
        console.error(err);
      }
      return result;
    });

    data = await Promise.all(
      data.map(async (d) => {
        const options = await Promise.all(
          d.vote_options.map(async (o) => {
            const option = await this.voteTransactionModel.find({
              program: d.program,
              keyword: d.keyword,
              option: o._id,
            });

            return {
              _id: o._id,
              option: o.option,
              description: o.description ?? '',
              point: option.reduce((a, o) => a + o.amount, 0) ?? 0,
              vote: option.length ?? 0,
            };
          }),
        );

        let vote = new DetailVoteResponseDTO();
        vote = {
          program_id: d.program.toString(),
          program_name: d.title,
          keyword_id: d.keyword_detail._id.toString(),
          keyword_name: d.keyword_detail.eligibility.name,
          end_time: d.end_time,
          total_point: options.reduce((a, o) => a + o.point, 0),
          total_vote: d.current_votes,
          vote_options: options,
        };
        return vote;
      }),
    );

    const response = new VoteResponseSingleDto();
    response.code = HttpStatusTransaction.CODE_SUCCESS;
    response.message = 'Success';

    const payloadData: DetailVoteResponseDTO[] = data;
    response.payload = payloadData;

    return response;
  }

  private async programSearch(str) {
    const res = await this.keywordModel.findOne({
      'eligibility.program_title_expose': str,
    });

    return res?.id;
  }
}
