import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { Kafka } from 'kafkajs';

import { NotificationKafkaService } from './notification_general.service';
import { NotificationLogService } from './services/notification.log.service';
import { SendNotificationGeneralService } from './services/send-notification-general.service';

@Controller()
export class NotificationGeneralController {
  constructor(
    private readonly notificationService: NotificationKafkaService,
    private readonly notificationGeneralService: SendNotificationGeneralService,
    private readonly notificationLogService: NotificationLogService,

    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    // this.setKafka();
  }

  async setKafka() {
    const topic = this.configService.get('kafka.notification.topic');
    const kafka = new Kafka({
      clientId: this.configService.get('kafka.notification.topic'),
      brokers: this.configService.get('kafka.notification.broker').split(' '),
    });
    const consumer = kafka.consumer({
      groupId: this.configService.get<string>('kafka.notification.cons_group'),
    });
    await consumer.connect();
    await consumer.subscribe({
      topic,
      fromBeginning: true,
    });
    await consumer.run({
      partitionsConsumedConcurrently: 1,
      eachMessage: async ({ message }) => {
        const msg = message.value.toString();
        console.log(msg);
      },
    });

    // To move the offset position in a topic/partition
    await consumer.seek({
      offset: '0',
      topic,
      partition: 0,
    });
  }

  @Get()
  getHello(): string {
    return this.notificationService.getHello();
  }
  @MessagePattern(process.env.KAFKA_NOTIFICATION_GENERAL_TOPIC)
  notification_general(@Payload() payload) {
    const start = new Date();

    this.notificationGeneralService
      .send_notification_general(payload)
      .then(async (response) => {
        // TODO
      })
      .catch(async (e: Error) => {
        this.notificationLogService.loggerNotificationError(
          payload,
          start,
          `kafka notification_general Error: ${e?.message}`,
        );
      });
  }
}
