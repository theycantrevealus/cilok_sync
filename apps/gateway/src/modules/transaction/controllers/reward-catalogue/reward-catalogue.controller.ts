import {
  Controller,
  Get, Inject,
  Param,
  Query,
  Req,
  Res,
  UseFilters,
  UseGuards,
  Version
} from "@nestjs/common";
import { ApiOAuth2, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Response } from 'express';

import { Authorization } from '@/decorators/auth.decorator';
import {
  
  
  AllExceptionsFilter,
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import {
  RewardCalaogueParamDTO,
  RewardCalaogueQueryDTO,
} from '@/transaction/dtos/reward-catalogue/reward-catalogue.query';
import { ApiOperationTransaction } from '@/transaction/dtos/transaction.property.dto';
import { PointService } from '@/transaction/services/point/point.service';
import { RewardCatalogueService } from '@/transaction/services/reward-catalogue/reward-catalogue.service';
import { GlobalTransactionApiResponse } from "@/transaction/dtos/global.transaction.property.dto";

@Controller('')
@ApiTags('Transaction')
@UseFilters(AllExceptionsFilter)
export class RewardCatalogueController {
  constructor(
    @Inject(RewardCatalogueService) private service: RewardCatalogueService,
    @Inject(PointService) private pointService: PointService,
  ) {
    //
  }

  // /* Get Reward Catalogue by Subscriber */
  // @UseGuards(OAuth2Guard)
  // @ApiOAuth2(['oauth2'])
  // @Authorization(false)
  // @ApiOperation(ApiOperationTransaction.reward_catalogue_by_subscriber)
  // @ApiQuery(ApiQueryTransaction.locale)
  // @ApiQuery(ApiQueryTransaction.transaction_id)
  // @ApiQuery(ApiQueryTransaction.channel_id)
  // @ApiQuery(ApiQueryTransaction.filter)
  // @ApiQuery(ApiQueryTransaction.additional_param)
  // @ApiQuery(ApiQueryTransaction.limit)
  // @ApiParam(ApiParamTransaction.msisdn)
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   type: RewardCatalogueResponse
  // })
  // @ApiResponse(GlobalTransactionApiResponse.R200)
  // @ApiResponse(GlobalTransactionApiResponse.R400)
  // @ApiResponse(GlobalTransactionApiResponse.R403)
  // @ApiResponse(GlobalTransactionApiResponse.R404)
  // @ApiResponse(GlobalTransactionApiResponse.R405)
  // @ApiResponse(GlobalTransactionApiResponse.R500)
  // @ApiResponse(GlobalTransactionApiResponse.R500)
  // @Version('1')
  // @Get(':msisdn/reward-catalogue')
  // async reward_cataloge(@Query() query: RewardCalaogueQuery, @Param() params: { msisdn: string }, @Req() req: Request) {
  //   const requestDto = new RewardCatalogueRequestDto();
  //   requestDto.query = query;
  //   requestDto.msisdn = params.msisdn;
  //   requestDto.token = req.headers.authorization;
  //   return await this.service.get_reward(requestDto);
  // }

  /* Get Reward Catalogue by Subscriber */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationTransaction.reward_catalogue_by_subscriber)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Get(':msisdn/reward-catalogue')
  async reward_cataloge(
    @Param() param: RewardCalaogueParamDTO,
    @Query() query: RewardCalaogueQueryDTO,
    @Req() req,
  ) {
    const token = req.headers.authorization;
    return await this.service.get_rewardv2(param, query, token);
  }

  /* Get Reward Catalogue XML */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationTransaction.get_reward_catalogue_xml)
  @Version('1')
  @Get('reward-catalogue/xml')
  async reward_cataloge_xml(@Res() res: Response) {
    const stream = await this.service.getXmlFile();
    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': 'attachment; filename=reward-catalog.xml',
    });
    stream.pipe(res);
  }
}
