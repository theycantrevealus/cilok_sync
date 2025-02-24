import applicationConfig from '@configs/application.config';
import coreBackendConfig from '@configs/core-backend.config';
import { Environtment } from '@configs/environtment';
import mongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DeductCoordinatorEmitterController } from './deduct_coordinator_emitter.controller';
import { DeductCoordinatorEmitterService } from './deduct_coordinator_emitter.service';

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
  ],
  controllers: [DeductCoordinatorEmitterController],
  providers: [DeductCoordinatorEmitterService],
})
export class DeductCoordinatorEmitterModule {}
