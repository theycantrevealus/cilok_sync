import { Test, TestingModule } from '@nestjs/testing';

import { DataSyncController } from './data-sync.controller';
import { DataSyncService } from './data-sync.service';

describe('DataSyncController', () => {
  let dataSyncController: DataSyncController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DataSyncController],
      providers: [DataSyncService],
    }).compile();

    dataSyncController = app.get<DataSyncController>(DataSyncController);
  });

  // describe('root', () => {
  //   it('should return "Hello World!"', () => {
  //     expect(dataSyncController.getHello()).toBe('Hello World!');
  //   });
  // });
});
