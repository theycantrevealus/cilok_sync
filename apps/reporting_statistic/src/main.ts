import { KafkaConn } from '@configs/kafka/connection';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { SlconfigModule } from '@slconfig/slconfig.module';

import { SLCluster } from '@/application/cluster/cluster';

import { ReportingStatisticModule } from './reporting_statistic.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(
    SlconfigModule,
    // {
    //   logger: ['verbose', 'warn', 'error'],
    // },
  );

  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ReportingStatisticModule,
    await KafkaConn.reporting_statistic[0].useFactory(configService),
  );

  app.listen();
  console.log('SIGNAL_DONE');
}
if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  SLCluster.clusterize(bootstrap);
} else {
  bootstrap();
}
