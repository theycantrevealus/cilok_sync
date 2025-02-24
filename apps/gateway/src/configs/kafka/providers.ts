import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

export const kafkaProvider = {
  eligibility: {
    provide: 'KAFKA_ELIGIBILITY',
    inject: [ConfigService],
    useFactory: (configService: ConfigService) =>
      ClientProxyFactory.create({
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: configService.get<string>('kafka.eligibility.topic'),
            brokers: [configService.get<string>('kafka.eligibility.broker')],
          },
          consumer: {
            groupId: configService.get<string>('kafka.eligibility.cons_group'),
          },
          producerOnlyMode: true,
        },
      }),
  },
  batch: {
    provide: 'KAFKA_BATCH',
    inject: [ConfigService],
    useFactory: (configService: ConfigService) =>
      ClientProxyFactory.create({
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: configService.get<string>('kafka.batch.topic'),
            brokers: [configService.get<string>('kafka.batch.broker')],
          },
          consumer: {
            groupId: configService.get<string>('kafka.batch.cons_group'),
          },
          producerOnlyMode: true,
        },
      }),
  },
};
