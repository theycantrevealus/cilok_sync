import { KafkaConn } from '@configs/kafka/connection';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { SlconfigModule } from '@slconfig/slconfig.module';
import { WINSTON_MODULE_NEST_PROVIDER } from '@utils/logger/constants';

import { SLCluster } from '@/application/cluster/cluster';

import { PrepaidGranularModule } from './prepaid.granular.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SlconfigModule);
  const configService = appContext.get(ConfigService);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PrepaidGranularModule,
    await KafkaConn.prepaid_granular_renewal[0].useFactory(configService),
  );
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.listen();
  console.log('SIGNAL_DONE');
}
if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  SLCluster.clusterize(bootstrap);
} else {
  bootstrap();
}
