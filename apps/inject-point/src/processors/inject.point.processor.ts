import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueError,
  OnQueuePaused,
  Process,
  Processor,
} from '@nestjs/bull';
import {HttpException} from '@nestjs/common';
import {InjectConnection, InjectModel} from '@nestjs/mongoose';
import {Job} from 'bull';
import * as fs from 'fs';
import mongoose, {Connection, Model} from 'mongoose';
import * as readline from 'readline';
import {throwError} from 'rxjs';


import {
  InjectPointModel,
  InjectPointModelDocument,
} from '@/inject/models/inject.point.model';

@Processor('inject')
export class InjectPointProcessor {
  private connection: Connection;

  constructor(
    @InjectConnection() connection: Connection,
    @InjectModel(InjectPointModel.name)
    private listModelPoint: Model<InjectPointModelDocument>,
  ) {
    this.connection = connection
  }

  @OnQueueActive()
  onActive(job: Job) {
    job.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }

  @OnQueueError()
  onError(error: Error) {
    // throw new Error(error.stack);
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

  @Process('inject-point')
  async handleInjectPointModel(job: Job): Promise<void> {
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
                const testRegex = new RegExp(
                  /^(08|62|81|82|83|85|628)+[0-9]+$/gm,
                );
                bulkData.push({
                  locale: 'en-US',
                  msisdn: dataSplit[0],
                  program_id: job.data.parameter.program_id,
                  keyword: job.data.parameter.keyword,
                  send_notification: job.data.parameter.send_notification,
                });

                if (
                  bulkData.length === job.data.bulkCount ||
                  (currentRest < job.data.bulkCount &&
                    bulkData.length < job.data.bulkCount)
                ) {
                  job.log(`Write bulk {${currentRest}}...`);
                  await this.listModelPoint
                    .bulkWrite(
                      bulkData.map(
                        (doc) =>
                          ({
                            updateOne: {
                              filter: {
                                $and: [
                                  {
                                    locale: doc.locale,
                                    msisdn: doc.msisdn,
                                    program_id: doc.program_id,
                                    keyword: doc.keyword,
                                    send_notification: doc.send_notification,
                                  },
                                ],
                              },
                              update: doc,
                              upsert: true,
                            },
                          } as any),
                      ),
                    )
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
                    });
                } else {
                  job.log(`Collecting data {${currentRest}}...`);
                }
              }

              rl.on('close', async () => {

                let oldPath = job.data.list.path
                let newPath = `${job.data.list.path}.gz`
                fs.rename(oldPath, newPath, function (err) {
                  if (err) throw err
                  console.log('Successfully renamed file')
                })
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
