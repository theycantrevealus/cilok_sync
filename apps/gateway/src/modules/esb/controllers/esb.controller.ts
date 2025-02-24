import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Authorization } from '@/decorators/auth.decorator';
import { EsbGetBalanceDTOResponse } from '@/esb/dtos/esb.getbalance.response';
import { EsbTransactionService } from '@/esb/services/esb.transaction.service';
import { RequestValidatorFilterCustom } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

import { EsbInboxDto, EsbInboxDtoResponse } from '../dtos/esb.inbox.dto';
import {
  EsbNotificationDTO,
  EsbNotificationDTOResponse,
} from '../dtos/esb.notification.dto';
import { EsbOrderDTO, EsbOrderDTOResponse } from '../dtos/esb.order.dto';
import { EsbProfileDTO, EsbProfileDTOResponse } from '../dtos/esb.profile.dto';
import { ApiResponseEsb } from '../dtos/esb.response.proferty.dto';
import { EsbInboxService } from '../services/esb.inbox.service';
import { EsbNotificationService } from '../services/esb.notification.service';
import { EsbOrderService } from '../services/esb.order.service';
import { EsbProfileService } from '../services/esb.profile.service';

@ApiTags('Bridging ESB')
@Controller({ path: 'esb', version: '1' })
@UseFilters(RequestValidatorFilterCustom)
export class EsbController {
  private inboxService: EsbInboxService;
  private notificationService: EsbNotificationService;
  private orderService: EsbOrderService;
  private transactionService: EsbTransactionService;
  private profileService: EsbProfileService;

  constructor(
    inboxService: EsbInboxService,
    notificationService: EsbNotificationService,
    orderService: EsbOrderService,
    transactionService: EsbTransactionService,
    profileService: EsbProfileService,
  ) {
    this.inboxService = inboxService;
    this.notificationService = notificationService;
    this.orderService = orderService;
    this.transactionService = transactionService;
    this.profileService = profileService;
  }

  @ApiOperation({
    summary: 'Bridging Insert inbox ESB To Customer',
    description:
      'The API serves as an approach for a customer to insert an inbox item.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiResponse({
    type: EsbInboxDtoResponse,
  })
  @ApiResponse(ApiResponseEsb.INBOX400)
  @HttpCode(HttpStatus.OK)
  @Post('inbox')
  async inbox(@Body() payload: EsbInboxDto): Promise<EsbInboxDtoResponse> {
    return await this.inboxService.post(payload);
  }

  @ApiOperation({
    summary: 'Bridging Send Push Notification ESB To Customer',
    description:
      'The API serves as an approach for Telkomsel to send push notification to a customer.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiResponse({
    type: EsbNotificationDTOResponse,
  })
  @ApiResponse(ApiResponseEsb.NOTIFICATIONR400)
  @HttpCode(HttpStatus.OK)
  @Post('notification')
  async notif(
    @Body() payload: EsbNotificationDTO,
  ): Promise<EsbNotificationDTOResponse> {
    return await this.notificationService.post(payload);
  }

  @ApiOperation({
    summary: 'Bridging Submit Order ESB coming from various channels',
    description:
      'This serves as a module to perform submit order coming from various channels. ESB will performs Purchase Validation before submitting the request to Digital Order Management (DOM). DOM is a system which will handle order decomposition, order orchestration and order fulfillment.',
  })
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiResponse(ApiResponseEsb.ORDERR400)
  @HttpCode(HttpStatus.OK)
  @Post('orders')
  async order(@Body() payload: EsbOrderDTO): Promise<EsbOrderDTOResponse> {
    return await this.orderService.post(payload);
  }

  @ApiOperation({
    summary:
      'Bridging Get Balance ESB to retrieve balance information of the organization',
    description:
      'This serves as a module to perform get balance information of the organization from ESB',
  })
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiResponse({ type: EsbGetBalanceDTOResponse })
  @ApiResponse(ApiResponseEsb.BALANCER400)
  @HttpCode(HttpStatus.OK)
  @ApiQuery({
    name: 'transaction_id',
    type: String,
    example: 'ORG0011908101038001000001',
    description: 'Third Party Transaction ID',
    required: false,
  })
  @ApiQuery({
    name: 'channel',
    type: String,
    example: 'ta',
    description: 'Channel ID of Caller System',
  })
  @ApiQuery({
    name: 'organization_code',
    type: String,
    example: 'ORG999',
    description: 'Organization short code of dealer',
  })
  @Get('balance')
  async getBalance(
    @Req() req,
    @Query('transaction_id') transaction_id: string,
    @Query('channel') channel: string,
    @Query('organization_code') organization_code: string,
  ): Promise<EsbGetBalanceDTOResponse> {
    const obj = {
      transaction_id: transaction_id,
      channel: channel,
      organization_code: organization_code,
    };
    return await this.transactionService.getBalance(obj);
  }

  @ApiOperation({
    summary: 'Bridging DSP Location ESB To Customer',
    description:
      'The API serves as an approach for a customer to get location.',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiResponse({
    type: EsbProfileDTOResponse,
  })
  @ApiResponse(ApiResponseEsb.PROFILE400)
  @HttpCode(HttpStatus.OK)
  @Post('profile')
  async profile(
    @Body() payload: EsbProfileDTO,
  ): Promise<EsbProfileDTOResponse> {
    return await this.profileService.post(payload);
  }
}
