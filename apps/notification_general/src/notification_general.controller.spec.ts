import { Test, TestingModule } from '@nestjs/testing';

import { NotificationGeneralController } from './notification_general.controller';
import { NotificationKafkaService } from './notification_general.service';

describe('NotificationController', () => {
  let notificationController: NotificationGeneralController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [NotificationGeneralController],
      providers: [NotificationKafkaService],
    }).compile();

    notificationController = app.get<NotificationGeneralController>(
      NotificationGeneralController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(notificationController.getHello()).toBe('Hello World!');
    });
  });
});
