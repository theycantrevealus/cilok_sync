import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'bson';
import { Model } from 'mongoose';

import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { formatMsisdnToID } from '@/application/utils/Msisdn/formatter';
import { LovService } from '@/lov/services/lov.service';
import { Vote, VoteDocument } from '@/vote/models/vote.model';
import {
  VoteOption,
  VoteOptionDocument,
} from '@/vote/models/vote_option.model';
import {
  TransactionVote,
  TransactionVoteDocument,
} from '@/vote/models/vote_transaction.model';
import { VoteService } from '@/vote/services/vote.service';

import { MerchantService } from './services/merchant.service';
import { VoteLogService } from './vote.log.service';

@Injectable()
export class KafkaVoteService {
  constructor(
    private applicationService: ApplicationService,
    private lovService: LovService,
    private notifService: NotificationContentService,
    private voteService: VoteService,
    private voteLogService: VoteLogService,

    @Inject('VOTE_SERVICE_PRODUCER')
    private readonly clientVote: ClientKafka,

    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,

    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly clientRefund: ClientKafka,

    @InjectModel(Vote.name)
    private voteModel: Model<VoteDocument>,

    @InjectModel(VoteOption.name)
    private voteOptionModel: Model<VoteOptionDocument>,

    @InjectModel(TransactionVote.name)
    private voteTransactionModel: Model<TransactionVoteDocument>,

    @Inject(MerchantService)
    private readonly merchantService: MerchantService,
  ) {}
  private async checkIsValidObjectId(str) {
    try {
      const check = new ObjectId(str);
      if (check?.toString() == str) {
        return true;
      }

      return false;
    } catch (err) {
      return false;
    }
  }

  async process_vote(payload): Promise<void> {
    const start = new Date();

    const vote = payload?.payload?.voting;
    await this.voteLogService.verbose(
      payload,
      {},
      `[${payload?.master_id}] Processing voting payload: ${JSON.stringify(
        vote,
      )}`,
      start,
    );

    // validasi payload mentah votingnya
    let isValid = false;
    try {
      const voteOptionValid = await this.checkIsValidObjectId(vote?.option);
      if (voteOptionValid) {
        isValid = true;
      }

      // validasi payload votingnya apakah keyword dan opsi sudah link
      const voteData = await this.voteModel.findOne({
        program: new ObjectId(payload.program._id),
        keyword: new ObjectId(payload.keyword._id),
      });

      console.log('Vote - Vote data: ', JSON.stringify(voteData));

      if (voteData && isValid) {
        const option = await this.voteOptionModel.findOne({
          _id: new ObjectId(vote.option),
          vote: voteData._id,
        });

        console.log('Vote - Option: ', JSON.stringify(option));

        if (!option) {
          isValid = false;
        }
      } else {
        isValid = false;
      }
    } catch (err) {
      console.error('Vote - Payload error: ', err?.message);
      isValid = false;
    }

    if (isValid) {
      try {
        // const stockAvailable = await this.voteService.checkStock(payload);
        // if (stockAvailable) {
        await this.processVote(payload);
        await this.sendNotification(null, payload);
        // } else {
        //   // failed? error atau stocknya habis?
        //   await this.sendNotification(
        //     `[STOCK DATA NOT FOUND OR OUT OF BALANCE] ${JSON.stringify(vote)}`,
        //     payload,
        //     true,
        //     true,
        //   );
        // }
      } catch (error) {
        await this.voteLogService.error(
          payload,
          start,
          `An error occured! ${error?.message}`,
          error?.trace,
        );

        await this.retry_vote(error?.message, payload);
      }
    } else {
      await this.voteLogService.error(
        payload,
        start,
        `[${payload?.master_id}] Vote payload not valid!`,
      );

      // this.clientRefund.emit(process.env.KAFKA_REFUND_TOPIC, payload);

      await this.sendNotification(`Vote payload not valid!`, payload, true);
    }
  }

  async processVote(payload): Promise<void> {
    const start = new Date();

    return new Promise(async (resolve, reject) => {
      try {
        const voting = payload?.payload?.voting;
        const program = payload.program._id;
        const keyword = payload.keyword._id;

        // get vote data
        const voteData = await this.voteModel.findOne({
          program: new ObjectId(program),
          keyword: new ObjectId(keyword),
        });

        await this.voteLogService.verbose(
          payload,
          {},
          `[${payload?.master_id}] -> Finding vote data. Found? ${
            voteData ? 'TRUE' : 'FALSE'
          }`,
          start,
        );

        if (!voteData) {
          await this.voteLogService.verbose(
            payload,
            {},
            `[${payload?.master_id}] -> Vote data does not exist!`,
            start,
          );

          reject("Vote doesn't exist");
        }

        // increment voting data
        await this.voteModel
          .findOneAndUpdate(
            { _id: voteData._id },
            {
              $inc: {
                current_votes: 1,
                current_points: Math.abs(payload.payload.deduct.amount),
                __v: 1,
              },
            },
            {
              new: true,
              upsert: true,
            },
          )
          .then(async (result) => {
            await this.voteLogService.verbose(
              payload,
              {},
              `[${payload?.master_id}] -> Increment vote ${voteData._id} data by +1. Current votes are: ${result?.current_votes}`,
              start,
            );
          })
          .catch(async (result) => {
            await this.voteLogService.error(
              payload,
              start,
              `[${payload?.master_id}] -> An error occured while updating current votes data for vote ${voteData._id}!`,
            );

            reject('Unable to incement vote data!');
          });

        // tambah transaction_vote
        let parent_transaction_id = payload.tracing_master_id;
        if (payload?.incoming?.additional_param) {
          const parse_additional_param = payload.incoming.additional_param;

          if (parse_additional_param?.parent_transaction_id) {
            parent_transaction_id =
              parse_additional_param.parent_transaction_id;
          }
        }

        const vote_trace_id = payload.tracing_master_id.replace('TRX', 'VOT');
        const voteTransaction = new this.voteTransactionModel({
          master_id: payload.tracing_master_id,
          parent_master_id: parent_transaction_id,
          trace_id: vote_trace_id, // replace
          program: new ObjectId(program),
          keyword: new ObjectId(keyword),
          option: voting.option,
          msisdn: formatMsisdnToID(payload.customer.msisdn),
          amount: Math.abs(payload.payload.deduct.amount),
          time: payload.submit_time,
        });

        await voteTransaction.save().catch(async (e: Error) => {
          await this.voteLogService.error(
            payload,
            start,
            `[${payload?.master_id}] -> An error occured while saving transaction_vote! ${e?.message}`,
            e?.stack,
          );

          console.error(e.message);
        });

        resolve();
      } catch (error) {
        await this.voteLogService.error(
          payload,
          start,
          `[${payload?.master_id}] -> An error occured while processing vote!`,
          error?.trace,
        );

        console.error(error);
        reject(error);
      }
    });
  }

  async retry_vote(error, payload) {
    const start = new Date();

    await this.voteLogService.verbose(
      payload,
      {},
      `[${payload?.master_id}] Retrying vote ..`,
      start,
    );
    await this.sendNotification(`Voting error! Error: ${error}`, payload, true);

    return null;
  }

  async sendNotification(
    message,
    payload,
    fail = false,
    nostock = false,
  ): Promise<boolean> {
    const start = new Date();

    payload.notification = [...(payload?.payload?.notification ?? [])];

    const origin = payload.origin + '.' + 'vote_' + (fail ? 'fail' : 'success');
    payload.origin = origin;

    await this.voteLogService.verbose(
      payload,
      {},
      `[${payload?.master_id}] Sending vote notification with origin ${origin}`,
      start,
    );

    if (fail) {
      payload.error_message = message;

      // kirim notif
      if (nostock) {
        payload.notification = await this.notifService.getNotificationTemplate(
          NotificationTemplateConfig.REDEEM_FAILED_NOSTOCK,
          payload,
        );
      } else {
        payload.notification = await this.notifService.getNotificationTemplate(
          NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER,
          payload,
        );
      }

      // refund pointnya
      await this.refundProcess(payload, payload.error_message);
      return false;
    } else {
      payload.notification = await this.notifService.getNotificationTemplate(
        NotificationTemplateConfig.REDEEM_SUCCESS_CUSTOMER,
        payload,
      );
    }

    console.log('VOTE ORIGIN: ', origin, payload?.payload?.voting);
    console.log('VOTE NOTIFICATION: ', payload.notification);

    await this.voteLogService.verbose(
      payload,
      {},
      `[${payload?.master_id}] Sending vote notification with payload ${payload.notification}`,
      start,
    );

    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
    return true;
  }

  async refundProcess(payload: any, msg: string) {
    const logMessage = {
      step: 'INTEGRATION DEDUCT',
      message: 'Bonus not found',
      data: null,
    };

    // if bonus not found on keyword
    const deduct = payload.payload.deduct;

    const refund_payload = payload;
    const refund: any = await this.merchantService
      .getMerchantSelf(refund_payload.token)
      .then((e) => {
        const pin = e.payload.merchant_config.authorize_code.refund;
        return {
          locale: deduct.locale,
          transaction_no: deduct?.transaction_no,
          type: deduct.type,
          reason: msg,
          channel: deduct.channel,
          reward_item_id: deduct?.reward_item_id,
          reward_instance_id: deduct?.reward_instance_id,
          remark: deduct.remark,
          authorize_pin: pin,
          member_id: deduct?.member_id,
          realm_id: deduct.realm_id,
          branch_id: deduct.branch_id,
          merchant_id: deduct.merchant_id,
          __v: 0,
        };
      })
      .catch((e) => {
        logMessage.message = 'Failed getMerchantSelf';
        logMessage.data = e?.stack;
      });

    const deductSuccess = payload?.payload?.tsel_id?.deduct_success ?? null;
    if (deductSuccess) {
      await Promise.all(
        deductSuccess.map((val) => {
          refund.transaction_no = val.transaction_no;
          refund.member_id = val.member_id;
        }),
      );
    }

    refund_payload.payload.refund = refund;

    console.log('X_REFUND_PAYLOAD_RIFQI:', JSON.stringify(refund_payload));
    console.log('X_REFUND_PAYLOAD_EDIT_RIFQI:', JSON.stringify(refund));

    refund_payload.incoming.ref_transaction_id = refund.transaction_no;
    // delete refund_payload.incoming.total_redeem;
    // delete refund_payload.incoming.redeem_type;
    // delete refund_payload.incoming.adn;
    // delete refund_payload.incoming.send_notification;

    logMessage.data = refund_payload.incoming;

    // send to consumer refund
    this.clientRefund.emit(process.env.KAFKA_REFUND_TOPIC, refund_payload);
  }
}
