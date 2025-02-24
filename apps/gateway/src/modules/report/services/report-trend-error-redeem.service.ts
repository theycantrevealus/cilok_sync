import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';

import { GlobalResponse } from '@/dtos/response.dto';

import { ReportFilterDTO } from '../dtos/report-filter.dto';
import { getPrimeQuery } from '../helpers/get-prime-query.helper';
import {
  ReportTrendErrorRedeem,
  ReportTrendErrorRedeemDocument,
} from '../models/report-trend-error-redeem.model';

const moment = require('moment-timezone');

@Injectable()
export class ReportTrendErrorRedeemService {
  constructor(
    @InjectModel(ReportTrendErrorRedeem.name)
    private reportTrendErrorRedeemModel: Model<ReportTrendErrorRedeemDocument>,
  ) {
    //
  }

  // TODO : Check this query
  async list(filter: ReportFilterDTO): Promise<any> {
    console.log({ filter });
    const data = await this.reportTrendErrorRedeemModel
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
            localField: 'program',
            foreignField: '_id',
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
            from: 'keywordv3',
            localField: 'keyword',
            foreignField: '_id',
            as: 'keyword_detail',
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
        { $unwind: '$keyword_detail' },
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
      this.reportTrendErrorRedeemModel,
    );
    const data = await this.reportTrendErrorRedeemModel.aggregate(
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
    const data = await this.reportTrendErrorRedeemModel.aggregate(
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

  async add(request: ReportTrendErrorRedeem): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'ADD_BANK';
    const newReportTrendErrorRedeem = new this.reportTrendErrorRedeemModel({
      ...request,
    });
    return await newReportTrendErrorRedeem
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(() => {
        response.message = 'ReportTrendErrorRedeem Created Successfully';
        response.statusCode = HttpStatus.OK;
        response.payload = newReportTrendErrorRedeem;
        return response;
      });

    return response;
  }

  async edit(
    _id: string,
    data: ReportTrendErrorRedeem,
  ): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    const oid = new mongoose.Types.ObjectId(_id);
    await this.reportTrendErrorRedeemModel
      .findOneAndUpdate({ _id: oid }, data)
      .then(() => {
        response.message = 'ReportTrendErrorRedeem Updated Successfully';
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
    await this.reportTrendErrorRedeemModel
      .findOneAndUpdate({ _id: oid }, { deleted_at: new Date() })
      .then(async (res) => {
        response.statusCode = HttpStatus.NO_CONTENT;
        response.message = 'ReportTrendErrorRedeem Deleted Successfully';
        response.payload = res;
        return response;
      })
      .catch((e: Error) => {
        throw new Error(e.message);
      });

    return response;
  }
}
