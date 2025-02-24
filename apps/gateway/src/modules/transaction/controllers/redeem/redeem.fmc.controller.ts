import {
  BadRequestException,
  Body,
  CacheInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { ApiOperationRedeem } from '@/transaction/dtos/redeem/redeem.property.dto';

import { validateCustomerIdentifierWithoutType } from '../../../application/utils/Msisdn/formatter';
import { RedeemFmcDTO } from '../../dtos/redeem/redeem.fmc.dto';
import { RedeemFmcService } from '../../services/redeem/redeem.fmc.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(RequestValidatorFilterCustom)
export class RedeemFmcController {
  constructor(
    @Inject(RedeemFmcService) private redeemService: RedeemFmcService,
  ) {}

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @UseInterceptors(CacheInterceptor)
  @ApiOAuth2(['oauth2'])
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation(ApiOperationRedeem.redeem)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('2')
  @Post('redeem')
  redeem_kafka(
    @Body() data: RedeemFmcDTO,
    @CredentialAccount() account,
    @Req() req: FastifyRequest,
  ) {
    // check identifier format, is msisdn/indihome number
    const identifierCheck = validateCustomerIdentifierWithoutType(data.msisdn);
    if (!identifierCheck.isValid) {
      throw new BadRequestException([
        { isInvalidDataContent: identifierCheck.message },
      ]);
    }

    if (data?.keyword) {
      data.keyword = data.keyword.toUpperCase();
      console.log('Keyword uppercase: ', data.keyword);
    }

    // override locale
    data.locale = 'id-ID';

    // keyword format checking
    const keywordFromBody = data.keyword.trim().split('-'); // pisahkan dengan strip
    if (keywordFromBody.length >= 3) {
      throw new BadRequestException([
        { isInvalidDataContent: 'Keyword parameter format is wrong!' },
      ]);
    }

    if (keywordFromBody.length == 2 && keywordFromBody[0] != 'YA') {
      data.total_redeem = Number(keywordFromBody[1]);
    }

    // set trx_source if not exist
    if (!data?.transaction_source) {
      data.transaction_source = 'api_v2';
    }

    return this.redeemService.redeemV2(
      data,
      account,
      req.headers.authorization,
      req.url,
    );
  }
}
