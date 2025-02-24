import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Authorization } from '@/decorators/auth.decorator';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import {
  MyEauctionParamDTO,
  MyEauctionQueryDTO,
  RegistrationStatusEauctionParamDTO,
  RegistrationStatusQueryDTO,
  TopBidderPerKeywordEauctionParamDTO,
  TopBidderPerKeywordQueryDTO,
  TotalBidderPerKeywordEauctionParamDTO,
  TotalBidderPerKeywordQueryDTO,
} from '@/transaction/dtos/eauction/eauction.dto';
import { ApiOperationEauction } from '@/transaction/dtos/eauction/eauction.property.dto';
import {
  ApiParamTransaction,
  ApiQueryTransaction,
} from '@/transaction/dtos/transaction.property.dto';
import { EauctionService } from '@/transaction/services/eauction/eauction.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(RequestValidatorFilterCustom)
export class EauctionController {
  constructor(
    @Inject(EauctionService) private eauctionService: EauctionService,
  ) {
    //
  }

  /* My Auction */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOperation(ApiOperationEauction.auction)
  @ApiQuery(ApiQueryTransaction.locale)
  @ApiParam(ApiParamTransaction.msisdn)
  @ApiQuery(ApiQueryTransaction.limit)
  @ApiQuery(ApiQueryTransaction.skip)
  @ApiQuery(ApiQueryTransaction.transaction_id)
  @ApiQuery(ApiQueryTransaction.channel_id)
  @ApiQuery(ApiQueryTransaction.filter)
  @ApiQuery(ApiQueryTransaction.additional_param)
  @Version('1')
  @Get(':msisdn/auction')
  async my_auction(
    @Param() param: MyEauctionParamDTO,
    @Query() query: MyEauctionQueryDTO,
  ) {
    return await this.eauctionService.my_eauction(param, query);
  }

  /* Total Bidder per Keyword */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationEauction.total_bidder_per_keyword)
  @ApiQuery(ApiQueryTransaction.locale)
  @ApiParam(ApiParamTransaction.keyword)
  @ApiQuery(ApiQueryTransaction.transaction_id)
  @ApiQuery(ApiQueryTransaction.channel_id)
  @ApiQuery(ApiQueryTransaction.filter)
  @ApiQuery(ApiQueryTransaction.additional_param)
  @Version('1')
  @Get(':keyword/eauction/total-bidder')
  async total_bidder_per_keyword(
    @Param() param: TotalBidderPerKeywordEauctionParamDTO,
    @Query() query: TotalBidderPerKeywordQueryDTO,
  ) {
    return await this.eauctionService.total_bidder_per_keyword(param, query);
  }

  /* Registration Status */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOperation(ApiOperationEauction.registration_status)
  @ApiQuery(ApiQueryTransaction.locale)
  @ApiParam(ApiParamTransaction.msisdn)
  @ApiQuery(ApiQueryTransaction.transaction_id)
  @ApiQuery(ApiQueryTransaction.channel_id)
  @ApiQuery(ApiQueryTransaction.filter)
  @ApiQuery(ApiQueryTransaction.additional_param)
  @Version('1')
  @Get(':msisdn/eauction/registration-status')
  async registration_status(
    @Param() param: RegistrationStatusEauctionParamDTO,
    @Query() query: RegistrationStatusQueryDTO,
  ) {
    return await this.eauctionService.registration_status(param, query);
  }

  /* Top Bidder per Keyword */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationEauction.top_bidder_per_keyword)
  @ApiQuery(ApiQueryTransaction.locale)
  @ApiParam(ApiParamTransaction.keyword)
  @ApiQuery(ApiQueryTransaction.transaction_id)
  @ApiQuery(ApiQueryTransaction.channel_id)
  @ApiQuery(ApiQueryTransaction.filter)
  @ApiQuery(ApiQueryTransaction.additional_param)
  @Version('1')
  @Get(':keyword/eauction/top-bidder')
  async top_bidder_per_keyword(
    @Param() param: TopBidderPerKeywordEauctionParamDTO,
    @Query() query: TopBidderPerKeywordQueryDTO,
  ) {
    return await this.eauctionService.top_bidder_per_keyword(param, query);
  }
}
