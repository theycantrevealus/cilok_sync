import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';

import { GlobalResponse } from '@/dtos/response.dto';

import { ReportFilterDTO } from '../dtos/report-filter.dto';
import { getPrimeQuery } from '../helpers/get-prime-query.helper';
import {
  ReportTrendChannelRedeemer,
  ReportTrendChannelRedeemerDocument,
} from '../models/report-trend-channel-redeemer.model';

const moment = require('moment-timezone');

@Injectable()
export class ReportTrendChannelRedeemerService {
  constructor(
    @InjectModel(ReportTrendChannelRedeemer.name)
    private reportTrendChannelRedeemerModel: Model<ReportTrendChannelRedeemerDocument>,
  ) {
    //
  }

  async list(filter: ReportFilterDTO): Promise<any> {
    console.log({ filter });
    const data = await this.reportTrendChannelRedeemerModel
      .aggregate([
        {
          $match: {
            program: new Types.ObjectId(filter.program),
            date: {
              $gte: moment(filter.start_date).startOf('day').toDate(),
              $lte: moment(filter.end_date).endOf('day').toDate(),
            },
          },
        },
        {
          $lookup: {
            from: 'programv2',
            foreignField: '_id',
            localField: 'program',
            as: 'program_detail',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                },
              },
            ],
          },
        },
        { $unwind: '$program_detail' },
        {
          $lookup: {
            from: 'channels',
            foreignField: '_id',
            localField: 'channel',
            as: 'channel_detail',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                },
              },
            ],
          },
        },
        { $unwind: '$channel_detail' },
      ])
      .exec();

    return {
      message: HttpStatus.OK,
      payload: {
        data: data,
      },
    };
  }

  async prime(param: any): Promise<any> {
    const { query, totalRecords } = await getPrimeQuery(
      param,
      this.reportTrendChannelRedeemerModel,
    );

    const data = await this.reportTrendChannelRedeemerModel.aggregate(
      query,
      (err, result) => {
        return result;
      },
    );

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: totalRecords,
        data: data,
      },
    };
  }

  async detail(param: any): Promise<any> {
    const data = await this.reportTrendChannelRedeemerModel.aggregate(
      [
        {
          $match: {
            $and: [{ _id: new Types.ObjectId(param) }, { deleted_at: null }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
    return data[0];
  }

  async add(request: ReportTrendChannelRedeemer): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'ADD_REPORT_TREND_CHANNEL_REDEEMER';
    const newReportTrendChannelRedeemer =
      new this.reportTrendChannelRedeemerModel({
        ...request,
      });
    return await newReportTrendChannelRedeemer
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(() => {
        response.message = 'ReportTrendChannelRedeemer Created Successfully';
        response.statusCode = HttpStatus.OK;
        response.payload = newReportTrendChannelRedeemer;
        return response;
      });

    return response;
  }

  async edit(
    _id: string,
    data: ReportTrendChannelRedeemer,
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    const oid = new mongoose.Types.ObjectId(_id);
    await this.reportTrendChannelRedeemerModel
      .findOneAndUpdate({ _id: oid }, data)
      .then(() => {
        response.message = 'ReportTrendChannelRedeemer Updated Successfully';
        response.statusCode = HttpStatus.OK;
        response.payload = data;
        return response;
      })
      .catch((e: Error) => {
        throw new Error(e.message);
      });
    return response;
  }

  async delete(_id: string): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    const oid = new mongoose.Types.ObjectId(_id);
    await this.reportTrendChannelRedeemerModel
      .findOneAndUpdate({ _id: oid }, { deleted_at: new Date() })
      .then(async (res) => {
        response.statusCode = HttpStatus.NO_CONTENT;
        response.message = 'ReportTrendChannelRedeemer Deleted Successfully';
        response.payload = res;
        return response;
      })
      .catch((e: Error) => {
        throw new Error(e.message);
      });

    return response;
  }
}
