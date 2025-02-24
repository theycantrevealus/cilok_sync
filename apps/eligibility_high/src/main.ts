import { KafkaConn } from '@configs/kafka/connection';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';

import { SLCluster } from '@/application/cluster/cluster';

import { SlconfigModule } from '../../slconfig/src/slconfig.module';
import { KafkaModule } from './kafka.module';
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(
    SlconfigModule,
    {
      logger: ['warn', 'error', 'verbose'],
    },
  );
  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    KafkaModule,
    await KafkaConn.eligibility_high[0].useFactory(configService),
  );
  app.listen();
  console.log('SIGNAL_DONE');
}
if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  SLCluster.clusterize(bootstrap);
} else {
  bootstrap();
}
