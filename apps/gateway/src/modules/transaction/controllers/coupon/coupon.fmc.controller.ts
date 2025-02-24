import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Authorization } from '@/decorators/auth.decorator';
import { GlobalTransactionResponse } from '@/dtos/global.response.transaction.dto';
import {
  AllExceptionsFilter,
  RequestValidatorFilterCustom,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import {
  ViewCouponFMCParamDTO,
  ViewCouponFMCQueryDTO,
} from '@/transaction/dtos/coupon/view.coupon.list.fmc.property.dto';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { CouponFmcService } from '@/transaction/services/coupon/coupon.fmc.service';

@Controller('')
@ApiTags('[FMC] Transaction')
@UseFilters(RequestValidatorFilterCustom)
@UseFilters(AllExceptionsFilter)
export class CouponFmcController {
  constructor(
    @Inject(CouponFmcService) private couponService: CouponFmcService,
  ) {
    //
  }

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
  @Version('2')
  @Get(':msisdn/coupon')
  async coupon_list(
    @Param() param: ViewCouponFMCParamDTO,
    @Query() query: ViewCouponFMCQueryDTO,
    @Req() request
  ): Promise<GlobalTransactionResponse> {
    const token =  request.headers.authorization;
    return await this.couponService.cuoponListv3(param, query, token);
  }
}
