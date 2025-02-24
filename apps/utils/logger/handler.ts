import { HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { Logger } from 'winston';

import { ApplicationService } from '@/application/services/application.service';
import { LovService } from '@/lov/services/lov.service';
import { ProgramServiceV2 } from '@/program/services/program.service.v2';

import { WINSTON_MODULE_PROVIDER } from './constants';
import { IAccount, LoggingData } from './transport';

export class ExceptionHandler {
  private level = ['warn', 'error'];
  constructor(
    //@Inject(ApplicationService)
    //private readonly applicationService: ApplicationService,
    //@Inject(LovService)
    //private readonly lovService: LovService,
    //@Inject(ProgramServiceV2) private readonly programService: ProgramServiceV2,
    //@Inject('NOTIFICATION_GENERAL')
    //private readonly notificationGeneralClient: ClientKafka,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {
    //
  }

  async dumpError(err) {
    if (typeof err === 'object') {
      if (err.message) {
        return err.message;
      }
      if (err.stack) {
        return err.stack;
      }
    } else {
      return err ?? err.message;
    }
  }

  async handle(parameter: ExceptionData): Promise<void> {
    // Logging to file
    this.logger[parameter.level](new LoggingData(parameter.payload));

    // Notifikasi

    if (parameter.notif_customer) {
      //
    }

    if (parameter.notif_operation || parameter.level === 'error') {
      //
    }

    // if (this.level.indexOf(parameter.level) >= 0) {
    //   // Send to notification

    //   // Notification required field
    //   const errorMessage = await this.dumpError(parameter?.payload?.result);

    //   const defaultGeneralNotification =
    //     await this.applicationService.getConfig(
    //       'DEFAULT_GENERAL_PROGRAM_NOTIFICATION',
    //     );

    //   const programId =
    //     parameter?.payload?.param?.keyword?.eligibility?.program_id;

    //   const programDetail = await this.programService.getProgramBy({
    //     _id: new mongoose.Types.ObjectId(programId),
    //   });

    //   const notification = [];
    //   if (programDetail && programDetail.program_notification.length > 0) {
    //     programDetail.program_notification.map((e) => {
    //       if (
    //         e.notif_type.toString() === defaultGeneralNotification.toString()
    //       ) {
    //         const contentParsed = e.template_content.replace(
    //           '[FailedCondition]',
    //           errorMessage,
    //         );

    //         if (e.via.length > 0) {
    //           e.via.map(async (f) => {
    //             const viaDetail = await this.lovService.getLovDetail(f);
    //             notification.push({
    //               via: viaDetail.set_value,
    //               template_content: contentParsed,
    //               param: {
    //                 msisdn: '085261510202',
    //               },
    //             });
    //           });
    //         }
    //       }
    //     });
    //   } else {
    //     notification.push({
    //       via: 'SMS',
    //       template_content: `Template notification not found. ${errorMessage}`,
    //       param: {
    //         msisdn: '085261510202',
    //       },
    //     });
    //   }

    //   // 1. Get program notification general error from provided keyword
    //   // 2. Push it to notification variable
    //   const notifPayload = {
    //     origin: 'error_handler.notification_general',
    //     tracing_id: parameter?.payload?.param?.tracing_id,
    //     tracing_master_id: parameter?.payload?.param?.tracing_id,
    //     keyword: parameter?.payload?.param?.keyword,
    //     notification: notification,
    //   };

    //   this.notificationGeneralClient.emit('notification_general', notifPayload);
    // }
  }
}

export class ExceptionData {
  statusCode?: string | number;
  level?: string;
  transaction_id?: string;
  notif_customer?: boolean;
  notif_operation?: boolean;
  taken_time?: number | null;
  payload?: LoggingData;
  config?: ConfigService;
  constructor(data: any) {
    this.config = data.config;
    this.notif_operation =
      this.config.get<boolean>('error_handling.operation') ?? true;
    this.notif_customer =
      this.config.get<boolean>('error_handling.customer') ?? false;
    this.taken_time = data.taken_time;
    this.level = data.level;
    this.payload = data.payload;
    this.statusCode = data?.statusCode;
  }
}

export class LoggingFilterData {
  request: any;
  realResponse: any;
  responseCustom: any;
  constructor(data: any) {
    this.realResponse = data.realResponse;
    this.responseCustom = data.responseCustom;
    this.request = data.request;
  }
}

export interface ILogData {
  service: string;
  user_id: IAccount | null;
  step: string;
  param: any;
  result: any;
}

export interface ILog {
  timestamp: number;
  level: string;
  notif_customer: boolean;
  notif_operation: boolean;
  taken_time: number;
  payload: ILogData;
}

export class LoggingRequest {
  payload: any;
  date_now?: any;
  is_success?: boolean;
  result?: any;
  step?: string;
  message?: string;
  statusCode?: HttpStatus;
  statusStringCode?: string;
  stack?: any;
  status_trx?: string;
  service?: string;
  method?: string;
}
