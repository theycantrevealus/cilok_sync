import ApplicationConfig from '@configs/application.config';
import CoreBackendConfig from '@configs/core-backend.config';
import SoapConfig from '@configs/dsp.soap';
import { Environtment } from '@configs/environtment';
import KafkaConfig from '@configs/kafka.config';
import MongoConfig from '@configs/mongo.config';
import RedisConfig from '@configs/redis.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProvider, Transport } from '@nestjs/microservices';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { Partitioners } from 'kafkajs';
import * as process from 'process';

dotenv.config({
  path:
    !process.env.NODE_ENV ||
    process.env.NODE_ENV === '' ||
    process.env.NODE_ENV === 'development'
      ? `env/.env`
      : `env/${process.env.NODE_ENV}.env`,
});

const devMode =
  !process.env.NODE_ENV ||
  process.env.NODE_ENV === '' ||
  process.env.NODE_ENV === 'development';

const KafkaConnCoorProd = (devMode) => {
  if (devMode) {
    return {
      auction: [
        {
          name: `${process.env.KAFKA_AUCTION_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                connectionTimeout: 500000,
                authenticationTimeout: 500000,
                clientId: configService.get<string>('kafka.auction.topic'),
                brokers: configService
                  .get<string>('kafka.auction.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.auction.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_AUCTION_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      data_store: [
        {
          name: `${process.env.KAFKA_DATA_STORE_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                connectionTimeout: 500000,
                authenticationTimeout: 500000,
                clientId: configService.get<string>('kafka.data_store.topic'),
                brokers: configService
                  .get<string>('kafka.data_store.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.data_store.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DATA_STORE_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      callback: [
        {
          name: `${process.env.KAFKA_CALLBACK_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.callback.topic'),
                brokers: configService
                  .get<string>('kafka.callback.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.callback.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_CALLBACK_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      campaign: [
        {
          name: `${process.env.KAFKA_CAMPAIGN_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.campaign.topic'),
                brokers: configService
                  .get<string>('kafka.campaign.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.campaign.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_CAMPAIGN_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      location: [
        {
          name: `${process.env.KAFKA_LOCATION_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => {
            return {
              options: {
                client: {
                  clientId: configService.get<string>('kafka.location.topic'),
                  brokers: configService
                    .get<string>('kafka.location.broker')
                    .split(' '),
                },
                consumer: {
                  groupId: configService.get<string>(
                    'kafka.location.cons_group',
                  ),
                },
                producer: {
                  createPartitioner: Partitioners.LegacyPartitioner,
                },
                producerOnlyMode: true,
                send: {
                  acks: parseInt(process.env.KAFKA_LOCATION_ACK ?? '-1'),
                },
              },
            };
          },
        },
      ],
      batch: [
        {
          name: `${process.env.KAFKA_BATCH_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                connectionTimeout: 500000,
                authenticationTimeout: 500000,
                clientId: configService.get<string>('kafka.batch.topic'),
                brokers: configService
                  .get<string>('kafka.batch.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.batch.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_BATCH_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      inject_point: [
        {
          name: `${process.env.KAFKA_INJECT_POINT_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.inject_point.topic'),
                brokers: configService
                  .get<string>('kafka.inject_point.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.inject_point.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_INJECT_POINT_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      inject_point_high: [
        {
          name: `${process.env.KAFKA_INJECT_POINT_HIGH_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.inject_point_high.topic'),
                brokers: configService
                  .get<string>('kafka.inject_point_high.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.inject_point_high.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_INJECT_POINT_HIGH_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      outbound: [
        {
          name: `${process.env.KAFKA_OUTBOUND_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.outbound.topic'),
                brokers: configService
                  .get<string>('kafka.outbound.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.outbound.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_OUTBOUND_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      inbound: [
        {
          name: `${process.env.KAFKA_INBOUND_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.inbound.topic'),
                brokers: configService
                  .get<string>('kafka.inbound.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.inbound.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_INBOUND_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      merchandise: [
        {
          name: `${process.env.KAFKA_MERCHANDISE_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.merchandise.topic'),
                brokers: configService
                  .get<string>('kafka.merchandise.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.merchandise.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_MERCHANDISE_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      inject_coupon: [
        {
          name: `${process.env.KAFKA_INJECT_COUPON_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.inject_coupon.topic',
                ),
                brokers: configService
                  .get<string>('kafka.inject_coupon.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.inject_coupon.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_INJECT_COUPON_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      donation: [
        {
          name: `${process.env.KAFKA_DONATION_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.donation.topic'),
                brokers: configService
                  .get<string>('kafka.donation.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.donation.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DONATION_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      eligibility: [
        {
          name: `${process.env.KAFKA_ELIGIBILITY_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
                SoapConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.eligibility.topic'),
                brokers: configService
                  .get<string>('kafka.eligibility.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.eligibility.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_ELIGIBILITY_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      notification: [
        {
          name: `${process.env.KAFKA_NOTIFICATION_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.notification.topic'),
                brokers: configService
                  .get<string>('kafka.notification.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.notification.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_NOTIFICATION_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      redeem: [
        {
          name: `${process.env.KAFKA_REDEEM_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: `${configService.get<string>(
                  'kafka.redeem.topic',
                )}_producer`,
                brokers: configService
                  .get<string>('kafka.redeem.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.redeem.cons_group'),
                // sessionTimeout:300000,
                // heartbeatInterval: 30000,
                // metadataMaxAge:300000,
                // retry: {
                //   retries: 10,
                // },
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_REDEEM_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      redeem_fmc: [
        {
          name: `${process.env.KAFKA_REDEEM_FMC_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: `${configService.get<string>(
                  'kafka.redeem_fmc.topic',
                )}_producer`,
                brokers: configService
                  .get<string>('kafka.redeem_fmc.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.redeem_fmc.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_REDEEM_FMC_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      redeem_high: [
        {
          name: `${process.env.KAFKA_REDEEM_HIGH_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: `${configService.get<string>(
                  'kafka.redeem_high.topic',
                )}_producer`,
                brokers: configService
                  .get<string>('kafka.redeem_high.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.redeem_high.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_REDEEM_HIGH_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      redeem_low: [
        {
          name: `${process.env.KAFKA_REDEEM_LOW_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: `${configService.get<string>(
                  'kafka.redeem_low.topic',
                )}_producer`,
                brokers: configService
                  .get<string>('kafka.redeem_low.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.redeem_low.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_REDEEM_LOW_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      deduct: [
        {
          name: `${process.env.KAFKA_DEDUCT_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.deduct.topic'),
                brokers: configService
                  .get<string>('kafka.deduct.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.deduct.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DEDUCT_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      deduct_high: [
        {
          name: `${process.env.KAFKA_DEDUCT_HIGH_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.deduct_high.topic'),
                brokers: configService
                  .get<string>('kafka.deduct_high.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.deduct_high.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DEDUCT_HIGH_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      deduct_low: [
        {
          name: `${process.env.KAFKA_DEDUCT_LOW_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.deduct_low.topic'),
                brokers: configService
                  .get<string>('kafka.deduct_low.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.deduct_low.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DEDUCT_LOW_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      coupon: [
        {
          name: `${process.env.KAFKA_COUPON_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.coupon.topic'),
                brokers: configService
                  .get<string>('kafka.coupon.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.coupon.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_COUPON_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      coupon_high: [
        {
          name: `${process.env.KAFKA_COUPON_HIGH_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.coupon_high.topic'),
                brokers: configService
                  .get<string>('kafka.coupon_high.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.coupon_high.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_COUPON_HIGH_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      coupon_low: [
        {
          name: `${process.env.KAFKA_COUPON_LOW_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.coupon_low.topic'),
                brokers: configService
                  .get<string>('kafka.coupon_low.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.coupon_low.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_COUPON_LOW_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      void: [
        {
          name: `${process.env.KAFKA_VOID_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.void.topic'),
                brokers: configService
                  .get<string>('kafka.void.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.void.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_VOID_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      voucher: [
        {
          name: `${process.env.KAFKA_VOUCHER_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.voucher.topic'),
                brokers: configService
                  .get<string>('kafka.voucher.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.voucher.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_VOUCHER_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      transaction_master: [
        {
          name: `${process.env.KAFKA_TRANSACTION_MASTER_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.transaction_master.topic',
                ),
                brokers: configService
                  .get<string>('kafka.transaction_master.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.transaction_master.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_TRANSACTION_MASTER_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      refund: [
        {
          name: `${process.env.KAFKA_REFUND_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.refund.topic'),
                brokers: configService
                  .get<string>('kafka.refund.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.refund.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_REFUND_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      sftp: [
        {
          name: `${process.env.KAFKA_SFTP_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.sftp.topic'),
                brokers: configService
                  .get<string>('kafka.sftp.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.sftp.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_SFTP_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      sftp_outgoing: [
        {
          name: `${process.env.KAFKA_SFTP_OUTGOING_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.sftp_outgoing.topic',
                ),
                brokers: configService
                  .get<string>('kafka.sftp_outgoing.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.sftp_outgoing.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_SFTP_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      sftp_incoming: [
        {
          name: `${process.env.KAFKA_SFTP_INCOMING_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.sftp_incoming.topic',
                ),
                brokers: configService
                  .get<string>('kafka.sftp_incoming.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.sftp_incoming.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_SFTP_INCOMING_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      sftp_incoming_batch_process: [
        {
          name: `${process.env.KAFKA_SFTP_INCOMING_BATCH_PROCESS_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.sftp_incoming_batch_process.topic',
                ),
                brokers: configService
                  .get<string>('kafka.sftp_incoming_batch_process.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.sftp_incoming_batch_process.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_SFTP_INCOMING_BATCH_PROCESS_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      cron: [
        {
          name: `${process.env.KAFKA_CRON_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.cron.topic'),
                brokers: configService
                  .get<string>('kafka.cron.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.cron.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_CRON_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      reporting_statistic: [
        {
          name: `${process.env.KAFKA_REPORTING_STATISTIC_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => {
            console.log(
              `Loading configuration ${JSON.stringify(
                configService.get<any>('kafka.reporting_statistic'),
              )}`,
            );
            return {
              transport: Transport.KAFKA,
              options: {
                client: {
                  clientId: configService.get<string>(
                    'kafka.reporting_statistic.topic',
                  ),
                  brokers: configService
                    .get<string>('kafka.reporting_statistic.broker')
                    .split(' '),
                },
                consumer: {
                  groupId: configService.get<string>(
                    'kafka.reporting_statistic.cons_group',
                  ),
                },
                producer: {
                  createPartitioner: Partitioners.LegacyPartitioner,
                },
                producerOnlyMode: true,
                send: {
                  acks: parseInt(
                    process.env.KAFKA_REPORTING_STATISTIC_ACK ?? '-1',
                  ),
                },
              },
            };
          },
        },
      ],
      reporting_point_event: [
        {
          name: `${process.env.KAFKA_REPORTING_POINT_EVENT_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.reporting_point_event.topic',
                ),
                brokers: [
                  configService.get<string>(
                    'kafka.reporting_point_event.broker',
                  ),
                ],
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.reporting_point_event.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_REPORTING_POINT_EVENT_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      reporting_generation: [
        {
          name: `${process.env.KAFKA_REPORTING_GENERATION_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.reporting_generation.topic',
                ),
                brokers: [
                  configService.get<string>(
                    'kafka.reporting_generation.broker',
                  ),
                ],
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.reporting_generation.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_REPORTING_GENERATION_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      reporting_generation_recovery: [
        {
          name: `${process.env.KAFKA_REPORTING_GENERATION_RECOVERY_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.reporting_generation_recovery.topic',
                ),
                brokers: [
                  configService.get<string>(
                    'kafka.reporting_generation_recovery.broker',
                  ),
                ],
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.reporting_generation_recovery.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_REPORTING_GENERATION_RECOVERY_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      postpaid_granular: [
        {
          name: `${process.env.KAFKA_POSTPAID_GRANULAR_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              subscribe: {
                fromBeginning: true,
              },
              client: {
                clientId: configService.get<string>(
                  'kafka.postpaid_granular.topic',
                ),
                brokers: configService
                  .get<string>('kafka.postpaid_granular.broker')
                  ?.split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.postpaid_granular.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_POSTPAID_GRANULAR_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      prepaid_granular: [
        {
          name: `${process.env.KAFKA_PREPAID_GRANULAR_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              subscribe: {
                fromBeginning: true,
              },
              client: {
                clientId: configService.get<string>(
                  'kafka.prepaid_granular.topic',
                ),
                brokers: configService
                  .get<string>('kafka.prepaid_granular.broker')
                  ?.split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.prepaid_granular.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_PREPAID_GRANULAR_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      notification_general: [
        {
          name: `${process.env.KAFKA_NOTIFICATION_GENERAL_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV ||
                process.env.NODE_ENV === 'development' ||
                process.env.NODE_ENV === ''
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.notification_general.topic',
                ),
                brokers: configService
                  .get<string>('kafka.notification_general.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.notification_general.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_NOTIFICATION_GENERAL_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      data_sync: [
        {
          name: `${process.env.KAFKA_DATA_SYNC_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.data_sync.topic'),
                brokers: configService
                  .get<string>('kafka.data_sync.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.data_sync.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DATA_SYNC_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      manual_redeem_google: [
        {
          name: `${process.env.KAFKA_MANUAL_REDEEM_GOOGLE_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.manual_redeem_google.topic',
                ),
                brokers: configService
                  .get<string>('kafka.manual_redeem_google.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.manual_redeem_google.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_MANUAL_REDEEM_GOOGLE_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      manual_redeem: [
        {
          name: `${process.env.KAFKA_MANUAL_REDEEM_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.manual_redeem.topic',
                ),
                brokers: configService
                  .get<string>('kafka.manual_redeem.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.manual_redeem.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_MANUAL_REDEEM_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      manual_process: [
        {
          name: `${process.env.KAFKA_MANUAL_PROCESS_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.manual_process.topic',
                ),
                brokers: configService
                  .get<string>('kafka.manual_process.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.manual_process.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_MANUAL_PROCESS_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      vote: [
        {
          name: `${process.env.KAFKA_VOTE_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.vote.topic'),
                brokers: configService
                  .get<string>('kafka.vote.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>('kafka.vote.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_VOTE_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      multi_bonus: [
        {
          name: `${process.env.KAFKA_MULTI_BONUS_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.multi_bonus.topic'),
                brokers: configService
                  .get<string>('kafka.multi_bonus.broker')
                  .split(' '),
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.multi_bonus.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_MULTI_BONUS_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
    };
  } else {
    // PROD / PREPROD MODE
    return {
      auction: [
        {
          name: `${process.env.KAFKA_AUCTION_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                connectionTimeout: 500000,
                authenticationTimeout: 500000,
                clientId: configService.get<string>('kafka.auction.topic'),
                brokers: configService
                  .get<string>('kafka.auction.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.auction.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.auction.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.auction.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.auction.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.auction.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.auction.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_AUCTION_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      data_store: [
        {
          name: `${process.env.KAFKA_DATA_STORE_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                connectionTimeout: 500000,
                authenticationTimeout: 500000,
                clientId: configService.get<string>('kafka.data_store.topic'),
                brokers: configService
                  .get<string>('kafka.data_store.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.data_store.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.data_store.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.data_store.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.data_store.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.data_store.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.data_store.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DATA_STORE_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      location: [
        {
          name: `${process.env.KAFKA_LOCATION_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => {
            return {
              options: {
                client: {
                  clientId: configService.get<string>('kafka.location.topic'),
                  brokers: configService
                    .get<string>('kafka.location.broker')
                    .split(' '),
                  ssl: {
                    secureProtocol: configService.get<string>(
                      'kafka.location.ssl.protocol',
                    ),
                    rejectUnauthorized: false,
                    cert: fs.readFileSync(
                      configService.get<string>('kafka.location.ssl.ca'),
                    ),
                    passphrase: configService.get<string>(
                      'kafka.location.ssl.passphrase',
                    ),
                  },
                  sasl: {
                    mechanism: 'scram-sha-512',
                    username: configService.get<string>(
                      'kafka.location.sasl.username',
                    ),
                    password: configService.get<string>(
                      'kafka.location.sasl.password',
                    ),
                  },
                },
                consumer: {
                  groupId: configService.get<string>(
                    'kafka.location.cons_group',
                  ),
                },
                producer: {
                  createPartitioner: Partitioners.LegacyPartitioner,
                },
                producerOnlyMode: true,
                send: {
                  acks: parseInt(process.env.KAFKA_LOCATION_ACK ?? '-1'),
                },
              },
            };
          },
        },
      ],
      batch: [
        {
          name: `${process.env.KAFKA_BATCH_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                connectionTimeout: 500000,
                authenticationTimeout: 500000,
                clientId: configService.get<string>('kafka.batch.topic'),
                brokers: configService
                  .get<string>('kafka.batch.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.batch.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.batch.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.batch.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.batch.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.batch.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.batch.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_BATCH_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      inject_point: [
        {
          name: `${process.env.KAFKA_INJECT_POINT_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.inject_point.topic'),
                brokers: configService
                  .get<string>('kafka.inject_point.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.inject_point.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.inject_point.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.inject_point.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.inject_point.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.inject_point.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.inject_point.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_INJECT_POINT_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      inject_point_high: [
        {
          name: `${process.env.KAFKA_INJECT_POINT_HIGH_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.inject_point_high.topic'),
                brokers: configService
                  .get<string>('kafka.inject_point_high.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.inject_point_high.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.inject_point_high.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.inject_point_high.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.inject_point_high.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.inject_point_high.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.inject_point_high.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_INJECT_POINT_HIGH_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      outbound: [
        {
          name: `${process.env.KAFKA_OUTBOUND_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.outbound.topic'),
                brokers: configService
                  .get<string>('kafka.outbound.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.outbound.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.outbound.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.outbound.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.outbound.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.outbound.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.outbound.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_OUTBOUND_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      inbound: [
        {
          name: `${process.env.KAFKA_INBOUND_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.inbound.topic'),
                brokers: configService
                  .get<string>('kafka.inbound.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.inbound.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.inbound.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.inbound.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.inbound.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.inbound.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.inbound.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_INBOUND_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      merchandise: [
        {
          name: `${process.env.KAFKA_MERCHANDISE_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.merchandise.topic'),
                brokers: configService
                  .get<string>('kafka.merchandise.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.merchandise.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.merchandise.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.merchandise.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.merchandise.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.merchandise.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.merchandise.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_MERCHANDISE_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      inject_coupon: [
        {
          name: `${process.env.KAFKA_INJECT_COUPON_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.inject_coupon.topic',
                ),
                brokers: configService
                  .get<string>('kafka.inject_coupon.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.inject_coupon.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.inject_coupon.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.inject_coupon.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.inject_coupon.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.inject_coupon.sasl.password',
                  ),
                },
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              consumer: {
                groupId: configService.get<string>(
                  'kafka.inject_coupon.cons_group',
                ),
              },
              send: {
                acks: parseInt(process.env.KAFKA_INJECT_COUPON_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      donation: [
        {
          name: `${process.env.KAFKA_DONATION_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.donation.topic'),
                brokers: configService
                  .get<string>('kafka.donation.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.donation.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.donation.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.donation.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.donation.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.donation.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.donation.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DONATION_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      eligibility: [
        {
          name: `${process.env.KAFKA_ELIGIBILITY_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
                SoapConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.eligibility.topic'),
                brokers: configService
                  .get<string>('kafka.eligibility.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.eligibility.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.eligibility.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.eligibility.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.eligibility.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.eligibility.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.eligibility.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_ELIGIBILITY_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      notification: [
        {
          name: `${process.env.KAFKA_NOTIFICATION_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.notification.topic'),
                brokers: configService
                  .get<string>('kafka.notification.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.notification.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.notification.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.notification.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.notification.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.notification.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.notification.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_NOTIFICATION_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      redeem: [
        {
          name: `${process.env.KAFKA_REDEEM_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: `${configService.get<string>(
                  'kafka.redeem.topic',
                )}_producer`,
                brokers: configService
                  .get<string>('kafka.redeem.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.redeem.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.redeem.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.redeem.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.redeem.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.redeem.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.redeem.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_REDEEM_ACK ?? '-1'),
                // compression: CompressionTypes.GZIP,
              },
            },
          }),
        },
      ],
      redeem_fmc: [
        {
          name: `${process.env.KAFKA_REDEEM_FMC_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: `${configService.get<string>(
                  'kafka.redeem_fmc.topic',
                )}_producer`,
                brokers: configService
                  .get<string>('kafka.redeem_fmc.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.redeem_fmc.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.redeem_fmc.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.redeem_fmc.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.redeem_fmc.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.redeem_fmc.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.redeem_fmc.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_REDEEM_FMC_ACK ?? '-1'),
                // compression: CompressionTypes.GZIP,
              },
            },
          }),
        },
      ],
      redeem_high: [
        {
          name: `${process.env.KAFKA_REDEEM_HIGH_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: `${configService.get<string>(
                  'kafka.redeem_high.topic',
                )}_producer`,
                brokers: configService
                  .get<string>('kafka.redeem_high.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.redeem_high.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.redeem_high.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.redeem_high.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.redeem_high.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.redeem_high.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.redeem_high.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_REDEEM_HIGH_ACK ?? '-1'),
                // compression: CompressionTypes.GZIP,
              },
            },
          }),
        },
      ],
      redeem_low: [
        {
          name: `${process.env.KAFKA_REDEEM_LOW_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: `${configService.get<string>(
                  'kafka.redeem_low.topic',
                )}_producer`,
                brokers: configService
                  .get<string>('kafka.redeem_low.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.redeem_low.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.redeem_low.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.redeem_low.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.redeem_low.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.redeem_low.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.redeem_low.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_REDEEM_LOW_ACK ?? '-1'),
                // compression: CompressionTypes.GZIP,
              },
            },
          }),
        },
      ],
      deduct: [
        {
          name: `${process.env.KAFKA_DEDUCT_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.deduct.topic'),
                brokers: configService
                  .get<string>('kafka.deduct.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.deduct.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.deduct.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.deduct.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.deduct.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.deduct.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.deduct.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DEDUCT_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      deduct_high: [
        {
          name: `${process.env.KAFKA_DEDUCT_HIGH_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.deduct_high.topic'),
                brokers: configService
                  .get<string>('kafka.deduct_high.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.deduct_high.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.deduct_high.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.deduct_high.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.deduct_high.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.deduct_high.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.deduct_high.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DEDUCT_HIGH_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      deduct_low: [
        {
          name: `${process.env.KAFKA_DEDUCT_LOW_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.deduct_low.topic'),
                brokers: configService
                  .get<string>('kafka.deduct_low.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.deduct_low.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.deduct_low.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.deduct_low.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.deduct_low.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.deduct_low.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.deduct_low.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DEDUCT_LOW_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      coupon: [
        {
          name: `${process.env.KAFKA_COUPON_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.coupon.topic'),
                brokers: configService
                  .get<string>('kafka.coupon.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.coupon.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.coupon.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.coupon.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.coupon.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.coupon.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.coupon.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_COUPON_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      coupon_high: [
        {
          name: `${process.env.KAFKA_COUPON_HIGH_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.coupon_high.topic'),
                brokers: configService
                  .get<string>('kafka.coupon_high.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.coupon_high.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.coupon_high.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.coupon_high.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.coupon_high.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.coupon_high.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.coupon_high.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_COUPON_HIGH_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      coupon_low: [
        {
          name: `${process.env.KAFKA_COUPON_LOW_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.coupon_low.topic'),
                brokers: configService
                  .get<string>('kafka.coupon_low.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.coupon_low.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.coupon_low.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.coupon_low.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.coupon_low.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.coupon_low.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.coupon_low.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_COUPON_LOW_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      void: [
        {
          name: `${process.env.KAFKA_VOID_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.void.topic'),
                brokers: configService
                  .get<string>('kafka.void.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.void.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.void.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.void.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.void.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.void.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.void.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_VOID_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      voucher: [
        {
          name: `${process.env.KAFKA_VOUCHER_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.voucher.topic'),
                brokers: configService
                  .get<string>('kafka.voucher.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.voucher.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.voucher.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.voucher.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.voucher.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.voucher.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.voucher.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_VOUCHER_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      transaction_master: [
        {
          name: `${process.env.KAFKA_TRANSACTION_MASTER_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.transaction_master.topic',
                ),
                brokers: configService
                  .get<string>('kafka.transaction_master.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.transaction_master.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>(
                      'kafka.transaction_master.ssl.ca',
                    ),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.transaction_master.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.transaction_master.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.transaction_master.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.transaction_master.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_TRANSACTION_MASTER_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      refund: [
        {
          name: `${process.env.KAFKA_REFUND_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.refund.topic'),
                brokers: configService
                  .get<string>('kafka.refund.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.refund.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.refund.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.refund.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.refund.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.refund.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.refund.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_REFUND_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      sftp: [
        {
          name: `${process.env.KAFKA_SFTP_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.sftp.topic'),
                brokers: configService
                  .get<string>('kafka.sftp.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.sftp.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.sftp.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.sftp.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.sftp.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.sftp.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.sftp.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_SFTP_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      sftp_outgoing: [
        {
          name: `${process.env.KAFKA_SFTP_OUTGOING_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.sftp_outgoing.topic',
                ),
                brokers: configService
                  .get<string>('kafka.sftp_outgoing.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.sftp_outgoing.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.sftp_outgoing.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.sftp_outgoing.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.sftp_outgoing.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.sftp_outgoing.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.sftp_outgoing.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_SFTP_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      sftp_incoming: [
        {
          name: `${process.env.KAFKA_SFTP_INCOMING_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.sftp_incoming.topic',
                ),
                brokers: configService
                  .get<string>('kafka.sftp_incoming.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.sftp_incoming.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.sftp_incoming.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.sftp_incoming.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.sftp_incoming.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.sftp_incoming.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.sftp_incoming.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_SFTP_INCOMING_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      sftp_incoming_batch_process: [
        {
          name: `${process.env.KAFKA_SFTP_INCOMING_BATCH_PROCESS_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.sftp_incoming_batch_process.topic',
                ),
                brokers: configService
                  .get<string>('kafka.sftp_incoming_batch_process.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.sftp_incoming_batch_process.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>(
                      'kafka.sftp_incoming_batch_process.ssl.ca',
                    ),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.sftp_incoming_batch_process.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.sftp_incoming_batch_process.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.sftp_incoming_batch_process.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.sftp_incoming_batch_process.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_SFTP_INCOMING_BATCH_PROCESS_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      cron: [
        {
          name: `${process.env.KAFKA_CRON_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                process.env.NODE_ENV == undefined ||
                process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.cron.topic'),
                brokers: configService
                  .get<string>('kafka.cron.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.cron.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.cron.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.cron.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.cron.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.cron.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.cron.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_CRON_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      reporting_statistic: [
        {
          name: `${process.env.KAFKA_REPORTING_STATISTIC_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                process.env.NODE_ENV == undefined ||
                process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.reporting_statistic.topic',
                ),
                brokers: configService
                  .get<string>('kafka.reporting.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.reporting_statistic.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>(
                      'kafka.reporting_statistic.ssl.ca',
                    ),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.reporting_statistic.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.reporting_statistic.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.reporting_statistic.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.reporting_statistic.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_REPORTING_STATISTIC_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      reporting_point_event: [
        {
          name: `${process.env.KAFKA_REPORTING_POINT_EVENT_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                process.env.NODE_ENV == undefined ||
                process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.reporting_point_event.topic',
                ),
                brokers: [
                  configService.get<string>(
                    'kafka.reporting_point_event.broker',
                  ),
                ],
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.reporting_point_event.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>(
                      'kafka.reporting_point_event.ssl.ca',
                    ),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.reporting_point_event.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.reporting_point_event.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.reporting_point_event.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.reporting_point_event.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_REPORTING_POINT_EVENT_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      reporting_generation: [
        {
          name: `${process.env.KAFKA_REPORTING_GENERATION_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                process.env.NODE_ENV == undefined ||
                process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.reporting_generation.topic',
                ),
                brokers: configService
                  .get<string>('kafka.reporting_generation.broker')
                  ?.split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.reporting_generation.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>(
                      'kafka.reporting_generation.ssl.ca',
                    ),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.reporting_generation.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.reporting_generation.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.reporting_generation.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.reporting_generation.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_REPORTING_GENERATION_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      reporting_generation_recovery: [
        {
          name: `${process.env.KAFKA_REPORTING_GENERATION_RECOVERY_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.reporting_generation_recovery.topic',
                ),
                brokers: configService
                  .get<string>('kafka.reporting_generation_recovery.broker')
                  ?.split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.reporting_generation_recovery.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>(
                      'kafka.reporting_generation_recovery.ssl.ca',
                    ),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.reporting_generation_recovery.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.reporting_generation_recovery.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.reporting_generation_recovery.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.reporting_generation_recovery.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_REPORTING_GENERATION_RECOVERY_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      postpaid_granular: [
        {
          name: `${process.env.KAFKA_POSTPAID_GRANULAR_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                process.env.NODE_ENV == undefined ||
                process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              subscribe: {
                fromBeginning: true,
              },
              client: {
                clientId: configService.get<string>(
                  'kafka.postpaid_granular.topic',
                ),
                brokers: configService
                  .get<string>('kafka.postpaid_granular.broker')
                  ?.split(' '),
                ssl: {
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.postpaid_granular.ssl.ca'),
                  ),
                },
                sasl: {
                  mechanism: 'plain',
                  username: configService.get<string>(
                    'kafka.postpaid_granular.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.postpaid_granular.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.postpaid_granular.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_POSTPAID_GRANULAR_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      prepaid_granular: [
        {
          name: `${process.env.KAFKA_PREPAID_GRANULAR_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                process.env.NODE_ENV == undefined ||
                process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              subscribe: {
                fromBeginning: true,
              },
              client: {
                clientId: configService.get<string>(
                  'kafka.prepaid_granular.topic',
                ),
                brokers: configService
                  .get<string>('kafka.prepaid_granular.broker')
                  ?.split(' '),
                ssl: {
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.prepaid_granular.ssl.ca'),
                  ),
                },
                sasl: {
                  mechanism: 'plain',
                  username: configService.get<string>(
                    'kafka.prepaid_granular.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.prepaid_granular.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.prepaid_granular.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_PREPAID_GRANULAR_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      notification_general: [
        {
          name: `${process.env.KAFKA_NOTIFICATION_GENERAL_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV ||
                process.env.NODE_ENV === 'development' ||
                process.env.NODE_ENV === ''
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.notification_general.topic',
                ),
                brokers: configService
                  .get<string>('kafka.notification_general.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.notification_general.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>(
                      'kafka.notification_general.ssl.ca',
                    ),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.notification_general.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.notification_general.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.notification_general.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.notification_general.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_NOTIFICATION_GENERAL_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      data_sync: [
        {
          name: `${process.env.KAFKA_DATA_SYNC_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                process.env.NODE_ENV == undefined ||
                process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.data_sync.topic'),
                brokers: configService
                  .get<string>('kafka.data_sync.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.data_sync.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.data_sync.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.data_sync.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.data_sync.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.data_sync.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.data_sync.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_DATA_SYNC_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      manual_redeem_google: [
        {
          name: `${process.env.KAFKA_MANUAL_REDEEM_GOOGLE_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.manual_redeem_google.topic',
                ),
                brokers: configService
                  .get<string>('kafka.manual_redeem_google.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.manual_redeem_google.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>(
                      'kafka.manual_redeem_google.ssl.ca',
                    ),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.manual_redeem_google.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.manual_redeem_google.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.manual_redeem_google.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.manual_redeem_google.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(
                  process.env.KAFKA_MANUAL_REDEEM_GOOGLE_ACK ?? '-1',
                ),
              },
            },
          }),
        },
      ],
      manual_redeem: [
        {
          name: `${process.env.KAFKA_MANUAL_REDEEM_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.manual_redeem.topic',
                ),
                brokers: configService
                  .get<string>('kafka.manual_redeem.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.manual_redeem.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.manual_redeem.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.manual_redeem.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.manual_redeem.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.manual_redeem.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.manual_redeem.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_MANUAL_REDEEM_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      manual_process: [
        {
          name: `${process.env.KAFKA_MANUAL_PROCESS_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>(
                  'kafka.manual_process.topic',
                ),
                brokers: configService
                  .get<string>('kafka.manual_process.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.manual_process.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.manual_process.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.manual_process.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.manual_process.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.manual_process.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.manual_process.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_MANUAL_PROCESS_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      callback: [
        {
          name: `${process.env.KAFKA_CALLBACK_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.callback.topic'),
                brokers: configService
                  .get<string>('kafka.callback.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.callback.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.callback.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.callback.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.callback.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.callback.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.callback.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_CALLBACK_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      campaign: [
        {
          name: `${process.env.KAFKA_CAMPAIGN_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.campaign.topic'),
                brokers: configService
                  .get<string>('kafka.campaign.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.campaign.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.campaign.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.campaign.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.campaign.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.campaign.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.campaign.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_CAMPAIGN_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      vote: [
        {
          name: `${process.env.KAFKA_VOTE_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.vote.topic'),
                brokers: configService
                  .get<string>('kafka.vote.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.vote.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.vote.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.vote.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.vote.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.vote.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>('kafka.vote.cons_group'),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_VOTE_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
      multi_bonus: [
        {
          name: `${process.env.KAFKA_MULTI_BONUS_SERVICE}_PRODUCER`,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/env/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [
                Environtment,
                ApplicationConfig,
                MongoConfig,
                RedisConfig,
                CoreBackendConfig,
                KafkaConfig,
              ],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService,
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.multi_bonus.topic'),
                brokers: configService
                  .get<string>('kafka.multi_bonus.broker')
                  .split(' '),
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.multi_bonus.ssl.protocol',
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.multi_bonus.ssl.ca'),
                  ),
                  passphrase: configService.get<string>(
                    'kafka.multi_bonus.ssl.passphrase',
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.multi_bonus.sasl.username',
                  ),
                  password: configService.get<string>(
                    'kafka.multi_bonus.sasl.password',
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.multi_bonus.cons_group',
                ),
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
              send: {
                acks: parseInt(process.env.KAFKA_MULTI_BONUS_ACK ?? '-1'),
              },
            },
          }),
        },
      ],
    };
  }
};

export const KafkaConnProducer = KafkaConnCoorProd(devMode);
