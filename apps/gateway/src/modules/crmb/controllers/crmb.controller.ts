import {Authorization} from '@/decorators/auth.decorator'
import {
  RequestValidatorFilter,
} from '@/filters/validator.filter'
import {OAuth2Guard} from '@/guards/oauth.guard'
import {LoggingInterceptor} from '@/interceptors/logging.interceptor'
import {
  Body,
  Controller, Get, Param, Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import {ApiOAuth2, ApiOperation, ApiParam, ApiResponse, ApiTags} from '@nestjs/swagger'
import {ApiResponseExample} from "@/example/dtos/property.dto";
import {MainCrmbService} from "@/crmb/services/main.crmb.service";
import {CrmbResponsePropertyDto} from "@/crmb/dtos/crmb.response.property.dto";
import {CrmbRequestBodyDto} from "@/crmb/dtos/crmb.request.body.dto";
import {CrmbResponseDTO} from "@/crmb/dtos/crmb.response.dto";

@ApiTags('CRM Backend')
@Controller({path: 'crmb', version: '1'})
@UseFilters(
  new RequestValidatorFilter(),
)
export class CrmbController {
  constructor(
    private mainCrmService: MainCrmbService,
  ) {
  }

  @ApiOperation({
    summary: 'GET BINDING GROUPED WALLET FROM CRMB',
  })


  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiResponse(CrmbResponsePropertyDto.R200)
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Get('bindings-grouped')
  async getTselIdBindingsGrouped(
    @Query() query: CrmbRequestBodyDto,
  ): Promise<CrmbResponseDTO> {
    return await this.mainCrmService.getTselIdBindingsGrouped(query)
  }

  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: 'tselId',
  })
  @ApiResponse(CrmbResponsePropertyDto.R200)
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Version("2")
  @Get('getWallet-siblings/:tselId')
  async getWalletSiblingsFromCoreMember(
    @Param() param,
    @Req() request
  ): Promise<CrmbResponseDTO> {
    const tselId = param.tselId;
    const token =  request.headers.authorization;
    return await this.mainCrmService.getWalletSiblingsFromCoreMember(tselId, token)
  }
}
