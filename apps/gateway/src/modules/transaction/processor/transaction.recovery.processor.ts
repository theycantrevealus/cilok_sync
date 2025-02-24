import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueProgress,
  Process,
  Processor,
} from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  TransactionMaster,
  TransactionMasterDocument,
} from '@transaction_master/models/transaction_master.model';
import { Job } from 'bull';
import { Connection, Model } from 'mongoose';

@Processor('trx-recovery')
export class TransactionRecoveryProcessor {
  private connection: Connection;
  private readonly transactionMasterModel: Model<TransactionMasterDocument>;

  constructor(
    @InjectConnection()
    connection: Connection,

    @InjectModel(TransactionMaster.name)
    transactionMasterModel: Model<TransactionMasterDocument>,

    @Inject('REPORTING_STATISTIC_PRODUCER')
    private readonly reportStatisticClient: ClientKafka,
  ) {
    this.connection = connection;
    this.transactionMasterModel = transactionMasterModel;
  }

  @OnQueueActive()
  onActive(job: Job) {
    console.log(
      `Processing job transaction recovery with id ${job.id} of type ${job.name}...`,
    );
  }

  @OnQueueProgress()
  onProgress(job: Job) {
    console.log(
      `Job transaction recovery with id ${job.id} of type ${job.name} is in progress now...`,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    console.log(
      `Job transaction recovery ${job.id} of type ${job.name} is completed now...`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job) {
    console.log(
      `Job transaction recovery ${job.id} of type ${job.name} failed...`,
    );
  }

  @Process('recover-trx-statistic')
  async recoverReportingStatistic(job: Job) {
    try {
      const payload = job.data;
      console.log(payload);

      // date only format: '2023-08-10'
      const startDate =
        payload.start_date ?? new Date().toISOString().split('T')[0];
      const endDate = payload.end_date ?? startDate;

      let statusFilter = {};
      if (
        payload.selected_status != undefined &&
        Array.isArray(payload.selected_status) &&
        payload.selected_status.length > 0
      ) {
        if (!payload.selected_status.includes('All')) {
          statusFilter = {
            status: {
              $in: payload.selected_status,
            },
          };
        }
      }

      const matchSet = {
        $match: {
          $and: [
            {
              transaction_date: {
                $gte: new Date(`${startDate} 00:00:00`),
                $lte: new Date(`${endDate} 23:59:59`),
              },
            },
            statusFilter,
          ],
        },
      };

      const lookup = {
        $lookup: {
          from: 'transaction_master_detail',
          let: {
            trx_id: '$transaction_id',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ['$$trx_id', '$payload.incoming.master_id'],
                    },
                  ],
                },
              },
            },
          ],
          as: 'transaction_details',
        },
      };

      // set pagination
      const limit = 1000;
      let skip = 0;

      let totalData = 0;
      let isDataExist = true;
      do {
        const transactions = await this.transactionMasterModel.aggregate(
          [
            lookup,
            matchSet,
            { $skip: skip },
            { $limit: limit },
            { $sort: { transaction_date: 1 } },
          ],
          (err, result) => {
            return result;
          },
        );

        if (transactions.length == 0) {
          isDataExist = false;
        }

        for (let i = 0; i < transactions.length; i++) {
          if (transactions[i].transaction_details.length == 1) {
            this.reportStatisticClient.emit(
              'report_statistic',
              transactions[i].transaction_details[0].payload,
            );
          }
        }

        // todo: get detail payload and make router for set which report need to re-emit
        // need to check how reporting create

        totalData += transactions.length;
        skip += limit;
      } while (isDataExist);

      console.log(totalData);
    } catch (e) {
      console.log(e);
    }
  }
}
