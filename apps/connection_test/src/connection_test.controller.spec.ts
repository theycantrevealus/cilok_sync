import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionTestController } from './connection_test.controller';
import { ConnectionTestService } from './connection_test.service';

describe('ConnectionTestController', () => {
  let connectionTestController: ConnectionTestController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ConnectionTestController],
      providers: [ConnectionTestService],
    }).compile();

    connectionTestController = app.get<ConnectionTestController>(ConnectionTestController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(connectionTestController.getHello()).toBe('Hello World!');
    });
  });
});
