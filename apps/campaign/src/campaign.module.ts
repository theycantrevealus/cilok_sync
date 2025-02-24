import ApplicationConfig from '@configs/application.config';
import { Environtment } from '@configs/environtment';
import EsbBackendConfig from '@configs/esb-backend.config';
import { KafkaConn } from '@configs/kafka/connection';
import MongoConfig from '@configs/mongo.config';
import SmsBackendConfig from '@configs/sms.config';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';

import { SmsIntegrationService } from '@/application/integrations/sms.integration';
import {
  SystemConfig,
  SystemConfigSchema,
} from '@/application/models/system.config.model';
import { CallApiConfigService } from '@/application/services/call-api-config.service';
import {
  CampaignBroadcastSchedule,
  CampaignBroadcastScheduleSchema,
} from '@/campaign/models/campaign.broadcast.schedule.model';
import {
  CampaignNotificationLog,
  CampaignNotificationLogSchema,
} from '@/campaign/models/campaign.notification.log.model';
import {
  CampaignRecipient,
  CampaignRecipientSchema,
} from '@/campaign/models/campaign.recipient.model';
import { EsbInboxIntegration } from '@/esb/integration/esb.inbox.integration';
import { EsbNotificationIntegration } from '@/esb/integration/esb.notification.integration';
import { EsbInboxService } from '@/esb/services/esb.inbox.service';
import { EsbNotificationService } from '@/esb/services/esb.notification.service';

import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { CampaignEngineService } from './service/campaign.engine.service';
import { CampaignNotificationService } from './service/campaign.notification.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/env/${
        process.env.NODE_ENV === 'development' ? '' : process.env.NODE_ENV
      }.env`,
      load: [
        Environtment,
        MongoConfig,
        ApplicationConfig,
        EsbBackendConfig,
        SmsBackendConfig,
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService,
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.uri'),
        dbName: configService.get<string>('mongo.db-name'),
        user: configService.get<string>('mongo.db-user'),
        pass: configService.get<string>('mongo.db-password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      {
        name: CampaignNotificationLog.name,
        schema: CampaignNotificationLogSchema,
      },
      { name: CampaignRecipient.name, schema: CampaignRecipientSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      {
        name: CampaignBroadcastSchedule.name,
        schema: CampaignBroadcastScheduleSchema,
      },
    ]),
    HttpModule,
    ClientsModule.registerAsync([KafkaConn.campaign[0]]),
  ],
  controllers: [CampaignController],
  providers: [
    CampaignService,
    CampaignEngineService,
    CampaignNotificationService,
    SmsIntegrationService,
    EsbNotificationService,
    EsbInboxService,
    CallApiConfigService,
    EsbNotificationIntegration,
    EsbInboxIntegration,
  ],
})
export class CampaignModule {}
