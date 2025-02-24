import {Authorization} from '@/decorators/auth.decorator'
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter'
import {OAuth2Guard} from '@/guards/oauth.guard'
import {LoggingInterceptor} from '@/interceptors/logging.interceptor'
import {
  Body,
  Controller, Get,
  Post, Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import {ApiOAuth2, ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger'
import {MainBalanceService} from "@/linkaja/services/main.balance.service"
import {DisbursementInquiryDTO} from "@/linkaja/dtos/disbursement.inquiry.dto";
import {ApiResponseExample} from "@/example/dtos/property.dto";
import {ApiResponseLinkAja} from "@/linkaja/dtos/link.aja.response.property.dto";
import {DisbursementCheckDTO} from "@/linkaja/dtos/disbursement.check.dto";
import {AdjustCustomerPointDTO, AdjustCustomerPointDTOResponse} from "@/linkaja/dtos/adjust.customer.point.dto";
import {AdjustCustomerPointService} from "@/linkaja/services/adjust.customer.point.service";
import {LinkAjaDisbursementDTOResponse} from "@/linkaja/dtos/get.token.dto";

@ApiTags('Link AJA')
@Controller({path: 'link-aja', version: '1'})
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class LinkAjaController {
  constructor(
    private mainBalanceService: MainBalanceService,
    private adjustCustomerPointService: AdjustCustomerPointService,
  ) {
  }
  // TODO hide sementara
  //
  // @ApiOperation({
  //   summary: 'Get Token',
  //   description:
  //     'The Generate Auth  is using HTTPS Protocol GET Method.',
  // })
  // @UseGuards(OAuth2Guard)
  // @UseInterceptors(LoggingInterceptor)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  // @ApiResponse(ApiResponseLinkAja.R200)
  // @ApiResponse(ApiResponseExample.R201)
  // @ApiResponse(ApiResponseExample.R400)
  // @ApiResponse(ApiResponseExample.R401)
  // @ApiResponse(ApiResponseExample.R403)
  // @ApiResponse(ApiResponseExample.R404)
  // @ApiResponse(ApiResponseExample.R405)
  // @ApiResponse(ApiResponseExample.R422)
  // @ApiResponse(ApiResponseExample.R424)
  // @ApiResponse(ApiResponseExample.R500)
  // @Get('getToken')
  // async getToken(@Req() req): Promise<LinkAjaDisbursementDTOResponse> {
  //   return await this.mainBalanceService.getToken(req.body)
  // }
  //

  @ApiOperation({
    summary: 'CHECK TRANSACTION STATUS',
    description:
      'Check Transaction Status API is called to check whether a transaction is successful or not. Following are Request and Response parameters',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiResponse(ApiResponseLinkAja.R200)
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Post('disbursementCheck')
  async disbursementCheck(@Body() payload: DisbursementCheckDTO): Promise<LinkAjaDisbursementDTOResponse> {
    return await this.mainBalanceService.disbursementCheck(payload)
  }



  @ApiOperation({
    summary: 'CHECK TRANSACTION STATUS',
    description:
      'Check Transaction Status API is called to check whether a transaction is successful or not. Following are Request and Response parameters',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiResponse(ApiResponseLinkAja.R200)
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Post('disbursement')
  async disbursement(@Body() payload: DisbursementInquiryDTO): Promise<LinkAjaDisbursementDTOResponse> {
    return await this.mainBalanceService.disbursement(payload)
  }


  @ApiOperation({
    summary: 'ADJUST CUSTOMER POINT BALANCE',
    description:
      'Adjust customer point balance will be able to use when the partner already registered on LinkAja partner’s loyalty and rewards engine.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiResponse(ApiResponseLinkAja.AdjustCustomerPointR200)
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Post('adjustCustomerPointBalance')
  async adjustCustomerPointBalance(@Body() payload: AdjustCustomerPointDTO): Promise<AdjustCustomerPointDTOResponse> {
    return await this.adjustCustomerPointService.adjustCustomerPointBalance(payload)
  }

}
