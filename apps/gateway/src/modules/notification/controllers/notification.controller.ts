import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

import { Authorization } from '../../decorators/auth.decorator';
import { OAuth2Guard } from '../../guards/oauth.guard';
import { NotificationAddDTO } from '../dto/notification.add.dto';
import { NotificationEditDTO } from '../dto/notification.edit.dto';
import { NotificationService } from '../services/notification.service';
import { ApiOperationExample, ApiQueryExample } from '@/dtos/property.dto';
import { isJson } from '@/application/utils/JSON/json';
import {   RequestValidatorFilter } from '@/filters/validator.filter';

@Controller('notification')
@ApiTags('Notification Template Management')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
@Controller('notification')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class NotificationController {
  private notificationService: NotificationService;

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'limit',
    type: Number,
    example: 10,
    description: 'Limit data to show',
    required: false,
  })
  @ApiQuery({
    name: 'skip',
    type: Number,
    example: 0,
    description: 'Offset',
    required: false,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description:
      'You can define searching operator. ex: {"group_name":"%group_name_one%"}',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"group_name":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @Get('template')
  async index(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.notificationService.getNotification({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiQuery({
    name: 'limit',
    type: Number,
    example: 10,
    description: 'Limit data to show',
    required: true,
  })
  @ApiQuery({
    name: 'skip',
    type: Number,
    example: 0,
    description: 'Offset',
    required: true,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description:
      'You can define searching operator. ex: {"group_name":"%group_name_one%"}',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    example: '{}',
    description: 'Ex: {"group_name":-1}. 1 : Ascending, -1 : Descending',
    required: false,
  })
  @Get('template/selecbox')
  async select_box(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.notificationService.getNotificationSelectBox({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @Get('template/:_id/detail')
  async detail(@Param() param) {
    return await this.notificationService.getDetail(param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @Post('template')
  async add(@Body() parameter: NotificationAddDTO) {
    return await this.notificationService.addNotification(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @Put('template/:_id/edit')
  async edit(@Body() data: NotificationEditDTO, @Param() param) {
    return await this.notificationService.editNotification(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @Delete('template/:_id/delete')
  async delete(@Param() parameter) {
    return await this.notificationService.deleteNotification(parameter._id);
  }
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiQuery(ApiQueryExample.primeDT)
  @Get('template/prime')
  async all_prime(
    @Query('lazyEvent') parameter: string,
  ) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.notificationService.getNotificationPrime(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
      );
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }
}
