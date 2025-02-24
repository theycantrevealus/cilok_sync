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
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as moment_tz from 'moment-timezone';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { ApiQueryTransaction as FMCApiQueryTransaction } from '@/dtos/fmc.property.dto';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import { AllExceptionsFilter } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import {
  ViewPointHistoryFMCParamDTO,
  ViewPointHistoryFMCQueryDTO,
} from '@/transaction/dtos/point/point.fmc.dto';
import { ApiOperationPoint } from '@/transaction/dtos/point/point.property.dto';
import { TransferPointDto } from '@/transaction/dtos/point/transfer/transfer.point.dto';
import {
  ApiParamTransaction,
  ApiQueryTransaction,
} from '@/transaction/dtos/transaction.property.dto';
import { FMCInjectPoint } from '@/transaction/models/point/inject.point.fmc.model';
import { InjectPoint } from '@/transaction/models/point/inject.point.model';

import {
  FmcViewPoinParamDTO,
  FmcViewPoinQueryDTO,
} from '../../dtos/point/view_current_balance/fmc.view.poin.balance.property.dto';
import { PointFmcService } from '../../services/point/point.fmc.service';

@Controller('')
@ApiTags('[FMC] Transaction')
@UseFilters(AllExceptionsFilter)
export class PointFmcController {
  constructor(
    @Inject(PointFmcService) private pointFmcService: PointFmcService,
  ) {}

  /* View Current Balance  */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationPoint.view_current_balance)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('2')
  @Get(':identifierId/poin')
  async viewPoin(
    @Param() param: FmcViewPoinParamDTO,
    @Query() query: FmcViewPoinQueryDTO,
    @Req() req,
  ): //
  Promise<GlobalTransactionResponse> {
    const data = await this.pointFmcService.getPoinBalance(
      param.identifierId,
      query,
      req.headers.authorization,
    );
    if (
      data.payload['list_of_point'] &&
      data.payload['list_of_point'].length <= 0
    ) {
      data.payload.list_of_point = [
        {
          total_point: 0,
          expired_date: moment_tz
            .tz('Asia/Jakarta')
            .endOf('year')
            .format('YYYY-MM-DD'),
        },
      ];
    }
    return data;
  }

  /* View Point History */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationPoint.view_point_history)
  @ApiParam(ApiParamTransaction.msisdn)
  @ApiQuery(FMCApiQueryTransaction.identifier)
  @ApiQuery(ApiQueryTransaction.transaction_id)
  @ApiQuery(ApiQueryTransaction.channel_id)
  @ApiQuery(ApiQueryTransaction.limit)
  @ApiQuery(ApiQueryTransaction.skip)
  @ApiQuery(ApiQueryTransaction.from)
  @ApiQuery(ApiQueryTransaction.to)
  @ApiQuery(ApiQueryTransaction.type)
  @ApiQuery(ApiQueryTransaction.bucket_type)
  @ApiQuery(ApiQueryTransaction.filter)
  @ApiQuery(ApiQueryTransaction.additional_param)
  @Version('2')
  @Get(':msisdn/point/history')
  async point_history_list(
    @Param() param: ViewPointHistoryFMCParamDTO,
    @Query() query: ViewPointHistoryFMCQueryDTO,
    @Req() req,
  ) {
    return await this.pointFmcService.new_point_history_list(
      param,
      query,
      req.headers.authorization,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationPoint.inject)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Post('poin/transfer')
  @HttpCode(202)
  async point_transfer(
    @Body() data: TransferPointDto,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<any> {
    return await this.pointFmcService.transferPoint(
      data,
      account,
      req.headers.authorization,
    );
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationPoint.inject)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('2')
  @Post('point/inject')
  @HttpCode(202)
  async point_inject(
    @Body() data: FMCInjectPoint,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<GlobalTransactionResponse> {
    return await this.pointFmcService.point_inject(
      data,
      account,
      req.headers.authorization,
    );
  }
}
