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
import { ApiOAuth2, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import {
  AllExceptionsFilter,
  RequestValidatorFilterCustom,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { VerificationVoucherDTO } from '@/transaction/dtos/voucher/verification/verification.voucher.dto';
import { ApiOperationVoucher } from '@/transaction/dtos/voucher/voucher.property.dto';
import {
  VoucherListFMCParamDTO,
  VoucherListFMCQueryDTO,
} from '@/transaction/dtos/voucher/voucher-list.fmc.dto';
import { VoucherFmcService } from '@/transaction/services/voucher/voucher.fmc.service';

@Controller('')
@ApiTags('[FMC] Transaction')
@UseFilters(RequestValidatorFilterCustom)
@UseFilters(AllExceptionsFilter)
export class VoucherFmcController {
  constructor(private voucherService: VoucherFmcService) {}

  /* Voucher List */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'View Voucher List',
  })
  @Version('2')
  @Get(':msisdn/voucher')
  async voucher_list(
    @Param() param: VoucherListFMCParamDTO,
    @Query() query: VoucherListFMCQueryDTO,
    @Req() request,
  ) {
    const token = request.headers.authorization;
    return await this.voucherService.voucher_list(param, query, token);
  }

  /* Voucher Verification  */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationVoucher.verification)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Post('voucher/verification')
  @HttpCode(200)
  @Version('2')
  async voucher_verification(
    @Body() data: VerificationVoucherDTO,
    @CredentialAccount() account,
    @Req() req,
  ) {
    return await this.voucherService.voucher_verification(
      data,
      account,
      req.headers.authorization,
      req.url,
    );
  }
}
