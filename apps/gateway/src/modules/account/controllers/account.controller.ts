import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { isJSON } from 'class-validator';
import { Observable } from 'rxjs';

import { Authorization } from '@/decorators/auth.decorator';
import {
  ApiOperationExample,
  ApiQueryExample,
  ApiResponseExample,
} from '@/dtos/property.dto';
import { GlobalErrorResponse, GlobalResponse } from '@/dtos/response.dto';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

import { AccountAddDTO, AccountAddDTOResponse } from '../dto/account.add.dto';
import {
  AccountAssignDTO,
  AccountAssignDTOResponse,
} from '../dto/account.assign.dto';
import { AccountDeleteDTOResponse } from '../dto/account.delete.dto';
import {
  AccountEditDTO,
  AccountEditDTOResponse,
} from '../dto/account.edit.dto';
import { RoleAddDTO } from '../dto/account.role.add.dto';
import { RoleEditDTO, RoleEditDTOResponse } from '../dto/account.role.edit';
import { AccountService } from '../services/account.service';

@Controller({ path: 'account' })
// @UseFilters(
//   
//   
//   new RequestValidatorFilter(),
// )
@ApiTags('Account Management')
export class AccountController {
  private accountService: AccountService;

  constructor(accountService: AccountService) {
    this.accountService = accountService;
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  // @ApiOperation(ApiOperationExample.primeDT)
  @ApiOperation({
    summary: 'List account datatable v1',
    description: '',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    example: 10,
    description:
      'Limit data to show.<br />If not defined it will show 10 datas by default.',
    required: true,
  })
  @ApiQuery({
    name: 'skip',
    type: Number,
    example: 0,
    description:
      'Offset of the data.<br />If not defined it will show from the first data.',
    required: true,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    example: '{}',
    description:
      'You can define searching operator. ex: {"column_name":"value_to_search"}. <br />No need to define wildcard, it handled using regex by default',
    required: false,
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    example: '{}',
    description:
      'Ex: {"column_name":-1}.<ul><li>&nbsp;1 : Ascending</li><li>-1 : Descending</li></ul>',
    required: false,
  })
  @ApiResponse(ApiResponseExample.R200)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Version('1')
  @Get()
  async all_old(
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.accountService.all_old({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiQuery(ApiQueryExample.primeDT)
  @ApiResponse(ApiResponseExample.R200)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Version('2')
  @Get()
  async all(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.accountService.all({
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
  @ApiOperation({
    summary: 'Account detail By _id',
    description: 'Showing account detail',
  })
  @ApiParam({
    name: '_id',
  })
  @ApiResponse(ApiResponseExample.R200)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Version('1')
  @Get(':_id/detail')
  async detail(@Param() parameter) {
    return await this.accountService.detail(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Authenticate Account to Core',
    description: 'Get account info from core using token',
  })
  @Version('1')
  @Get('authenticate')
  async authenticate(@Req() req): Promise<Observable<any>> {
    return await this.accountService.authenticateMerchant({
      auth: req.headers.authorization,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Authenticate Account to Core',
    description: 'Get account info from core using token',
  })
  @Version('1')
  @Get('authenticate/business')
  async authenticate_business(@Req() req): Promise<any> {
    return await this.accountService.authenticateBusiness({
      auth: req.headers.authorization,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add new account',
    description:
      'Adding new account for demo local. <b>(Not Integrated with Core)</b>',
  })
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Version('1')
  @Post()
  async add(
    @Body() parameter: AccountAddDTO,
    @Req() req,
  ): Promise<AccountAddDTOResponse> {
    return await this.accountService.add(parameter, req.headers.authorization);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Edit keyword value',
    description: 'Edit keyword value by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @Version('1')
  @Put(':_id/edit')
  async edit(
    @Body() data: AccountEditDTO,
    @Param() param,
  ): Promise<AccountEditDTOResponse> {
    return await this.accountService.edit(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Delete keyword item',
    description: 'Delete keyword item by ID',
  })
  @ApiParam({
    name: '_id',
  })
  @Version('1')
  @Delete(':_id/delete')
  async delete(@Param() parameter): Promise<AccountDeleteDTOResponse> {
    return await this.accountService.delete(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Show all keyword item',
    description:
      'Showing all keyword without keyword parent detail and with some param for server-side request',
  })
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
  @Version('1')
  @Get('role')
  async role_all(
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.accountService.role_all({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add new keyword item',
    description: 'Add new keyword item',
  })
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Version('1')
  @Post('role')
  async role_add(@Body() parameter: RoleAddDTO, @Req() req) {
    return await this.accountService.role_add(parameter, {
      auth: req.headers.authorization,
    });
  }
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Edit keyword value',
    description: 'Edit keyword value by ID',
  })
  @ApiParam({
    name: 'role_id',
  })
  @ApiResponse(ApiResponseExample.R200)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Version('1')
  @Put('role/:role_id/edit')
  async role_edit(
    @Body() data: RoleEditDTO,
    @Req() req,
    @Param() param,
  ): Promise<GlobalResponse> {
    return await this.accountService.role_edit(data, {
      auth: req.headers.authorization,
      role_id: param.role_id,
    });
  }
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Delete role by role_id',
    description: 'Delete integration with core',
  })
  @ApiParam({
    name: 'role_id',
  })
  @ApiResponse(ApiResponseExample.R204)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Version('1')
  @Delete('role/:role_id/delete')
  async role_delete(
    @Param() parameter,
    @Req() req,
  ): Promise<AccountDeleteDTOResponse> {
    return await this.accountService.role_delete(parameter.role_id, {
      auth: req.headers.authorization,
    });
  }
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Assign account to specific location',
    description: 'Adding account to specific location',
  })
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Version('1')
  @Post('assign_location')
  async assign_location(
    @Body() parameter: AccountAssignDTO,
  ): Promise<AccountAssignDTOResponse> {
    return await this.accountService.assign_location(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiQuery({
    name: 'location_id',
    type: String,
    example: '63d24b69f444fb78eaf17757',
    description: ``,
    required: false,
  })
  @ApiQuery(ApiQueryExample.primeDT)
  @Version('1')
  @Get('location')
  async getuserbylocation(
    @Query('lazyEvent') parameter: string,
    @Query('location_id') param: string,
  ): Promise<any> {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);

      return await this.accountService.getUserByLocation(
        {
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        },
        param,
      );
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Version('1')
  @Get('change-location/:username/validate')
  async validateChangeLocation(
    @Param('username') username: string,
  ): Promise<GlobalResponse | GlobalErrorResponse> {
    return await this.accountService.validateChangeLocation(username);
  }
}
