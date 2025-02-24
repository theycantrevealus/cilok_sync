import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';

import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { LovService } from '@/lov/services/lov.service';
import { DonationService } from '@/transaction/services/donation/donation.service';

import { WINSTON_MODULE_PROVIDER } from '../../utils/logger/constants';
import { ExceptionHandler, LoggingRequest } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import { IAccount } from '../../utils/logger/transport';

@Injectable()
export class KafkaDonationService {
  constructor(
    private applicationService: ApplicationService,
    private donationService: DonationService,
    private lovService: LovService,
    private notifService: NotificationContentService,

    @Inject('DONATION_SERVICE_PRODUCER')
    private readonly donationClient: ClientKafka,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject('REFUND_SERVICE_PRODUCER')
    private readonly refundClient: ClientKafka,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  prev_origin = 'redeem.eligibility_success.deduct_success';

  async process_donation(payload): Promise<void> {
    const donation = payload?.payload?.donation;
    const start = new Date();

    if (donation) {
      try {
        // Set Logging Success
        this.logger_donation({
          payload: payload,
          step: 'Step :: Process Donation',
          message: 'Success',
          stack: donation,
          date_now: start,
        });

        // save donation to db
        await this.donationService.donate(donation);
        await this.notification_donation(null, payload, false);
      } catch (error) {
        // Set Logging Failed
        this.logger_donation({
          payload: payload,
          step: 'Step :: Process Donation',
          message: 'Failed',
          stack: error?.stack,
          date_now: start,
          is_success: false,
        });

        await this.retry_donation(error.message, payload);
      }
    } else {
      // Set Logging Failed
      this.logger_donation({
        payload: payload,
        step: 'Step :: Process Donation',
        message: 'Donation payload not found, next step refund',
        date_now: start,
        is_success: false,
      });

      this.refundClient.emit('refund', payload);
    }
  }

  async retry_donation(message: any, payload: any): Promise<void> {
    const start = new Date();
    try {
      // get config default from config
      const point_stopper =
        (await this.applicationService.getConfig(
          `DEFAULT_CONS_RETRY_DONATION`,
        )) ?? 5;

      if (payload.origin !== `${this.prev_origin}.donation_fail`) {
        payload.origin = `${this.prev_origin}.donation_fail`;
      }

      // if counter donation is more than stopper counter from config
      if (payload.retry.donation.counter >= point_stopper) {
        // Set Logging Failed
        this.logger_donation({
          payload: payload,
          step: 'Step :: Retry Process Donation',
          message: 'Stopped retrying, the counter is exceeds the limit',
          date_now: start,
          is_success: false,
        });

        // send notification cause counter is more than limit
        await this.notification_donation(
          'Stopped retrying, the counter is exceeds the limit',
          payload,
        );
      } else {
        // send to consumer donation if condition config counter donation is not fulfilled
        payload.retry.donation.counter += 1; // default counter = 0, counter = counter + 1;
        payload.retry.donation.errors = [
          ...payload.retry.donation.errors,
          message,
        ]; // Joining error messege

        // Set Logging Failed
        this.logger_donation({
          payload: payload,
          step: 'Step :: Retry Process Donation',
          message: 'In Progress',
          date_now: start,
          stack: payload?.retry?.donation,
          is_success: false,
        });

        this.donationClient.emit('donation', payload);
      }
    } catch (error) {
      await this.loggerDonation(payload, error, start);
    }
  }

  async notification_donation(
    message: any,
    payload: any,
    fail = true,
  ): Promise<void> {
    payload.notification = [...(payload?.payload?.notification ?? [])];
    this.prev_origin = payload.origin;

    if (fail) {
      const origin_refund = [
        `${this.prev_origin}`,
        `${this.prev_origin}.donation_fail'`,
      ];

      if (origin_refund.includes(payload.origin)) {
        this.refundClient.emit('refund', payload);
      }

      payload.origin = `${this.prev_origin}.donation_fail`;
      payload.error_message = message;
      payload.notification = await this.notifService.getNotificationTemplate(
        NotificationTemplateConfig.REDEEM_FAILED_CUSTOMER,
        payload,
      );
    } else {
      payload.origin = `${this.prev_origin}.donation_success`;
      payload.notification = await this.notifService.getNotificationTemplate(
        NotificationTemplateConfig.REDEEM_SUCCESS_CUSTOMER,
        payload,
      );
    }

    // const notification = payload.keyword.notification.filter(async (item) => {
    //   const notif_type_detail: any = await this.lovService.getLovDetailByValue(
    //     'NOTIF_TYPE',
    //     notif_type,
    //   );

    //   return item.notif_type == notif_type_detail._id;
    // })[0];

    // payload.notification.push(
    //   notification?.via.map(async (id) => {
    //     const via_detail = await this.lovService.getLovDetail(id);
    //     return {
    //       via: via_detail.set_value,
    //       template_content: notification.notif_content,
    //     };
    //   }),
    // );

    this.notificationClient.emit(process.env.KAFKA_NOTIFICATION_TOPIC, payload);
  }

  async loggerDonation(payload, error, start) {
    const end = new Date();
    this.exceptionHandler.handle({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      level: 'error',
      notif_operation: true,
      notif_customer: false,
      transaction_id: payload.tracing_id,
      config: this.configService,
      taken_time: start.getTime() - end.getTime(),
      payload: {
        transaction_id: payload.tracing_id,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        taken_time: start.getTime() - end.getTime(),
        method: 'kafka',
        url: 'donation',
        service: 'DONATION',
        step: `DONATION ${error.message}`,
        param: payload,
        result: {
          msisdn: payload.incoming.msisdn,
          message: error.message,
          trace: payload.tracing_id,
          user_id: new IAccount(payload.account),
          data: error,
        },
      } satisfies LoggingData,
    });
  }

  async logger_donation(request: LoggingRequest) {
    // Set Request Validator Logging
    const result_default = {
      message: '-',
      stack: {},
    };

    result_default['message'] = request?.message;
    result_default['stack'] = request?.stack;

    request.payload = request?.payload ?? {};
    request.date_now = request?.date_now ?? Date.now();
    request.is_success = request?.is_success ?? true;
    request.step = request?.step ?? '';
    request.message = request?.message ?? '-';
    request.statusCode =
      request?.statusCode ?? request?.is_success
        ? HttpStatus.OK
        : HttpStatus.BAD_REQUEST;
    request.result = request?.result ? request?.result : result_default;
    request.status_trx = request.status_trx ?? '-';
    // Set Request Validator Logging

    const transaction_id = request.payload?.tracing_master_id;
    const account = request.payload?.account;
    const statusCode = request.statusCode;
    const url = request.payload?.endpoint;
    const msisdn = request.payload?.incoming?.msisdn;
    const param = {
      status_trx: request.status_trx,
      origin: request.payload.origin,
      incoming: request.payload?.incoming,
      token: request.payload?.token,
      endpoint: request.payload?.endpoint,
      keyword: {
        eligibility: {
          name: request.payload?.keyword?.eligibility?.name,
          poin_value: request.payload?.keyword?.eligibility?.poin_value,
          poin_redeemed: request.payload?.keyword?.eligibility?.poin_redeemed,
        },
      },
      program: {
        name: request.payload?.program?.name,
      },
      account: account,
      notification: request.payload?.notification,
    };

    const logData: any = {
      method: 'kafka',
      statusCode: statusCode,
      transaction_id: transaction_id,
      notif_customer: false,
      notif_operation: false,
      taken_time: Date.now() - request.date_now,
      step: request.step,
      param: param,
      service: 'DONATION',
      result: {
        msisdn: msisdn,
        url: url,
        result: request.result,
      },
    };

    if (request.is_success) {
      this.logger.verbose(logData);
    } else {
      this.logger.error(logData);
    }
  }
}
