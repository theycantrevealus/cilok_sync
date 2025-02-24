import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueError,
  OnQueuePaused,
  Process,
  Processor,
} from '@nestjs/bull';
import { HttpException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import * as fs from 'fs';
import mongoose, { Connection, Model } from 'mongoose';
import * as readline from 'readline';
import { throwError } from 'rxjs';

import { isMatchProgramSSO } from '@/application/utils/Msisdn/formatter';

import {
  ProgramBlacklist,
  ProgramBlacklistDocument,
} from '../models/program.blacklist.model';
import {
  ProgramTemplist,
  ProgramTemplistDocument,
} from '../models/program.templist.model';
import {
  ProgramWhitelist,
  ProgramWhitelistDocument,
} from '../models/program.whitelist.model';

@Processor('program')
export class ProgramProcessor {
  // private connection: Connection;
  // private listModel: Model<ProgramTemplistDocument>;
  // private listWModel: Model<ProgramWhitelistDocument>;
  // private listBModel: Model<ProgramBlacklistDocument>;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(ProgramTemplist.name)
    private readonly listModel: Model<ProgramTemplistDocument>,

    @InjectModel(ProgramWhitelist.name)
    private readonly listWModel: Model<ProgramWhitelistDocument>,

    @InjectModel(ProgramBlacklist.name)
    private readonly listBModel: Model<ProgramBlacklistDocument>,
  ) {
    // this.connection = connection;
    // this.listModel = listModel;
    // this.listWModel = listWModel;
    // this.listBModel = listBModel;
  }

  @OnQueueActive()
  onActive(job: Job) {
    job.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }

  @OnQueueError()
  onError(error: Error) {
    throw new Error(error?.stack);
  }

  @OnQueuePaused()
  onPaused() {
    // job.log('Job paused?');
    console.log(`Job paused ....`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    job.progress(100);
    job.log(`Job finished with result: ${result}`);
  }

  @Process('program-process-list')
  async handleMoveTemp(job: Job): Promise<void> {
    const transactionSession = await this.connection.startSession();
    transactionSession.startTransaction();
    try {
      const tempList = await this.listModel
        .find({
          $eq: { channel: job.data.channel },
        })
        .exec();
      if (tempList.length > 0) {
        const testRegex = new RegExp(/^(0|62)(81|82|83|85)+[0-9]+$/gm);
        for (const a in tempList) {
          let process_temp: any;
          if (testRegex.test(tempList[a].msisdn)) {
            if (tempList[a].type === 'whitelist') {
              process_temp = new this.listWModel({
                program: job.data.program,
                msisdn: tempList[a].msisdn,
                counter: tempList[a].counter,
              });
            } else {
              process_temp = new this.listBModel({
                program: job.data.program,
                msisdn: tempList[a].msisdn,
                counter: tempList[a].counter,
              });
            }
          }

          await process_temp.save();
          if (process_temp) {
            await this.listModel.findOneAndDelete({ _id: tempList[a]._id });
          }
        }
      } else {
        await transactionSession.commitTransaction();
        await transactionSession.endSession();
      }
    } catch (e) {
      await transactionSession.abortTransaction();
    } finally {
      await transactionSession.endSession();
    }
  }

  @Process('program-list-segmentation')
  handleProgramSegmentation(job: Job): Promise<void> {
    if (job.data.list.filename) {
      return new Promise((resolve, reject) => {
        let countTotalLine = 0;
        fs.createReadStream(job.data.list.path)
          .on('data', (chunk) => {
            for (let i = 0; i < chunk.length; i++)
              if (chunk[i] == 10) countTotalLine++;
          })
          .on('end', async () => {
            const fileStream2 = fs.createReadStream(job.data.list.path);
            const rl = readline.createInterface({
              input: fileStream2,
              // crlfDelay: Infinity,
            });
            const transactionSession = await this.connection.startSession();
            try {
              await transactionSession.startTransaction();

              let bulkData = [];
              let currentRest = countTotalLine;
              job.log(`Starting job ${countTotalLine} data(s)`);
              for await (const line of rl) {
                job.log(`Reading data...`);
                const dataSplit = line.split('|');
                const msisdn =
                  job.data.type === 'whitelist' ? dataSplit[0] : line;

                // regex checking..
                const isMatch = isMatchProgramSSO(msisdn, job.data.identifier);
                console.log(`Identifier : ${job.data.identifier}`);

                // Cek jika dokumen sudah ada untuk memutuskan apakah menggunakan $setOnInsert atau $inc
                const filter = {
                  msisdn: msisdn,
                  identifier: job.data.identifier,
                  type: job.data.type,
                  program: new mongoose.Types.ObjectId(job.data.program),
                };

                const update = {
                  $setOnInsert: {
                    account: new mongoose.Types.ObjectId(job.data.account._id),
                    location: new mongoose.Types.ObjectId(
                      job.data.account.account_location.location,
                    ),
                    msisdn: msisdn,
                    match: isMatch,
                    type: job.data.type,
                    identifier: job.data.identifier,
                    program: new mongoose.Types.ObjectId(job.data.program),
                  },
                  $inc: {
                    counter:
                      job.data.type === 'whitelist'
                        ? parseInt(dataSplit[1])
                        : 1,
                  },
                };

                bulkData.push({
                  updateOne: {
                    filter,
                    update,
                    upsert: true,
                  },
                });

                if (
                  bulkData.length === job.data.bulkCount ||
                  (currentRest < job.data.bulkCount &&
                    bulkData.length < job.data.bulkCount)
                ) {
                  job.log(`Write bulk {${currentRest}}...`);
                  await this.listModel
                    .bulkWrite(bulkData, { ordered: true })
                    .then(() => {
                      bulkData = [];
                      const currentJob =
                        (((countTotalLine - currentRest) / countTotalLine) *
                          100) |
                        0;
                      job.progress(currentJob);

                      if (currentRest <= job.data.bulkCount) {
                        currentRest = 0;
                      } else {
                        currentRest -= job.data.bulkCount;
                      }
                    })
                    .catch((err) => {
                      console.error('Bulk write error:', err);
                    });
                } else {
                  job.log(`Collecting data {${currentRest}}...`);
                }
              }

              rl.on('close', async () => {
                job.log(`Closing ???`);
              });

              await transactionSession.commitTransaction();
            } catch (e: any) {
              throwError(
                () => new HttpException(e.response.data, e.response.status),
              );
              await transactionSession.abortTransaction();
              reject();
            } finally {
              await transactionSession.endSession();
              resolve();
            }
          });
      });
    }
  }

  @Process('program-list')
  async handleUploadTemp(job: Job): Promise<void> {
    if (job.data.list.filename) {
      return new Promise((resolve, reject) => {
        let countTotalLine = 0;
        let fileStream = fs
          .createReadStream(job.data.list.path)
          .on('data', (chunk) => {
            for (let i = 0; i < chunk.length; i++)
              if (chunk[i] == 10) countTotalLine++;
          })
          .on('end', async () => {
            fileStream = fs.createReadStream(job.data.list.path);
            const rl = readline.createInterface({
              input: fileStream,
              // crlfDelay: Infinity,
            });
            const transactionSession = await this.connection.startSession();
            try {
              await transactionSession.startTransaction();
              // await this.listBModel.deleteMany({
              //   account: job.data.account._id,
              //   location: job.data.account.account_location.location,
              //   type: job.data.type,
              // });

              let bulkData = [];
              let currentRest = countTotalLine;
              job.log(`Starting job ${countTotalLine} data(s)`);
              for await (const line of rl) {
                job.log(`Reading data...`);
                const dataSplit = line.split('|');
                const testRegex = new RegExp(
                  /^(08|62|81|82|83|85|628)+[0-9]+$/gm,
                );
                bulkData.push({
                  account: job.data.account._id,
                  location: job.data.account.account_location.location,
                  msisdn: dataSplit[0],
                  match: testRegex.test(dataSplit[0]),
                  counter: parseInt(dataSplit[1]),
                  type: job.data.type,
                });

                if (
                  bulkData.length === job.data.bulkCount ||
                  (currentRest < job.data.bulkCount &&
                    bulkData.length < job.data.bulkCount)
                ) {
                  job.log(`Write bulk {${currentRest}}...`);
                  await this.listModel.bulkWrite(
                    bulkData.map(
                      (doc) =>
                        ({
                          updateOne: {
                            filter: {
                              $and: [
                                {
                                  msisdn: doc.msisdn,
                                  account: doc.account,
                                  location: doc.location,
                                },
                              ],
                            },
                            update: doc,
                            upsert: true,
                          },
                        } as any),
                    ),
                  );
                  bulkData = [];

                  const currentJob =
                    (((countTotalLine - currentRest) / countTotalLine) * 100) |
                    0;

                  await job.progress(currentJob);

                  if (currentRest <= job.data.bulkCount) {
                    currentRest = 0;
                  } else {
                    currentRest -= job.data.bulkCount;
                  }
                } else {
                  job.log(`Collecting data {${currentRest}}...`);
                }
              }

              rl.on('close', async () => {
                job.log(`Closing ???`);
                await transactionSession.commitTransaction();
              });
            } catch (e: any) {
              throwError(
                () => new HttpException(e.response.data, e.response.status),
              );
              await transactionSession.abortTransaction();
              reject();
            } finally {
              await transactionSession.endSession();
              resolve();
            }
          });
      });
    }
  }
}
