import { Process, Processor } from '@nestjs/bull';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import * as fs from 'fs';
import mongoose, { Connection, Model } from 'mongoose';
import * as readline from 'readline';

import {
  KeywordEmployeeNumber,
  KeywordEmployeeNumberDocument,
} from '../models/keyword.employee.number.model';

@Processor('keyword')
export class KeywordProcessor {
  private connection: Connection;
  private listModel: Model<KeywordEmployeeNumberDocument>;

  constructor(
    @InjectConnection() connection: Connection,

    @InjectModel(KeywordEmployeeNumber.name)
    listModel: Model<KeywordEmployeeNumberDocument>,
  ) {
    this.connection = connection;
    this.listModel = listModel;
  }

  @Process('keyword-add-employee-number')
  async handleEmployeeNumber(job: Job): Promise<void> {
    if (job.data.list.filename) {
      const keyword = new mongoose.Types.ObjectId(job.data.keyword);
      await this.listModel.deleteMany({
        keyword: keyword,
      });

      const fileStream = fs.createReadStream(
        `./uploads/keyword/${job.data.list.filename}`,
      );

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const transactionSession = await this.connection.startSession();
      transactionSession.startTransaction();
      try {
        for await (const line of rl) {
          const tempList = await this.listModel
            .findOne({
              $and: [{ msisdn: line }, { keyword: keyword }],
            })
            .exec();
          if (!tempList) {
            await new this.listModel({
              msisdn: line,
              keyword: keyword,
            }).save();
          }
        }
        await transactionSession.commitTransaction();
        await transactionSession.endSession();
      } catch (e) {
        await transactionSession.abortTransaction();
      } finally {
        await transactionSession.endSession();
      }
    }
  }
}
