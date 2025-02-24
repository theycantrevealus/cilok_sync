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
import { ApiOAuth2, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Authorization } from '@/decorators/auth.decorator';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { ApiOperationKeyword } from '@/transaction/dtos/keyword/keyword.property.dto';
import {
  KeywordStatusParamDTO,
  KeywordStatusQueryDTO,
} from '@/transaction/dtos/keyword/keyword.status.property.dto';
import { KeywordStockParamDTO } from '@/transaction/dtos/keyword/keyword.stock.dto';
import { TransKeywordService } from '@/transaction/services/keyword/keyword.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(RequestValidatorFilterCustom)
export class KeywordController {
  constructor(
    @Inject(TransKeywordService)
    private transKeywordService: TransKeywordService,
  ) {
    //
  }

  // @UseGuards(OAuth2Guard)
  // @ApiOAuth2(['oauth2'])
  // @Authorization(true)
  // @ApiOperation(ApiOperationKeyword.status)
  // @ApiQuery(ApiQueryKeyword.additional_param)
  // @ApiQuery(ApiQueryKeyword.filter)
  // @ApiQuery(ApiQueryKeyword.channel_id)
  // @ApiQuery(ApiQueryKeyword.transaction_id)
  // @ApiQuery(ApiQueryKeyword.keyword)
  // @ApiQuery(ApiQueryKeyword.locale)
  // @Version('1')
  // @Get(':keyword/status')
  // async whitelist_counter(): //
  // Promise<GlobalTransactionResponse> {
  //   const response = new GlobalTransactionResponse();
  //   response.code = HttpStatusTransaction.CODE_SUCCESS;
  //   response.message = 'Success';
  //   response.transaction_classify = 'KEYWORD_STATUS';
  //   response.payload = {
  //     keyword_status: 1,
  //   };
  //   return response;
  // }

  /* Keyword Status  */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationKeyword.status)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Get(':keyword/status')
  async keyword_status(
    @Param() param: KeywordStatusParamDTO,
    @Query() query: KeywordStatusQueryDTO,
  ): //
  Promise<GlobalTransactionResponse> {
    return await this.transKeywordService.keyword_status(param, query);
  }

  /* Keyword Stock  */
  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationKeyword.status)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Get('keyword/stock')
  async keyword_stock(@Query() param: KeywordStockParamDTO): //
  Promise<GlobalTransactionResponse> {
    return await this.transKeywordService.keyword_stock(param);
  }

  /* Keyword Stock  */
  @UseGuards(OAuth2Guard)
  @Authorization(false)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationKeyword.stock)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Get(':keyword/stock')
  async keyword_stock_redis(
    @Param() param: KeywordStatusParamDTO,
    @Query() query: KeywordStockParamDTO,
  ): //
  Promise<GlobalTransactionResponse> {
    return await this.transKeywordService.keyword_stock_redis(param, query);
  }
}
