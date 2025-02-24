import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import KafkaConfig from '@configs/kafka.config';
import { KafkaConnProducer } from '@configs/kafka/client';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';

import { ConnectionTestController } from './connection_test.controller';
import { ConnectionTestService } from './connection_test.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        !process.env.NODE_ENV ||
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === ''
          ? ''
          : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        ApplicationConfig,
        MongoConfig,
        RedisConfig,
        CoreBackendConfig,
        KafkaConfig,
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<MongooseModuleOptions> => {
        const connection = {
          uri: configService.get<string>('mongo.uri'),
          dbName: configService.get<string>('mongo.db-name'),
          user: configService.get<string>('mongo.db-user'),
          pass: configService.get<string>('mongo.db-password'),
        };
        return connection;
      },
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      KafkaConn.refund[0],
      KafkaConnProducer.refund[0],
    ]),
  ],
  controllers: [ConnectionTestController],
  providers: [ConnectionTestService],
})
export class ConnectionTestModule {}
