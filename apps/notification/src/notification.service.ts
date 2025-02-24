import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { NotificationContentService } from '@/application/services/notification-content.service';
import { PIC, PICDocument } from '@/pic/models/pic.model';
import {
  Redeem,
  RedeemDocument,
} from '@/transaction/models/redeem/redeem.model';

import {
  NOTIFICATION_TEMPLATE_REDEEM_SUCCESS_CAMPAIGN,
  NOTIFICATION_TEMPLATE_REDEEM_SUCCESS_INTERNAL,
} from './consts/notification.const';
import { NotificationLogService } from './services/notification.log.service';
import { SendNotificationService } from './services/send-notification.service';

@Injectable()
export class NotificationKafkaService {
  private notification: SendNotificationService;

  constructor(
    private notifContentService: NotificationContentService,
    private notificationLogService: NotificationLogService,

    notification: SendNotificationService,

    @InjectModel(Redeem.name)
    private redeemModel: Model<RedeemDocument>,

    @InjectModel(PIC.name)
    private picModel: Model<PICDocument>,

    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,
  ) {
    this.notification = notification;
  }

  getHello(): string {
    return 'Hello World!';
  }

  async notification_process(payload) {
    const start = new Date();

    try {
      if (payload && payload.incoming) {
        let status;

        if (
          ['_fail', '_success'].every((item) => payload.origin.includes(item))
        ) {
          status = 'Partial';
        } else if (['_fail'].every((item) => payload.origin.includes(item))) {
          status = 'Fail';
        } else if (
          ['_success'].every((item) => payload.origin.includes(item))
        ) {
          status = 'Success';
        }

        // Update redeem status
        if (payload.origin.split('.')[0] === 'redeem') {
          if (payload.redeem) {
            status = status ? status : payload.redeem.status;
            await this.redeemModel.updateOne(
              { _id: new Types.ObjectId(payload.redeem._id) },
              { status },
            );
          }
        }

        console.log('Process??');

        if (payload.incoming.send_notification) {
          await this.notificationLogService.loggerNotificationVerbose(
            payload,
            {},
            `Processing transaction notification ...`,
            start,
          );

          // TODO : CHECK payload.customer.msisdn kemungkinan null
          const targetMSISDN =
            payload?.customer?.msisdn ?? payload?.incoming?.msisdn;
          await this.notification.send_notification(
            payload.keyword.name,
            targetMSISDN,
            { tracing_id: payload.tracing_id },
            payload,
          );

          if (status == 'Success') {
            await this.send_notification_internal(payload);
          }
        }
      }

      return true;
    } catch (error) {
      console.log(error);
      console.info('#1 Invalid payload notification!');
      console.error(error.message);

      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `Invalid notification payload, Error: ${error?.message}`,
        error?.trace,
      );

      await this.save_log_invalid_payload(payload, error);
    }
  }

  // Process replace content notif campaign to send notification campaign if payload.origin success
  private async send_notification_internal(payload) {
    const start = new Date();

    try {
      // if (payload.campaign) {
      // replace content notification by campaign and call service send_notification
      await this.send_replaced_notification_content(
        payload,
        NOTIFICATION_TEMPLATE_REDEEM_SUCCESS_CAMPAIGN,
        payload.customer.msisdn,
      );
      // }

      // replace content notification by internal notif and call service send_notification
      if (payload.program) {
        for await (const pic_id of payload.program.alarm_pic) {
          const pic = await this.picModel.findById(pic_id).lean();

          if (pic) {
            await this.send_replaced_notification_content(
              payload,
              NOTIFICATION_TEMPLATE_REDEEM_SUCCESS_INTERNAL,
              pic.msisdn,
              { email: pic.email },
            );
          }
        }
      }
    } catch (error) {
      console.info('Error Send Notif to internal / PIC');
      console.error(error.message);

      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `Unable to send notifiation to Internal, Error: ${error?.message}`,
        error?.trace,
      );
    }
  }

  private async send_replaced_notification_content(
    payload,
    new_template: string,
    msisdn: string,
    param?: any,
  ) {
    payload.notification =
      await this.notifContentService.getNotificationTemplate(
        new_template,
        payload,
      );
    if (payload.notification.length > 0) {
      await this.notification.send_notification(
        payload.keyword.name,
        msisdn,
        param,
        payload,
      );
    }
  }

  async send_transaction_master(payload) {
    const start = new Date();

    try {
      // get last origin and split by "_"
      console.log('Sending to trx master');
      const last_origin = payload.origin.split('.').pop().split('_');
      const cek_status = last_origin[last_origin.length - 1];
      payload.origin = `${payload.origin}.notification_${cek_status}`;

      await this.notificationLogService.loggerNotificationVerbose(
        payload,
        {},
        `Emit to transaction_master ...`,
        start,
      );

      // send to consumer transaction master
      this.transactionMasterClient.emit(
        process.env.KAFKA_TRANSACTION_MASTER_TOPIC,
        payload,
      );
    } catch (error) {
      console.info('Error Emit to transaction_master');
      console.error(error.message);

      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `Unable to emit to transaction_master, Error: ${error?.message}`,
        error?.trace,
      );
    }
  }

  private async save_log_invalid_payload(payload, error) {
    const start = new Date();

    try {
      if (payload.tracing_id !== undefined) {
        await this.notification.record_notification_log({
          tracing_id: payload?.tracing_id
            ? payload.tracing_id
            : payload?.transaction_id,
          keyword: payload ? payload.keyword : '',
          msisdn: payload ? payload.msisdn : '',
          via: payload ? payload.via : '',
          request: JSON.stringify(payload),
          response: error,
          is_send: false,
        });
      } else {
        console.info(
          '#2 Log Notification not save because tracing_if not found!',
        );
      }
    } catch (err) {
      console.info('#2 Failed Save Log from invalid payload notification!');
      console.error(err.message);

      await this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `Unable to save invalid notification payload, Error: ${error?.message}`,
        error?.trace,
      );
    }
  }
}
