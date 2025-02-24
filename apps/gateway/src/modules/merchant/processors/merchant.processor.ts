import { OnQueueActive, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { InternalServerErrorException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import * as fs from 'fs';
import { Connection, Model } from 'mongoose';
import * as readline from 'readline';

import { Merchant, MerchantDocument } from '../models/merchant.model';

@Processor('merchant')
export class MerchantProcessor {
  private connection: Connection;
  private merchantModel: Model<MerchantDocument>;

  constructor(
    @InjectConnection() connection: Connection,
    @InjectModel(Merchant.name)
    merchantModel: Model<MerchantDocument>,
  ) {
    this.connection = connection;
    this.merchantModel = merchantModel;
  }

  @Process('merchant-import')
  async handleImportMerchant(job: Job): Promise<void> {
    const fileStream = fs.createReadStream(
      `./uploads/merchant/${job.data.list.filename}`,
    );

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });
    const transactionSession = await this.connection.startSession();

    try {
      const headingData = [];
      let counter = 0;
      transactionSession.startTransaction();
      for await (const line of rl) {
        const dataBuild = { created_by: job.data.created_by };
        const dataSplit = line.split('~');
        for (const a in dataSplit) {
          if (counter < 1) {
            // heading[dataSplit[a]] = a;
            headingData.push(dataSplit[a].toLowerCase());
            if (!dataBuild[dataSplit[a]]) {
              dataBuild[dataSplit[a]] = '';
            }
          }
          dataBuild[headingData[a]] = dataSplit[a];
        }
        if (counter > 0) {
          const check = await this.merchantModel
            .findOne({ $and: [{ merchant_id: dataBuild['merchant_id'] }] })
            .exec();
          const merchantDataModel = new this.merchantModel(dataBuild);
          if (!check) {
            await job.progress(await merchantDataModel.save());
          } else {
            delete dataBuild['merchant_id'];
            job.progress(
              await this.merchantModel.findOneAndUpdate(
                {
                  $and: [{ merchant_id: dataBuild['merchant_id'] }],
                },
                dataBuild,
              ),
            );
          }
        }
        counter++;
      }
      await transactionSession.commitTransaction();
    } catch (e) {
      await transactionSession.abortTransaction();
      throw new InternalServerErrorException(e);
    } finally {
      await transactionSession.endSession();
    }
  }

  @OnQueueFailed()
  onError(job: Job<any>, error: any) {
    throw new InternalServerErrorException(error);
  }

  @OnQueueActive()
  onActive(job: Job) {
    //
  }
}
