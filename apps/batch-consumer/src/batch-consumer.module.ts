import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import * as process from 'process';

import { BatchConsumerController } from './batch-consumer.controller';
import { BatchConsumerService } from './batch-consumer.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV == undefined
          ? ''
          : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        ApplicationConfig,
        MongoConfig,
        RedisConfig,
        CoreBackendConfig,
      ],
    }),
    ClientsModule.register([
      {
        name: 'BATCH_CONSUMER',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'batch-consumer',
            brokers: ['localhost:9092'],
          },
          consumer: {
            groupId: 'SL',
          },
        },
      },
    ]),
  ],
  controllers: [BatchConsumerController],
  providers: [BatchConsumerService],
})
export class BatchConsumerModule {}
