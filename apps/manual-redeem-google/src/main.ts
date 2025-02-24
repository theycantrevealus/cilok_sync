import { KafkaConn } from '@configs/kafka/connection';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';

import { ApplicationModule } from '@/application/application.module';
import { SLCluster } from '@/application/cluster/cluster';

import { ManualRedeemGoogleModule } from './manual-redeem-google.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(
    ApplicationModule,
  );
  const configService = appContext.get(ConfigService);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ManualRedeemGoogleModule,
    await KafkaConn.manual_redeem_google[0].useFactory(configService),
  );
  await app.listen();
}
if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  SLCluster.clusterize(bootstrap);
} else {
  bootstrap();
}
