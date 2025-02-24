import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import {
  CustomerMostRedeem,
  CustomerMostRedeemDocument,
} from '@reporting_statistic/model/reward-catalog/customer-most-redeem.model';
import { ExceptionHandler } from '@utils/logger/handler';
import { IAccount, LoggingData } from '@utils/logger/transport';
import { Model } from 'mongoose';

import { allowedMSISDN } from '@/application/utils/Msisdn/formatter';

export type LoggerObject = {
  transaction_status: string;
  transaction_classify: string;
  trace_custom_code: string;
  origin: string;
  submit_time: any;
  tracing_id: string;
  account: any;
  customer: { msisdn: any };
  data: { msisdn: any };
};

@Injectable()
export class PersonalizedRewardCatalogService {
  constructor(
    @InjectModel(CustomerMostRedeem.name)
    private readonly customerMostRedeemModel: Model<CustomerMostRedeemDocument>,

    @Inject(ExceptionHandler)
    private readonly exceptionHandler: ExceptionHandler,

    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  public async createStatisticOfPersonalizedRewardCatalog(
    programExperienceId: string,
    loggerObject: LoggerObject,
  ): Promise<void> {
    const msisdn = loggerObject.customer.msisdn;
    const step = `${PersonalizedRewardCatalogService.name} - createStatisticOfPersonalizedRewardCatalog`;
    const queryFilter = {
      msisdn,
      program_experience_id: programExperienceId,
    };

    try {
      if (!allowedMSISDN(msisdn)) {
        console.log(`msisdn not allowed : ${msisdn}`);
        throw new BadRequestException('msisdn not allowed');
      }

      await this.loggerReportStatistic(
        loggerObject,
        false,
        `${step} in progress`,
        '',
        new Date(),
      );

      console.log('query', queryFilter);

      const result = await this.customerMostRedeemModel.findOneAndUpdate(
        queryFilter,
        { $inc: { counter: 1 } },
        { upsert: true },
      );

      console.log('result', result);

      await this.loggerReportStatistic(
        loggerObject,
        false,
        `${step} success`,
        '',
        new Date(),
      );
    } catch (error) {
      await this.loggerReportStatistic(
        loggerObject,
        true,
        `${step} error`,
        {
          message: error.message,
          stack: error.stack,
        },
        new Date(),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async loggerReportStatistic(
    payload: any,
    isError: boolean,
    step: string,
    error: any,
    start: Date,
    statusCode: number = HttpStatus.OK,
    notifOperation = false,
    notifCustomer = false,
  ) {
    const end = new Date();
    const takenTime = Math.abs(start.getTime() - end.getTime());
    const result = error ? error : {};

    await this.exceptionHandler.handle({
      level: isError ? 'error' : 'verbose',
      notif_operation: notifOperation,
      notif_customer: notifCustomer,
      transaction_id: payload.tracing_id,
      config: this.configService,
      taken_time: takenTime,
      statusCode: statusCode,
      payload: {
        transaction_id: payload.tracing_id,
        statusCode: statusCode,
        method: 'kafka',
        url: 'reporting_statistic',
        service: PersonalizedRewardCatalogService.name,
        step: step,
        taken_time: takenTime,
        result: result,
        payload: {
          service: PersonalizedRewardCatalogService.name,
          user_id: new IAccount(payload.account),
          step: step,
          result: result,
          param: payload,
        },
      } satisfies LoggingData,
    });
  }
}
