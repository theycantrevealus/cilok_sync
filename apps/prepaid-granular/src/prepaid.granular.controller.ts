import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { Controller, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Ctx,
  KafkaContext,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { InjectModel } from '@nestjs/mongoose';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { UtilsService } from '@utils/services/utils.service';
import * as https from 'https';
import { Model } from 'mongoose';
import { Logger } from 'winston';

import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { CredentialAccount } from '@/decorators/auth.decorator';

import {
  PrepaidGranularLog,
  PrepaidGranularLogDocument,
  PrepaidGranularLogEnum,
  PrepaidGranularTransactionEnum,
} from '../models/prepaid_granular_log';
import { PrepaidGranularService } from './prepaid.granular.service';

@Controller()
export class PrepaidGranularController {
  private index: number;
  private token: string;
  private account: any;
  private startDate: Date;

  constructor(
    private readonly kafkaService: PrepaidGranularService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private utilsService: UtilsService,
    @InjectModel(PrepaidGranularLog.name)
    private prepaidGranularLog: Model<PrepaidGranularLogDocument>,
    @Inject(AccountService) private readonly accountService: AccountService,
    @Inject(ApplicationService)
    private readonly applicationService: ApplicationService,
  ) {
    this.startDate = new Date();

    this.index = 0;
    this.token = '';
    this.account = '';

    // this.setToken();
    this.setTokenSystem();

    // this.setKafka().then(() => {
    //
    // });
  }

  async setToken() {
    const signIn = await this.utilsService.getToken();
    if (signIn.status !== HttpStatus.OK) {
      const rowData = new this.prepaidGranularLog({
        transaction_name: PrepaidGranularTransactionEnum.SIGNIN,
        status: PrepaidGranularLogEnum.FAIL,
        error: signIn.message,
      });
      await rowData.save().catch((error) => {
        return this.kafkaService.loggerGranular(
          {},
          error,
          'error',
          this.startDate,
          HttpStatus.EXPECTATION_FAILED,
        );
      });
      return this.kafkaService.loggerGranular(
        {},
        signIn.message,
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );
    } else {
      this.token = `Bearer ${signIn.payload.access_token}`;
      this.account = await this.accountService.authenticateBusiness({
        auth: this.token,
      });
    }
  }

  async setTokenSystem() {
    const token = await this.applicationService.getSystemToken();
    if (!token) {
      return this.kafkaService.loggerGranular(
        {},
        'Unable to get token from System Config!',
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    this.token = `Bearer ${token}`;
    this.account = await this.accountService.authenticateBusiness({
      auth: this.token,
    });

    console.log(`Current token is: `, this.token);
  }

  // prepaid granular
  @MessagePattern(process.env.KAFKA_PREPAID_GRANULAR_TOPIC)
  async injectPrepaidGranular(
    @Payload() payload: any,
    @CredentialAccount() account,
    @Ctx() context: KafkaContext,
  ) {
    try {
      // check token first
      // console.log(`Current token is: `, this.token);
      if (!this.token) {
        await this.setTokenSystem();
      }

      const data = context.getMessage();
      const proceed = await this.decodeSR(data);

      return this.kafkaService.domProcess(
        proceed,
        data.offset,
        this.account,
        this.token,
      );
    } catch (err) {
      this.kafkaService.loggerGranular(
        {},
        `Prepaid error occured! Error: ${err?.message}`,
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );

      return false;
    }
  }

  async decodeSR(message: KafkaMessage) {
    const registry = new SchemaRegistry({
      host: this.configService.get<string>(
        'kafka.prepaid_granular.schema_registry.host',
      ),
      auth: {
        username: this.configService.get<string>(
          'kafka.prepaid_granular.schema_registry.username',
        ),
        password: this.configService.get<string>(
          'kafka.prepaid_granular.schema_registry.password',
        ),
      },
      agent: new https.Agent({
        rejectUnauthorized: false,
        // cert: fs.readFileSync(
        //   this.configService.get<string>('kafka.granular.ssl.ca'),
        // ),
      }),
    });

    if (registry) {
      message.value = await registry.decode(message.value);
      return message.value;
    }

    await new Promise((resolve, reject) => {
      try {
        const value = message.value.toString();
        const scripts = [];
        this.logger.verbose(value);
        resolve(value);
      } catch (e) {
        this.logger.warn(e);
        reject(e);
      }
    });
  }
}
