import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import fs from 'fs';
import { Model } from 'mongoose';

import { Channel, ChannelDocument } from '@/channel/models/channel.model';

const path = require('path');

@Injectable()
export class InjectCouponService {
  private inject_coupon_dir: string;
  protected InjectCouponQueue: Queue;

  constructor(
    configService: ConfigService,
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
    @InjectQueue('inject') InjectCouponQueue: Queue,
  ) {
    this.InjectCouponQueue = InjectCouponQueue;
    this.inject_coupon_dir = `${configService.get<string>(
      'inject_coupon.dir',
    )}`;
  }

  async processFile(fileData: string, parameter: any, ip: string) {
    const channel = await this.channelModel.findOne({ ip: ip }).exec();
    return this.InjectCouponQueue.add(
      'inject-coupon',
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

  async process(payload: any, ip: string): Promise<any> {
    const corePayload = payload.payload.inject_point;
    const token = payload.token;
    fs.readdir(this.inject_coupon_dir, async (err, files) => {
      for (const file of files) {
        const ext = path.extname(file);
        if (ext == 'txt') {
          await this.processFile(file, corePayload, ip);
        }
      }
    });
  }
}
