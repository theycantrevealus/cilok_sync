import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

import { Authorization, CredentialAccount } from '../../decorators/auth.decorator';
import { OAuth2Guard } from '../../guards/oauth.guard';
import { NotificationAddDTO } from '../dto/notification.add.dto';
import { NotificationEditDTO } from '../dto/notification.edit.dto';
import { NotificationService } from '../services/notification.service';
import { ApiOperationExample, ApiQueryExample, ApiResponseExample } from '@/dtos/property.dto';
import { isJson } from '@/application/utils/JSON/json';
import {   RequestValidatorFilter } from '@/filters/validator.filter';
import { NotificationFirebaseEditDTO } from '../dto/notification.firebase.edit.dto';
import { Account } from '@/account/models/account.model';
import { AccountService } from '@/account/services/account.service';

@Controller({ path: 'notification-message', version: '1' })
@ApiTags('Notification Message')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class NotificationFirebaseController {
  private notificationService: NotificationService;

  constructor(notificationService: NotificationService,@Inject(AccountService) private readonly accountService: AccountService,) {
    this.notificationService = notificationService;
  }

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('prime')
  async all(@Query('lazyEvent') parameter: string, @CredentialAccount() credential: Account,@Req() req) {
    const accountSet: any = await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.notificationService.getnotificationFirebasePrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
      }, accountSet
      );
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation(ApiOperationExample.add)
  @ApiResponse(ApiResponseExample.R200)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @ApiParam({
    name: '_id',
  })
  @Put('read/:_id')
  async edit(@Param() parameter, @Body() request: NotificationFirebaseEditDTO) {
    return await this.notificationService.updateNotificationFirebase(parameter._id, request);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation(ApiOperationExample.addv2)
  @ApiResponse(ApiResponseExample.R204)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @ApiParam({
    name: '_id',
  })
  @Delete(':_id')
  async delete(@Param() parameter) {
    return await this.notificationService.deleteNotificationFirebase(parameter._id);
  }
}
