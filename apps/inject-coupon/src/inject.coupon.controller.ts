import {Controller, Get, Logger, Req} from '@nestjs/common'
import {MessagePattern} from '@nestjs/microservices'
import {InjectCouponService} from "./inject.coupon.service"

@Controller()
export class InjectCouponController {
  constructor(private readonly injectCouponService: InjectCouponService) {
  }

  @MessagePattern('inject_coupon')
  injectPoint(payload: any, @Req() request): any {
    return this.injectCouponService.process(payload, request.clientIp)
      .then((res) => {
        if (res.code == 200) Logger.log('SUCCESS', res)
        else Logger.log('NOT PROCESS', res)
      })
      .catch((e) => Logger.log('ERROR/CATCH', e));
  }
}
