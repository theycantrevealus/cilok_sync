import {
  Channel,
  ChannelDocument,
} from '@gateway/channel/models/channel.model';
import {
  ReportTrendChannelRedeemer,
  ReportTrendChannelRedeemerDocument,
} from '@gateway/report/models/report-trend-channel-redeemer.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { Model } from 'mongoose';

import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';

import {
  ReportUniqueChannelTrendsSystem,
  ReportUniqueChannelTrendsSystemDocument,
} from '../../model/channel_trends/unique.channel.trends.model';

@Injectable()
export class ReportingTrendsChannelService {
  constructor(
    @InjectModel(ReportUniqueChannelTrendsSystem.name, 'reporting')
    private reportUniqueChannelTrendsSystem: Model<ReportUniqueChannelTrendsSystemDocument>,
    @InjectModel(ReportTrendChannelRedeemer.name, 'reporting')
    private reportTrendChannelRedeemerModel: Model<ReportTrendChannelRedeemerDocument>,
    @InjectModel(Channel.name)
    private channelModel: Model<ChannelDocument>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async createReportingChannelTrends({
    program,
    channel,
    msisdn,
    total_redeem,
    report_start,
    report_end,
  }: ReportUniqueChannelTrendsSystem): Promise<GlobalTransactionResponse> {
    console.log('<--- start report trends channel --->');
    const response = new GlobalTransactionResponse();

    try {
      // Check if the channel exists
      const channelExist = await this.channelModel
        .findOne({ code: channel })
        .exec();

      if (!channelExist) {
        channel = '';
      }

      const query = {
        program: program,
        msisdn: msisdn,
        channel: channel,
      };
      const update = {
        $inc: { total_redeem },
        $set: {
          updated_at: new Date(),
          report_start: report_start,
          report_end: report_end,
        },
      };
      const options = { upsert: true };

      // Update or create the reportUniqueChannelTrendsSystem record
      const updateResult = await this.reportUniqueChannelTrendsSystem
        .updateOne(query, update, options)
        .exec();

      console.log('query trends : ', query);

      response.code = HttpStatusTransaction.CODE_SUCCESS;
      response.message = 'Success';
      response.transaction_classify = 'UPDATE_CHANNEL_TRENDS';
      response.payload = {
        trace_id: true,
        ...updateResult,
      };

      // Call the reportTrendsChannel function
      await this.reportTrendsChannel({ ...query, report_start });

      return response;
    } catch (error) {
      // Handle errors gracefully
      console.error('Error in createReportingChannelTrends:', error);
      return error;
    }
  }
  async reportTrendsChannel(data) {
    try {
      // Convert program to ObjectId
      data.program = new ObjectId(data.program);

      // Log for debugging
      console.log(data, 'collect');

      // Find reports matching the given criteria
      const findReport = await this.reportUniqueChannelTrendsSystem.find({
        program: data.program,
        msisdn: data.msisdn,
        channel: data.channel,
        report_start: data.report_start,
      });

      // Log for debugging
      console.log(findReport, 'findReport');

      // Calculate the maximum total_redeem
      const maxTotalRedeem = Math.max(
        ...findReport.map((item) => item.total_redeem),
      );

      // Log for debugging
      console.log(maxTotalRedeem, 'maxTotalRedeem');

      for (let index = 0; index < maxTotalRedeem; index++) {
        // Check if data exists in reportTrendChannelRedeemerModel
        const dataExistence =
          await this.reportTrendChannelRedeemerModel.findOne({
            program: data.program,
            date: data.report_start,
            channel_name: data.channel,
            total_redeem: index + 1,
          });

        if (!dataExistence) {
          // If data doesn't exist, create a new record
          const newData = new this.reportTrendChannelRedeemerModel({
            program: data.program,
            date: data.report_start,
            channel_name: data.channel,
            total_redeem: index + 1,
            total_msisdn: 1,
          });

          // Save the new record
          await newData.save();
        } else {
          // If data exists, update it
          const findReportExis =
            await this.reportUniqueChannelTrendsSystem.find({
              program: data.program,
              report_start: data.report_start,
              channel: data.channel,
              total_redeem: index + 1,
            });

          const total_msisdn = findReportExis.length;

          // Update the existing record
          await this.reportTrendChannelRedeemerModel.findOneAndUpdate(
            {
              program: data.program,
              date: data.report_start,
              channel_name: data.channel,
              total_redeem: index + 1,
            },
            { total_msisdn: total_msisdn, updated_at: new Date() },
          );
        }
      }
    } catch (error) {
      // Handle errors gracefully
      console.error('Error in reportTrendsChannel:', error);
      return error;
      // throw error;
    }
  }
}
