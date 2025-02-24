import { KafkaConn } from '@configs/kafka/connection';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SlconfigModule } from '@slconfig/slconfig.module';

import { SLCluster } from '@/application/cluster/cluster';

import { MerchandiseModule } from './merchandise.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SlconfigModule);
  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    MerchandiseModule,
    await KafkaConn.merchandise[0].useFactory(configService),
  );
  await app.listen();
  console.log('SIGNAL_DONE');
}
if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  SLCluster.clusterize(bootstrap);
} else {
  bootstrap();
}
