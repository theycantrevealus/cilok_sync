import { KafkaConn } from '@configs/kafka/connection';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { SlconfigModule } from '@slconfig/slconfig.module';
import { EventEmitter } from 'events';

import { SLCluster } from '@/application/cluster/cluster';

import { BatchModule } from './batch.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SlconfigModule);
  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    BatchModule,
    await KafkaConn.batch[0].useFactory(configService),
  );

  // set event emitter to infinity
  EventEmitter.defaultMaxListeners = 0;
  await app.listen();
  console.log('SIGNAL_DONE');
}
if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  SLCluster.clusterize(bootstrap);
} else {
  bootstrap();
}
