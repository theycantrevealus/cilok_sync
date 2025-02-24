import { InjectQueue } from '@nestjs/bull';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import mongoose, { Model, Types } from 'mongoose';

import { LocalFileDto } from '@/application/utils/FilterDT/file.dto';
import { Channel, ChannelDocument } from '@/channel/models/channel.model';
import { InjectCouponDto } from '@/inject/dto/inject.dto';

@Injectable()
export class InjectService {
  protected InjectCouponQueue: Queue;

  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,

    @InjectQueue('inject') InjectCouponQueue: Queue,
  ) {
    this.InjectCouponQueue = InjectCouponQueue;
  }

  async uploadFile(
    fileData: LocalFileDto,
    parameter: any,
    ip: string,
    injectionName: string,
  ) {
    const channel = await this.channelModel.findOne({ ip: ip }).exec();
    return this.InjectCouponQueue.add(
      injectionName,
      {
        channel: channel,
        list: fileData,
        parameter: parameter,
        bulkCount: 100,
      },
      { removeOnComplete: true },
    ).then((job) => {
      return { job: job.id };
    });
  }
}
