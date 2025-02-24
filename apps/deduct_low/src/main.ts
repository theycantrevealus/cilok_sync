import { NestFactory } from '@nestjs/core';
import { DeductLowModule } from './deduct_low.module';
import { SlconfigModule } from '@slconfig/slconfig.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions } from '@nestjs/microservices';
import { KafkaConn } from '@configs/kafka/connection';
import { SLCluster } from '@/application/cluster/cluster';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SlconfigModule);
  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    DeductLowModule,
    await KafkaConn.deduct_low[0].useFactory(configService),
  );
  app.listen();
  console.log('SIGNAL_DONE');
}

if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  SLCluster.clusterize(bootstrap);
} else {
  bootstrap();
}
