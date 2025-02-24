import { isJson } from '@/application/utils/JSON/json';
import { Authorization } from '@/decorators/auth.decorator';
import { ApiOperationExample, ApiQueryExample } from '@/dtos/property.dto';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { InjectCouponSummary } from '@/transaction/models/inject-coupon-summary.model';
import { Controller, Get, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiOAuth2, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { RemedyToolsService } from '../service/remedy.tools.service';
import { InjectCoupon } from '@/transaction/models/inject.coupon.model';

@ApiTags('Remedy Tools')
@Controller({ path: 'remedy-tools', version: '2' })
@UseFilters(RequestValidatorFilterCustom)
export class RemedyToolsVersion2Controller {
  constructor(
    @InjectModel(InjectCouponSummary.name, 'reporting')
    private couponSummary: Model<InjectCouponSummary>,

    @InjectModel(InjectCoupon.name)
    private coupon: Model<InjectCoupon>,

    private remedyToolsService: RemedyToolsService,
  ) {}

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('coupon_log_prime')
  async couponPrime(@Query('lazyEvent') parameter: string, @Req() req) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      delete parsedData.filters.identifier;

      const param = {
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        model: null,
        auth: req.headers.authorization,
      }

      console.log(parsedData);
      return await this.remedyToolsService.getCutofftoSummaryData({
        param, model_coupon: this.coupon, model_coupon_summary: this.couponSummary
      });
      
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }
}
