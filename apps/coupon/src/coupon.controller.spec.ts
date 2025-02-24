import { Test, TestingModule } from '@nestjs/testing';
import { CouponController } from './coupon.controller';
import { KafkaCouponService } from './coupon.service';

describe('CouponController', () => {
  let couponController: CouponController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CouponController],
      providers: [KafkaCouponService],
    }).compile();

    couponController = app.get<CouponController>(CouponController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(couponController.getHello()).toBe('Hello World!');
    });
  });
});
