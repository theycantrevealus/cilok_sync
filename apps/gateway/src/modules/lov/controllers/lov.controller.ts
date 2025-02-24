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
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { isJson } from '@/application/utils/JSON/json';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import {
  ApiOperationExample,
  ApiQueryExample,
  ApiResponseExample,
} from '@/dtos/property.dto';
import { RequestValidatorFilter } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';
import { LovAddBulkDTO, LovAddDTO } from '@/lov/dto/lov.add.dto';
import { LovEditDTO } from '@/lov/dto/lov.edit.dto';
import { LovService } from '@/lov/services/lov.service';

@Controller({ path: 'lov', version: '1' })
@ApiTags('LOV (List of Values) Management')
@UseFilters(new RequestValidatorFilter())
export class LovController {
  private lovService: LovService;
  private logService: LogOauthSignInService;

  constructor(lovService: LovService, logService: LogOauthSignInService) {
    this.lovService = lovService;
    this.logService = logService;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all keyword type',
    description: 'group_name : KEYWORD_TYPE',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('keyword_type')
  async get_keyword_type() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "KEYWORD_TYPE"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List program approval status',
    description: 'group_name : PROGRAM_APPROVAL_STATUS',
  })
  @Get('program/approval')
  async get_program_approval() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "PROGRAM_APPROVAL_STATUS"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List keyword approval status',
    description: 'group_name : KEYWORD_APPROVAL_STATUS',
  })
  @Get('keyword/approval')
  async get_keyword_approval() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "KEYWORD_APPROVAL_STATUS"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all keyword notification type',
    description: 'group_name : NOTIF_TYPE',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('notif_type')
  async get_notif_type() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "NOTIF_TYPE"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all keyword bonus type',
    description: 'group_name : BONUS_TYPE',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('bonus_type')
  async get_bonus_type() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "BONUS_TYPE"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all keyword internal bonus type',
    description: 'group_name : INTERNAL_BONUS',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('bonus_type/internal_bonus')
  async get_internal_bonus_type() {
    return await this.lovService.getLovRelation('INTERNAL_BONUS');
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all keyword external bonus type',
    description: 'group_name : EXTERNAL_BONUS',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('bonus_type/external_bonus')
  async get_external_bonus_type() {
    return await this.lovService.getLovRelation('EXTERNAL_BONUS');
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all keyword notif receiver',
    description: 'group_name : NOTIF_RECEIVER',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('notif_receiver')
  async get_notif_receiver() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "NOTIF_RECEIVER"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all keyword notification via',
    description: 'group_name : NOTIF_VIA',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('notif_via')
  async get_notif_via() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "NOTIF_VIA"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({ summary: 'group_name : POINT_TYPE' })
  // @UseInterceptors(LoggingInterceptor)
  @Get('point_type')
  async get_point_type() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "POINT_TYPE"}',
      sort: '{}',
      skip: 0,
    });
  }

  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  // @ApiOperation({
  //   summary: 'List add program type',
  //   description: 'group_name : PROGRAM_TYPE',
  // })
  // @UseInterceptors(LoggingInterceptor)
  // @Get('program_type')
  // async get_program_type() {
  //   return await this.lovService.getLov({
  //     limit: 10,
  //     filter: '{"group_name": "PROGRAM_TYPE"}',
  //     sort: '{}',
  //     skip: 0,
  //   });
  // }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all customer type',
    description: 'group_name : CUSTOMER_TYPE',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('customer_type')
  async get_customer_type() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "CUSTOMER_TYPE"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all location type',
    description: 'group_name : LOCATION_TYPE',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('location_type')
  async get_location_type() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "LOCATION_TYPE"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all program mechanism',
    description: 'group_name : MECHANISM',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('mechanism')
  async get_mechanism(@CredentialAccount() account) {
    console.log(account);
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "MECHANISM"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all notification inside program',
    description: 'group_name : PROGRAM_NOTIFICATION_TEMPLATE',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('program/notification')
  async get_program_notification() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "PROGRAM_NOTIFICATION_TEMPLATE"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Get all keyword notification',
    description:
      'group_name ex: LUCKY_DRAW_NOTIFICATION, TELCO_POSTPAID_NOTIFICATION, TELCO_PREPAID_NOTIFICATION',
  })
  @ApiParam({
    name: 'group_name',
  })
  @Get('keyword_notification/:group_name')
  async get_keyword_notif_lucky_draw(@Param() param) {
    return await this.lovService.getLov({
      limit: 10,
      filter: `{"group_name": "${param.group_name}"}`,
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
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
  @ApiOperation({
    summary: 'List all lov',
    description:
      'LOV (List of values) used to store all default value or selection collection that rarely changes',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get()
  async index(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.lovService.getLov({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Get('prime')
  async all(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.lovService.getLovPrime({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @Get(':_id/detail')
  async detail(@Param() param) {
    return await this.lovService.getLovDetail(param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add LOV Item',
    description: 'group_name is used for grouping valuesss',
  })
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation(ApiOperationExample.add)
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Post()
  async add(@Body() parameter: LovAddDTO, @CredentialAccount() credential) {
    return await this.lovService.addLov(parameter, credential);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add LOV Item',
    description: 'group_name is used for grouping value',
  })
  @UseInterceptors(LoggingInterceptor)
  @Post('bulk')
  async add_bulk(@Body() data: LovAddBulkDTO, @CredentialAccount() credential) {
    return await this.lovService.addLovBulk(data, credential);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit LOV Item',
    description: 'group_name is used for grouping value',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put(':_id/edit')
  async edit_customer(@Body() data: LovEditDTO, @Param() param) {
    return await this.lovService.editLov(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_value',
  })
  @ApiOperation({
    summary: 'Find LOV Item (Case Sensitive)',
    description: 'Case sensitive',
  })
  @Get(':_value/find')
  async find_lov(@Param() param) {
    return await this.lovService.findCaseSensitive(param._value);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete LOV Item',
    description: '',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete(':_id/delete')
  async delete_customer(@Param() parameter) {
    return await this.lovService.deleteLov(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all notification inside program',
    description: 'group_name : PROGRAM_EXPERIENCE',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Get('program/experience')
  async get_program_experience() {
    return await this.lovService.getLov({
      filter: '{"group_name": "PROGRAM_EXPERIENCE"}',
      sort: '{}',
      skip: 0,
    });
  }
}
