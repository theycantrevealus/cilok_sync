import { Test, TestingModule } from '@nestjs/testing';

import { ProvPrepaidController } from './prov_prepaid.controller';
import { ProvPrepaidService } from './prov_prepaid.service';

describe('ProvPrepaidController', () => {
  let provPrepaidController: ProvPrepaidController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ProvPrepaidController],
      providers: [ProvPrepaidService],
    }).compile();

    provPrepaidController = app.get<ProvPrepaidController>(
      ProvPrepaidController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(provPrepaidController.getHello()).toBe('Hello World!');
    });
  });
});
