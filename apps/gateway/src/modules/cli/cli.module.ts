import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import SoapConfig from '@configs/dsp.soap';
import { Environtment } from '@configs/environtment';
import KafkaConfig from '@configs/kafka.config';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import { RewardCatalog } from '@configs/reward.catalog';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { WinstonModule } from '@utils/logger/module';
import { WinstonCustomTransport } from '@utils/logger/transport';

import { Seed } from '@/cli/commands/seed.command';

import { MigrationCommand } from './commands/migration.command';
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
        RewardCatalog,
        MongoConfig,
        RedisConfig,
        CoreBackendConfig,
        KafkaConfig,
        SoapConfig,
      ],
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const targetEnv: string =
          !process.env.NODE_ENV ||
          process.env.NODE_ENV === '' ||
          process.env.NODE_ENV === 'development'
            ? 'development'
            : process.env.NODE_ENV;
        return {
          levels: {
            error: 0,
            warn: 1,
            verbose: 3,
          },
          handleRejections: true,
          handleExceptions: true,
          colorize: true,
          transports: WinstonCustomTransport[targetEnv].cli,
        };
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<MongooseModuleOptions> => {
        return {
          uri: configService.get<string>('mongo.uri'),
          dbName: configService.get<string>('mongo.db-name'),
          tlsAllowInvalidCertificates: configService.get<boolean>(
            'mongo.tls_allow_invalid_certificates',
          ),
          tls: configService.get<boolean>('mongo.tls'),
          authSource: configService.get<string>('mongo.auth_source'),
          directConnection: configService.get<boolean>(
            'mongo.direct_connection',
          ),
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [Seed, MigrationCommand],
  exports: [Seed, MigrationCommand],
})
export class CLIModule {
  //
}
