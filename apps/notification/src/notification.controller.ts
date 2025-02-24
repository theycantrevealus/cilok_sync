import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { Kafka } from 'kafkajs';

import { NotificationKafkaService } from './notification.service';
import { NotificationLogService } from './services/notification.log.service';
// import { SendNotificationGeneralService } from './services/send-notification-general.service';

@Controller()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationKafkaService,
    // private readonly notificationGeneralService: SendNotificationGeneralService,
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

  @MessagePattern(process.env.KAFKA_NOTIFICATION_TOPIC)
  notification_transaction(payload: any) {
    const start = new Date();

    try {
      const origin = payload.origin.split('.');

      const nonTrxMaster = ['cron', 'subs_profile'];
      console.log('nonTrxMaster', !nonTrxMaster.includes(origin[0]));
      if (!nonTrxMaster.includes(origin[0])) {
        // send payload to transaction_master
        console.log('Notification task received');

        // === MODIFIED BY MULTIBONUS, 2024-08-02 ===
        // this.notificationService.send_transaction_master(payload);

        let emitToTrxMaster = true;
        const currentTrxId = payload?.tracing_master_id;
        const parentTrxId =
          payload?.incoming?.additional_param?.parent_transaction_id;

        const bonusFlexibility = payload?.keyword?.bonus?.[0]?.flexibility;

        // parent trx detected? this is child trx
        if (parentTrxId) {
          // from inject_coupon API && bonus flexibility is Flexible?
          if (origin[0] == 'inject_coupon' && bonusFlexibility == 'Flexible') {
            emitToTrxMaster = false;
          }
        }

        console.log(
          currentTrxId,
          parentTrxId,
          bonusFlexibility,
          emitToTrxMaster,
        );

        // emitToTrxMaster = true;
        if (emitToTrxMaster) {
          this.notificationService.send_transaction_master(payload);
        }
        // === END MODIFIED BY MULTIBONUS, 2024-08-02 ===
      }

      // TODO : CHECK REQUIRED PARAMETER TERLEBIH DAHULU
      this.notificationService
        .notification_process(payload)
        .then(async (response) => {
          // TODO
        })
        .catch(async (e: Error) => {
          await this.notificationLogService.loggerNotificationError(
            payload,
            start,
            `notification_process Error: ${e?.message}`,
          );
        });
    } catch (e) {
      this.notificationLogService.loggerNotificationError(
        payload,
        start,
        `kafka notification_transaction Error: ${e?.message}`,
        e?.trace,
      );
    }
  }

  // @MessagePattern('notification-general')
  // notification_general(@Payload() payload) {
  //   const start = new Date();

  //   this.notificationGeneralService
  //     .send_notification_general(payload)
  //     .then(async (response) => {
  //       // TODO
  //     })
  //     .catch(async (e: Error) => {
  //       this.notificationLogService.loggerNotificationError(
  //         payload,
  //         start,
  //         `kafka notification_general Error: ${e?.message}`,
  //       );
  //     });
  // }
}
