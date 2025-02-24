import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { Controller, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { InjectModel } from '@nestjs/mongoose';
import { WINSTON_MODULE_PROVIDER } from '@utils/logger/constants';
import { UtilsService } from '@utils/services/utils.service';
import * as fs from 'fs';
import * as https from 'https';
import { Kafka } from 'kafkajs';
import { Model } from 'mongoose';
import { Logger } from 'winston';

import { AccountService } from '@/account/services/account.service';
import { ApplicationService } from '@/application/services/application.service';
import { CredentialAccount } from '@/decorators/auth.decorator';

import {
  PostpaidGranularLog,
  PostpaidGranularLogDocument,
  PostpaidGranularLogEnum,
  PostpaidGranularTransactionEnum,
} from '../models/postpaid_granular_log';
import { PostpaidGranularService } from './postpaid.granular.service';

@Controller()
export class PostpaidGranularController {
  private index: number;
  private token: string;
  private account: any;
  private startDate: Date;

  constructor(
    private readonly kafkaService: PostpaidGranularService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private utilsService: UtilsService,
    @InjectModel(PostpaidGranularLog.name)
    private postpaidGranularLog: Model<PostpaidGranularLogDocument>,
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
      const rowData = new this.postpaidGranularLog({
        transaction_name: PostpaidGranularTransactionEnum.SIGNIN,
        status: PostpaidGranularLogEnum.FAIL,
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

  async setKafka() {
    const topic = this.configService.get('kafka.postpaid_granular.topic');
    const kafka = new Kafka({
      clientId: this.configService.get('kafka.postpaid_granular.topic'),
      brokers: this.configService
        .get('kafka.postpaid_granular.broker')
        .split(' '),
      ssl: {
        rejectUnauthorized: false,
        cert: fs.readFileSync(
          this.configService.get<string>('kafka.postpaid_granular.ssl.ca'),
        ),
      },
      sasl: {
        mechanism: 'plain',
        username: this.configService.get<string>(
          'kafka.postpaid_granular.sasl.username',
        ),
        password: this.configService.get<string>(
          'kafka.postpaid_granular.sasl.password',
        ),
      },
    });
    const consumer = kafka.consumer({
      groupId: this.configService.get<string>(
        'kafka.postpaid_granular.cons_group',
      ),
    });

    await consumer.connect();
    await consumer.subscribe({
      topic,
      fromBeginning: true,
    });
    const registry = new SchemaRegistry({
      host: this.configService.get<string>(
        'kafka.postpaid_granular.schema_registry.host',
      ),
      auth: {
        username: this.configService.get<string>(
          'kafka.postpaid_granular.schema_registry.username',
        ),
        password: this.configService.get<string>(
          'kafka.postpaid_granular.schema_registry.password',
        ),
      },
      agent: new https.Agent({ rejectUnauthorized: false }),
    });
    const timer = null;
    const no = 0;

    await consumer.run({
      autoCommit: false,
      autoCommitInterval: 5000,
      autoCommitThreshold: 100,
      partitionsConsumedConcurrently: 1,
      eachMessage: async ({ topic, partition, message }) => {
        if (registry) {
          message.value = await registry.decode(message.value);
        }
        // if (timer) {
        //   clearTimeout(timer);
        // }
        // timer = setTimeout(() => (no = 0), 10000);
        //
        await new Promise(async (resolve, reject) => {
          try {
            const value = message.value.toString();
            const scripts = [];
            this.logger.verbose(value);
            await this.kafkaService.process(
              value,
              message.offset,
              this.account,
              this.token,
            );
          } catch (e: any) {
            this.logger.warn(e);
          }
        });
      },
    });

    // To move the offset position in a topic/partition
    // await consumer.seek({
    //   offset: '0',
    //   topic,
    //   partition: 0,
    // });
  }

  // postpraid granular
  @MessagePattern(process.env.KAFKA_POSTPAID_GRANULAR_TOPIC)
  async injectPostpaidGranular(
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

      const consumer = context.getConsumer();
      const data = context.getMessage();
      const proceed = await this.decodeSR(data);

      // console.log('Rifqi -> Payload after decode 7447', proceed);

      return this.kafkaService.process(
        proceed,
        data.offset,
        this.account,
        this.token,
      );
    } catch (err) {
      this.kafkaService.loggerGranular(
        {},
        `Postpaid error occured! Error: ${err?.message}`,
        'error',
        this.startDate,
        HttpStatus.EXPECTATION_FAILED,
      );

      return false;
    }
  }

  async decodeSR(message: KafkaMessage) {
    console.log(
      `Connecting to schema reqistry ${this.configService.get<string>(
        'kafka.postpaid_granular.schema_registry.host',
      )}`,
    );

    console.log(
      `Username : ${this.configService.get<string>(
        'kafka.postpaid_granular.schema_registry.username',
      )}`,
    );

    console.log(
      `Password${this.configService.get<string>(
        'kafka.postpaid_granular.schema_registry.password',
      )}`,
    );

    const registry = new SchemaRegistry({
      host: this.configService.get<string>(
        'kafka.postpaid_granular.schema_registry.host',
      ),
      auth: {
        username: this.configService.get<string>(
          'kafka.postpaid_granular.schema_registry.username',
        ),
        password: this.configService.get<string>(
          'kafka.postpaid_granular.schema_registry.password',
        ),
      },
      agent: new https.Agent({
        rejectUnauthorized: false,
        // cert: fs.readFileSync(
        //   this.configService.get<string>('kafka.postpaid_granular.ssl.ca'),
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
