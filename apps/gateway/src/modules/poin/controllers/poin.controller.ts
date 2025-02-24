import {
  Body,
  Controller,
  Get,
  Post,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiTags } from '@nestjs/swagger';

import { InjectCoupon } from '@/coupon/models/inject.coupon.model';
import { CouponService } from '@/coupon/services/coupon.service';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { GlobalResponse } from '@/dtos/response.dto';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

@Controller('')
@ApiTags('AA - Coupon Management & Transaction')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class POINController {
  constructor(private couponService: CouponService) {
    //
  }
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Inject Coupon',
    description: `This API used to inject coupon to subscriber based on defined keyword. This function keyword, generally will corelated to redemption rule to get how much point will be deducted injected coupon, but for this case, there’s no point will be deducted.`,
  })
  @Version('1')
  @Post('coupon')
  async coupon_inject(
    @Body() data: InjectCoupon,
    @CredentialAccount() account,
  ): Promise<GlobalResponse> {
    return await this.couponService.inject_coupon(data, account);
  }
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'View Coupon List',
    description: `This API used to get coupon for specific subscriber.`,
  })
  @Version('1')
  @Get(':msisdn/coupon')
  async coupon_list(
    @Body() data: InjectCoupon,
    @CredentialAccount() account,
  ): Promise<GlobalResponse> {
    return await this.couponService.inject_coupon(data, account);
  }
}
