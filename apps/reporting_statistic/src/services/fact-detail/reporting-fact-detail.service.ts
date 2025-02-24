import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';

import { validationKeywordPointValueRule } from '@/application/utils/Validation/keyword.validation';
import { Channel, ChannelDocument } from '@/channel/models/channel.model';
import {
  CustomerBrand,
  CustomerBrandDocument,
} from '@/customer/models/customer.brand.model';
import { GlobalResponse } from '@/dtos/response.dto';
import { Location, LocationDocument } from '@/location/models/location.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import {
  MerchantV2,
  MerchantV2Document,
} from '@/merchant/models/merchant.model.v2';

import {
  ReportFactDetail,
  ReportFactDetailDocument,
} from '../../model/fact-detail/report-fact-detail.model';

@Injectable()
export class ReportingFactDetailService {
  constructor(
    @InjectModel(ReportFactDetail.name, 'reporting')
    private ReportFactDetailModel: Model<ReportFactDetailDocument>,

    @InjectModel(Lov.name)
    private lovModel: Model<LovDocument>,

    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,

    @InjectModel(Channel.name)
    private channelModel: Model<ChannelDocument>,

    @InjectModel(CustomerBrand.name)
    private customerBrandModel: Model<CustomerBrandDocument>,

    @InjectModel(MerchantV2.name)
    private merchantModel: Model<MerchantV2Document>,
  ) {
    //
  }

  async detail(param: any): Promise<any> {
    const data = await this.ReportFactDetailModel.aggregate(
      [
        {
          $match: {
            $and: [{ _id: new Types.ObjectId(param) }, { deleted_at: '' }],
          },
        },
      ],
      (err, result) => {
        return result;
      },
    );
    return data[0];
  }
  async addValue(payload): Promise<GlobalResponse> {
    let programOwner = null;
    let programOwnerDetail = null;
    if (payload.program) {
      programOwner = await this.lovModel
        .findById(payload.program.program_owner)
        .exec();
      programOwnerDetail = await this.locationModel
        .findById(payload.program.program_owner_detail)
        .exec();
    }

    let programExperience = null;
    let programRegional = null;
    let channelCode = null;
    if (payload.keyword) {
      if (payload.keyword.eligibility) {
        programExperience = await this.lovModel
          .findById(payload.keyword.eligibility.program_experience[0])
          .exec();
        programRegional = await this.locationModel
          .findById(payload.keyword.eligibility.locations[0])
          .exec();
        channelCode = await this.channelModel
          .findById(payload.keyword.eligibility.channel_validation_list[0])
          .exec();
      }
    }

    let channel = null;
    let SMS = false;
    let UMB = false;
    if (payload.payload) {
      if (payload.payload.deduct) {
        channel = payload.payload.deduct.channel;
        SMS = channel.toLowerCase().includes('sms');
        UMB = channel.toLowerCase().includes('umb');
      }
    }

    let subscriberBrand = null;
    if (payload.customer) {
      subscriberBrand = await this.customerBrandModel
        .findById(payload.customer.brand[0])
        .exec();
    }
    const merchantID = new mongoose.Types.ObjectId(
      payload.keyword.eligibility?.merchant,
    );

    const merchant = payload.keyword.eligibility?.merchant
      ? await this.merchantModel.findById(merchantID)
      : null;

    const msisdn = payload.redeem ? payload.redeem.msisdn : '';
    const subsidy = payload.keyword
      ? payload.keyword.eligibility
        ? payload.keyword.eligibility.program_bersubsidi
        : false
      : false;

    const response = new GlobalResponse();
    response.transaction_classify = 'ADD_FACT_DETAIL';
    const newReportFactDetail = new this.ReportFactDetailModel({
      transaction_date: payload.submit_time ?? '',
      msisdn: msisdn.substring(2),
      keyword: payload.redeem ? payload.redeem.keyword : '',
      program_name: payload.program ? payload.program.name : '',
      program_owner: programOwner ? programOwner.set_value : '',
      detail_program_owner: programOwnerDetail ? programOwnerDetail.name : '',
      created_by: payload.account ? payload.account.user_name : '',
      lifestyle: programExperience ? programExperience.set_value : '',
      //Category gimana ambilnya?
      category: programExperience ? programExperience.set_value : '',
      //Keyword Title gimana ambilnya?
      keyword_title: payload.redeem ? payload.redeem.keyword : '',
      SMS: SMS,
      UMB: UMB,
      point: validationKeywordPointValueRule(payload),
      subscriber_brand: subscriberBrand ? subscriberBrand.name : '',
      program_regional: programRegional ? programRegional.name : '',
      //Keyword Title gimana ambilnya?
      cust_value: '',
      start_date: payload.keyword
        ? payload.keyword.eligibility
          ? payload.keyword.eligibility.start_period
          : ''
        : '',
      end_date: payload.keyword
        ? payload.keyword.eligibility
          ? payload.keyword.eligibility.end_period
          : ''
        : '',
      merchant_name: merchant?.merchant_name ? merchant?.merchant_name : 'SL',
      subscriber_region: payload.customer ? payload.customer.region : '',
      subscriber_branch: payload.customer ? payload.customer.city : '',
      channel_code: channelCode ? channelCode.code : '',
      subsidy: subsidy ? true : false,
      subscriber_tier: payload.customer
        ? payload.customer.loyalty_tier[0]
          ? payload.customer.loyalty_tier[0].name
          : ''
        : '',
      voucher_code: payload?.payload?.voucher?.core?.voucher_code ?? '',
    });

    return await newReportFactDetail
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(() => {
        response.message = 'ReportKeyword Created Successfully';
        response.statusCode = HttpStatus.OK;
        response.payload = newReportFactDetail;
        return response;
      });

    return response;
  }
  async add(request: ReportFactDetail): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    response.transaction_classify = 'ADD_FACT_DETAIL';
    const newReportFactDetail = new this.ReportFactDetailModel({
      ...request,
    });
    return await newReportFactDetail
      .save()
      .catch((e: Error) => {
        throw new Error(e.message);
      })
      .then(() => {
        response.message = 'ReportKeyword Created Successfully';
        response.statusCode = HttpStatus.OK;
        response.payload = newReportFactDetail;
        return response;
      });

    return response;
  }

  async edit(_id: string, data: ReportFactDetail): Promise<GlobalResponse> {
    const response = new GlobalResponse();
    const oid = new mongoose.Types.ObjectId(_id);
    await this.ReportFactDetailModel.findOneAndUpdate({ _id: oid }, data)
      .then(() => {
        response.message = 'ReportKeyword Updated Successfully';
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
    await this.ReportFactDetailModel.findOneAndUpdate(
      { _id: oid },
      { deleted_at: new Date() },
    )
      .then(async (res) => {
        response.statusCode = HttpStatus.NO_CONTENT;
        response.message = 'ReportKeyword Deleted Successfully';
        response.payload = res;
        return response;
      })
      .catch((e: Error) => {
        throw new Error(e.message);
      });

    return response;
  }
}
