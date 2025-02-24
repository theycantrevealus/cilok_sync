import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { TransactionStepStatus } from '@transaction_master/helper/transaction.step.status';
import {
  TransactionStepDocument,
  TransactionStepModel,
} from '@transaction_master/models/transaction_step.model';
import { Queue } from 'bull';
import { Model } from 'mongoose';

@Injectable()
export class TransactionRecoveryService {
  constructor(
    @InjectModel(TransactionStepModel.name)
    private trxStepModel: Model<TransactionStepDocument>,

    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly clientTransactionMaster: ClientKafka,

    @InjectQueue('trx-recovery')
    private readonly trxRecoveryQueue: Queue,
  ) {}

  async sayHellow() {
    //
  }

  async runRecoverReports(
    // selectedReports: any,
    selectedStatus: any,
    startDate: string,
    endDate: string,
  ) {
    const payload = {
      // selected_reports: selectedReports,
      selected_status: selectedStatus,
      start_date: startDate,
      end_date: endDate,
    };

    return this.trxRecoveryQueue
      .add('recover-trx-statistic', payload, { removeOnComplete: true })
      .then((job) => {
        return { job: job.id };
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async setStep(payload: any, topic: string) {
    try {
      const transactionId = payload.tracing_master_id;
      const stepInitVal = {
        status: TransactionStepStatus.PENDING,
        partition: null,
        offset: null,
        message: '',
      };

      let steps = {};
      switch (topic) {
        case 'eligibility':
          steps = {
            eligibility: stepInitVal,
          };
          break;

        case 'deduct':
          steps = {
            deduct: stepInitVal,
          };
          break;

        case 'inject_point':
          steps = {
            inject_point: stepInitVal,
          };
          break;

        case 'transaction_master':
          steps = {
            transaction_master: stepInitVal,
          };
          break;

        case 'notification':
          steps = {
            notification: stepInitVal,
          };
          break;
      }

      const existStep = await this.trxStepModel
        .findOne({
          transaction_id: transactionId,
        })
        .exec();

      if (existStep) {
        const finalSteps = {
          ...existStep.step,
          ...steps,
        };

        await this.trxStepModel.updateOne(
          {
            transaction_id: transactionId,
          },
          {
            payload: payload,
            step: finalSteps,
          },
        );
      } else {
        const newStep = new this.trxStepModel({
          transaction_id: transactionId,
          payload: payload,
          step: {
            ...steps,
          },
        });

        await newStep.save();
      }

      await this.trxStepModel
        .updateOne(
          {
            transaction_id: transactionId,
          },
          steps,
        )
        .exec();
    } catch (e) {
      console.log('error: set recovery step');
      console.log(e);
    }
  }

  async setStepStatus(
    payload: any,
    topic: string,
    status: TransactionStepStatus,
    msg = '',
  ) {
    try {
      const transactionId = payload.tracing_master_id;
      const existStep = await this.trxStepModel
        .findOne({
          transaction_id: transactionId,
        })
        .exec();

      if (!existStep) {
        return;
      }

      let msgFinal = '';
      let updateParams = {};
      switch (topic) {
        case 'eligibility':
          msgFinal = `${existStep.step?.eligibility?.msg}.${msg}`;

          updateParams = {
            'step.eligibility.status': status,
            'step.eligibility.message': msgFinal,
          };
          break;

        case 'deduct':
          msgFinal = `${existStep.step?.deduct?.msg}.${msg}`;

          updateParams = {
            'step.deduct.status': status,
            'step.deduct.message': msgFinal,
          };
          break;

        case 'inject_point':
          msgFinal = `${existStep.step?.inject_point?.msg}.${msg}`;

          updateParams = {
            'step.inject_point.status': status,
            'step.inject_point.message': msgFinal,
          };
          break;

        case 'transaction_master':
          msgFinal = `${existStep.step?.transaction_master?.msg}.${msg}`;

          updateParams = {
            'step.transaction_master.status': status,
            'step.transaction_master.message': msgFinal,
          };
          break;

        case 'notification':
          msgFinal = `${existStep.step?.notification?.msg}.${msg}`;

          updateParams = {
            'step.notification.status': status,
            'step.notification.message': msgFinal,
          };
          break;
      }

      await this.trxStepModel
        .updateOne(
          {
            transaction_id: transactionId,
          },
          updateParams,
        )
        .exec();
    } catch (e) {
      console.log('error: set recovery step status');
      console.log(e);
    }
  }

  async setMessageAck(
    payload: any,
    topic: string,
    partition?: number,
    offset?: string,
    msg = '',
  ) {
    try {
      const transactionId = payload.tracing_master_id;
      let updateParams = {};

      switch (topic) {
        case 'eligibility':
          updateParams = {
            'step.eligibility.partition': partition,
            'step.eligibility.offset': offset,
            'step.eligibility.msg': msg,
          };
          break;

        case 'deduct':
          updateParams = {
            'step.deduct.partition': partition,
            'step.deduct.offset': offset,
            'step.deduct.msg': msg,
          };
          break;

        case 'inject_point':
          updateParams = {
            'step.inject_point.partition': partition,
            'step.inject_point.offset': offset,
            'step.inject_point.msg': msg,
          };
          break;

        case 'transaction_master':
          updateParams = {
            'step.transaction_master.partition': partition,
            'step.transaction_master.offset': offset,
            'step.transaction_master.msg': msg,
          };
          break;

        case 'notification':
          updateParams = {
            'step.notification.partition': partition,
            'step.notification.offset': offset,
            'step.notification.msg': msg,
          };
          break;
      }

      await this.trxStepModel
        .updateOne(
          {
            transaction_id: transactionId,
          },
          updateParams,
        )
        .exec();
    } catch (e) {
      console.log('error: set message ack');
      console.log(e);
    }
  }

  async reEmitPayload(topic: string) {
    try {
      let transactionStep = [];

      switch (topic) {
        case 'eligibility':
          transactionStep = await this.trxStepModel
            .find({
              'step.eligibility.partition': null,
              'step.eligibility.offset': null,
            })
            .exec();
          break;

        case 'deduct':
          transactionStep = await this.trxStepModel
            .find({
              'step.deduct.partition': null,
              'step.deduct.offset': null,
            })
            .exec();
          break;

        case 'inject_point':
          transactionStep = await this.trxStepModel
            .find({
              'step.inject_point.partition': null,
              'step.inject_point.offset': null,
            })
            .exec();
          break;

        case 'transaction_master':
          transactionStep = await this.trxStepModel
            .find({
              'step.transaction_master.partition': null,
              'step.transaction_master.offset': null,
            })
            .exec();
          break;

        case 'notification':
          transactionStep = await this.trxStepModel
            .find({
              'step.notification.partition': null,
              'step.notification.offset': null,
            })
            .exec();
          break;
      }

      for (let i = 0; i < transactionStep.length; i++) {
        this.clientTransactionMaster.emit(topic, transactionStep[i].payload);
      }
    } catch (e) {
      console.log(`error: re-emit fail for ${topic}`);
      console.log(e);
    }
  }
}
