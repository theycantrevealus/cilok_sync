import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { HttpStatusTransaction } from '@/dtos/http.status.transaction.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import {
  ApiParamTransaction,
  ApiQueryTransaction,
} from '@/transaction/dtos/transaction.property.dto';
import { ApiResponseInjectWhitelist } from '@/transaction/dtos/whitelist/inject/inject.whitelist.property.dto';
import {
  WhitelistCounterParamDTO,
  WhitelistCounterQueryDTO,
} from '@/transaction/dtos/whitelist/whitelist.dto';
import { ApiOperationWhitelist } from '@/transaction/dtos/whitelist/whitelist.property.dto';
import { InjectWhitelist } from '@/transaction/models/whitelist/inject.whitelist.model';
import { WhitelistService } from '@/transaction/services/whitelist/whitelist.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class WhitelistController {
  constructor(private whitelistService: WhitelistService) {
    //
  }

  /* Whitelist Inject  */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationWhitelist.inject)
  @ApiResponse(ApiResponseInjectWhitelist.R201)
  @ApiResponse(ApiResponseInjectWhitelist.R400)
  @ApiResponse(ApiResponseInjectWhitelist.R401)
  @ApiResponse(ApiResponseInjectWhitelist.R403)
  @ApiResponse(ApiResponseInjectWhitelist.R404)
  @ApiResponse(ApiResponseInjectWhitelist.R405)
  @ApiResponse(ApiResponseInjectWhitelist.R422)
  @ApiResponse(ApiResponseInjectWhitelist.R424)
  @ApiResponse(ApiResponseInjectWhitelist.R500)
  @Version('1')
  @Post('whitelist/inject')
  @HttpCode(200)
  async whitelist_inject(
    @Body() data: InjectWhitelist,
    @CredentialAccount() account,
  ): Promise<GlobalTransactionResponse> {
    return await this.whitelistService.whitelist_inject(data, account);
  }

  /* Whitelist Counter */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationWhitelist.counter)
  @ApiParam(ApiParamTransaction.msisdn)
  @ApiQuery(ApiQueryTransaction.additional_param)
  @ApiQuery(ApiQueryTransaction.filter)
  @ApiQuery(ApiQueryTransaction.channel_id)
  @ApiQuery(ApiQueryTransaction.transaction_id)
  @ApiQuery(ApiQueryTransaction.keyword)
  @ApiQuery(ApiQueryTransaction.program_id)
  @ApiQuery(ApiQueryTransaction.locale)
  @Version('1')
  @Get(':msisdn/whitelist-counter')
  async whitelist_counter(
    @Param() param: WhitelistCounterParamDTO,
    @Query() query: WhitelistCounterQueryDTO,
  ) {
    return await this.whitelistService.whitelist_counter(param, query);
  }
}
