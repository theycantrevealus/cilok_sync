import applicationConfig from '@configs/application.config';
import coreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import mongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { DeductCoordinatorController } from './deduct_coordinator.controller';
import { DeductCoordinatorService } from './deduct_coordinator.service';

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
        applicationConfig,
        mongoConfig,
        coreBackendConfig,
        RedisConfig,
      ],
    }),
    ClientsModule.registerAsync([
      {
        name: 'DEDUCT_COORDINATOR',
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('redis.host'),
            port: +configService.get<number>('redis.port'),
            password: configService.get<string>('redis.password'),
          },
        }),
      },
    ]),
  ],
  controllers: [DeductCoordinatorController],
  providers: [DeductCoordinatorService],
})
export class DeductCoordinatorModule {
  constructor() {
    //
  }
}
