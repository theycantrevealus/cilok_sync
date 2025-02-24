import { NotificationTemplateConfig } from '@configs/notification.template.config';
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { Logger } from 'winston';

import { ApplicationService } from '@/application/services/application.service';
import { NotificationContentService } from '@/application/services/notification-content.service';
import { CustomerService } from '@/customer/services/customer.service';
import { LovService } from '@/lov/services/lov.service';
import { EligibilityService } from '@/transaction/services/eligibility.service';
import { RedeemService } from '@/transaction/services/redeem/redeem.service';

// import { MaxModeConstant } from '../../gateway/src/constants/constant';
import { WINSTON_MODULE_PROVIDER } from '../../utils/logger/constants';
import { ExceptionHandler } from '../../utils/logger/handler';
import { LoggingData } from '../../utils/logger/transport';
import { IAccount } from '../../utils/logger/transport';

@Injectable()
export class KafkaService {
  private customerService: CustomerService;
  private lovService: LovService;
  private eligibilityService: EligibilityService;
  private notificationContentService: NotificationContentService;
  private redeemService: RedeemService;
  private applicationService: ApplicationService;
  private url: string;
  private realm: string;
  private branch: string;
  private merchant: string;
  private raw_core: string;
  private raw_port: number;
  private payload: any;
  private notEligible: boolean;
  // private logger: Logger = new Logger(KafkaService.name);

  constructor(
    lovService: LovService,
    // configService: ConfigService,
    customerService: CustomerService,
    httpService: HttpService,
    eligibilityService: EligibilityService,
    notificationContentService: NotificationContentService,
    applicationService: ApplicationService,
    redeemService: RedeemService,
    @Inject('NOTIFICATION_PRODUCER')
    private readonly notificationClient: ClientKafka,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.lovService = lovService;
    this.eligibilityService = eligibilityService;
    this.notificationContentService = notificationContentService;
    this.applicationService = applicationService;
    this.redeemService = redeemService;

    this.url = `${configService.get<string>('core-backend.api.url')}`;
    this.merchant = `${configService.get<string>('core-backend.merchant.id')}`;
    this.raw_core = `${configService.get<string>('core-backend.raw')}`;
    this.raw_port = configService.get<number>('core-backend.raw_port');
    this.customerService = customerService;
    this.branch = `${configService.get<string>('core-backend.branch.id')}`;
    this.realm = `${configService.get<string>('core-backend.realm.id')}`;
  }

  getHello(): string {
    return 'Hello World!';
  }
}
