import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ApiOAuth2, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import {
  RequestValidatorFilter,
  RequestValidatorFilterCustom,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import {
  ViewCouponParamDTO,
  ViewCouponQueryDTO,
} from '@/transaction/dtos/coupon/view.coupon.list.property.dto';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { InjectCoupon } from '@/transaction/models/inject.coupon.model';
import { CouponService } from '@/transaction/services/coupon/coupon.service';
import { Coupon2Service } from '@/transaction/services/coupon/coupon2.service';

@Controller('')
@ApiTags('AA - Coupon Management & Transaction')
@UseFilters(RequestValidatorFilterCustom)
export class CouponController {
  constructor(
    @Inject(Coupon2Service) private coupon2Service: Coupon2Service,
    @Inject(CouponService) private couponService: CouponService,
  ) {
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
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Post('coupon/inject')
  @HttpCode(202)
  async coupon_inject(
    @Body() data: InjectCoupon,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<any> {
    return await this.coupon2Service.inject_coupon_simple(
      data,
      account,
      req.headers.authorization,
      req.url,
    );
    // .catch((e) => {
    // throw new BadRequestException(e.message);
    // });
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation({
    summary: 'View Coupon List',
    description: `This API used to get coupon for specific subscriber.`,
  })
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Get(':msisdn/coupon')
  async coupon_list(
    @Param() param: ViewCouponParamDTO,
    @Query() query: ViewCouponQueryDTO,
  ): Promise<GlobalTransactionResponse> {
    return await this.couponService.couponEnhancement(param, query);
  }
}
