import { KafkaConn } from '@configs/kafka/connection';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';

import { SLCluster } from '@/application/cluster/cluster';

import { SlconfigModule } from '../../slconfig/src/slconfig.module';
import { RedeemFmcModule } from './redeem.fmc.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SlconfigModule);
  const configService = appContext.get(ConfigService);
  const kafkaConnection = await KafkaConn.redeem_fmc[0].useFactory(
    configService,
  );
  console.log(configService.get('kafka.redeem_fmc'));
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    RedeemFmcModule,
    kafkaConnection,
  );
  await app.listen();
  console.log('SIGNAL_DONE');
}

if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  SLCluster.clusterize(bootstrap);
} else {
  bootstrap();
}
