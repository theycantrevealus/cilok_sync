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
import mongoose, {Connection, Model, Types} from 'mongoose';
import * as readline from 'readline';
import { throwError } from 'rxjs';
import {LuckyDrawUploadDocument, LuckyDrawUploadModel} from "@/lucky-draw/models/lucky.draw.upload.model";
import {
  LuckyDrawUploadDetailDocument,
  LuckyDrawUploadDetailModel
} from "@/lucky-draw/models/lucky.draw.upload.detail.model";
import {number} from "yargs";

@Processor('lucky-draw')
export class LuckyDrawProcessor {
  private connection: Connection;

  constructor(
    @InjectConnection() connection: Connection,

    @InjectModel(LuckyDrawUploadModel.name)
    private luckyDrawUploadModel: Model<LuckyDrawUploadDocument>,

    @InjectModel(LuckyDrawUploadDetailModel.name)
    private luckyDrawUploadDetailModel: Model<LuckyDrawUploadDetailDocument>,

  ) {
    this.connection = connection;
  }

  @OnQueueActive()
  onActive(job: Job) {
    job.log(
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
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    job.progress(100);
    job.log(`Job finished with result: ${result}`);
  }

  @Process('lucky-draw-upload')
  LuckyDrawUploadProcess(job: Job): Promise<void> {
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
                const keyword = dataSplit[1].split(',')
                if(dataSplit[0].toUpperCase() !== "MSISDN"){
                  bulkData.push({
                    trace_id: new mongoose.Types.ObjectId(job.data.trace_id),
                    msisdn: dataSplit[0],
                    keyword: keyword[0],
                    prize: dataSplit[2],
                    path: job.data.list.path,
                    account: new mongoose.Types.ObjectId(job.data.account)
                  });
                }
                if (
                  bulkData.length === job.data.bulkCount ||
                  (currentRest < job.data.bulkCount &&
                    bulkData.length < job.data.bulkCount)
                ) {
                  job.log(`Write bulk {${currentRest}}...`);
                  await this.luckyDrawUploadDetailModel
                    .bulkWrite(
                      bulkData.map(
                        (doc) =>
                          ({
                            updateOne: {
                              filter: {
                                $and: [ {msisdn: doc.msisdn, keyword: keyword[0], trace_id: doc.trace_id} ],
                              },
                              update: doc,
                              upsert: true,
                            },
                          } as any),
                      ),
                    )
                    .then((res) => {
                      console.log('res' + res)
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
                    });
                } else {
                  job.log(`Collecting data {${currentRest}}...`);
                }
              }

              rl.on('close', async () => {
                job.log(`Closing ???`);
                await this.luckyDrawUploadModel.updateOne({_id: job?.data?.trace_id}, {status: "Finish"})
                await transactionSession.commitTransaction();
              });
            } catch (e: any) {
              await this.luckyDrawUploadModel.updateOne({_id: job?.data?.trace_id}, {status: "Fail"})
              throwError(
                () => new HttpException(e.response.data, e.response.status),
              );
              await transactionSession.abortTransaction();
              reject();
            } finally {
              await this.luckyDrawUploadModel.updateOne({_id: job?.data?.trace_id}, {status: "Finish"})
              await transactionSession.endSession();
              resolve();
            }
          });
      });
    }
  }

}
