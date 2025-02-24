import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { Controller, Get, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { ExceptionHandler } from '@utils/logger/handler';
import { LoggingData } from '@utils/logger/transport';
import { IAccount } from '@utils/logger/transport';

import { NotificationContentService } from '@/application/services/notification-content.service';
import {
  getMsisdnOnly,
  msisdnCombineFormatted,
} from '@/application/utils/Msisdn/formatter';
import { CustomerService } from '@/customer/services/customer.service';
import { LovService } from '@/lov/services/lov.service';
import { TransactionOptionalService } from '@/transaction/config/transaction-optional.service';
import { PointService } from '@/transaction/services/point/point.service';

import { InjectService } from './inject.point.kafka.service';

const moment = require('moment-timezone');

@Controller()
export class InjectController {
  private realm: string;
  private branch: string;
  private merchant: string;

  constructor(
    @Inject(InjectService)
    private readonly injectService: InjectService,

    @Inject(PointService)
    private readonly pointService: PointService,

    @Inject(LovService)
    private readonly lovService: LovService,

    @Inject('INJECT_POINT_SERVICE_PRODUCER')
    private readonly injectPointClient: ClientKafka,

    @Inject('REPORTING_POINT_EVENT_PRODUCER')
    private readonly clientReportingBI: ClientKafka,

    @Inject('TRANSACTION_MASTER_SERVICE_PRODUCER')
    private readonly transactionMasterClient: ClientKafka,

    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(CustomerService)
    private readonly customerService: CustomerService,

    @Inject(TransactionOptionalService)
    private transactionConfig: TransactionOptionalService,

    @Inject(NotificationContentService)
    private notifService: NotificationContentService,
  ) {
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
  }

  @MessagePattern(process.env.KAFKA_INJECT_POINT_TOPIC)
  async validation(@Payload() payload: any) {
    const start = new Date();
    try {
      await this.injectService.validation(payload)
    } catch (e) {
      console.log('ERROR/CACTH', e);
      await this.injectService.loggerInjectPoint(
        payload,
        `Inject Point ERROR ${e.message}`,
        start,
        e,
        true,
      );
    }

     // Nullify
     payload = null;

     return
  }
}
