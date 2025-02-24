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

import { Account } from '@/account/models/account.model';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import {
  ApiOperationExample,
  ApiQueryExample,
  ApiResponseExample,
} from '@/example/dtos/property.dto';
import { Example } from '@/example/models/example.model';
import { ExampleService } from '@/example/services/example.service';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';

import { PIC } from '../models/pic.model';
import { PICService } from '../services/pic.service';

@Controller({ path: 'pic' })
@ApiTags('PIC Management')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
@Controller('example')
export class PICController {
  private picService: PICService;
  private logService: LogOauthSignInService;

  constructor(picService: PICService, logService: LogOauthSignInService) {
    this.picService = picService;
    this.logService = logService;
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
    return await this.picService.all({
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
  @Version('1') // Just add per end point
  @Get('prime')
  async all(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.picService.pic_prime({
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

  // @UseGuards(OAuth2Guard)
  // @ApiOAuth2(['oauth2'])
  // @Authorization(true)
  // @ApiOperation(ApiOperationExample.primeDT)
  // @ApiQuery(ApiQueryExample.primeDT)
  // @Version('2')
  // @Get()
  // async allv2(@Query('lazyEvent') parameter: string) {
  //   const lazyEvent = parameter;
  //   if (isJSON(lazyEvent)) {
  //     const parsedData = JSON.parse(parameter);
  //     return await this.exampleService.all2({
  //       first: parsedData.first,
  //       rows: parsedData.rows,
  //       sortField: parsedData.sortField,
  //       sortOrder: parsedData.sortOrder,
  //       filters: parsedData.filters,
  //     });
  //   } else {
  //     return {
  //       message: 'filters is not a valid json',
  //       payload: {},
  //     };
  //   }
  // }
  // Separate each end point with 10 lines comment (//)
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor) // Logging. Only for data manipulation. Don't add this on GET
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
  @Version('1')
  @Post()
  async add(@Body() request: PIC, @CredentialAccount() account: Account) {
    return await this.picService.add(request, account);
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
  @Version('1')
  @Put(':_id')
  async edit(@Param() parameter, @Body() request: PIC) {
    return await this.picService.edit(parameter._id, request);
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation(ApiOperationExample.add)
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
  @ApiParam({
    name: '_id',
  })
  @Version('1')
  @Delete(':_id')
  async delete(@Param() parameter) {
    return await this.picService.delete(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'PIC detail By _id',
    description: 'Showing PIC detail',
  })
  @ApiParam({
    name: '_id',
  })
  // @UseInterceptors(LoggingInterceptor)
  @Version('1')
  @Get(':_id/detail')
  async detail(@Param() parameter) {
    return await this.picService.get_pic_detail(parameter._id);
  }
}
