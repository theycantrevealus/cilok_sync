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

import { Examplev2 } from '../models/example.v2.model';

@Controller({ path: 'example' })
@ApiTags('Back End Standard Structure')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
@Controller('example')
export class ExampleController {
  private exampleService: ExampleService;
  private logService: LogOauthSignInService;

  constructor(
    exampleService: ExampleService,
    logService: LogOauthSignInService,
  ) {
    this.exampleService = exampleService;
    this.logService = logService;
  }

  @UseGuards(OAuth2Guard) // Guard
  @ApiOAuth2(['oauth2']) // Auth Method
  @Authorization(true) // Auth Status Checker
  @ApiOperation(ApiOperationExample.primeDT) // End Point Description
  @ApiQuery(ApiQueryExample.primeDT) // Parameter Query
  @Version('1') // Just add per end point
  @Get()
  async all(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.exampleService.all({
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
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiQuery(ApiQueryExample.primeDT)
  @Version('2')
  @Get()
  async allv2(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.exampleService.all2({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
        period: parsedData.period,
        msisdn: parsedData.msisdn,
      });
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    }
  }
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
  async add(@Body() request: Example, @CredentialAccount() account: Account) {
    return await this.exampleService.add(request, account);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation(ApiOperationExample.addv2)
  @ApiResponse(ApiResponseExample.R201)
  @ApiResponse(ApiResponseExample.R400)
  @ApiResponse(ApiResponseExample.R401)
  @ApiResponse(ApiResponseExample.R403)
  @ApiResponse(ApiResponseExample.R404)
  @ApiResponse(ApiResponseExample.R405)
  @ApiResponse(ApiResponseExample.R422)
  @ApiResponse(ApiResponseExample.R424)
  @ApiResponse(ApiResponseExample.R500)
  @Version('2')
  @Post()
  async addv2(
    @Body() request: Examplev2,
    @CredentialAccount() account: Account,
  ) {
    return await this.exampleService.addv2(request, account);
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
  @ApiOperation(ApiOperationExample.addv2)
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
  async edit(@Param() parameter, @Body() request: Example) {
    return await this.exampleService.edit(parameter._id, request);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOperation(ApiOperationExample.addv2)
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
  @Version('2')
  @Put(':_id')
  async editv2(@Param() parameter, @Body() request: Examplev2) {
    return await this.exampleService.editv2(parameter._id, request);
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: '_id',
  })
  @Version('1')
  @Delete(':_id')
  async delete(@Param() parameter) {
    return await this.exampleService.delete(parameter._id);
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
  @Version('2')
  @Delete(':_id')
  async deletev2(@Param() parameter) {
    return await this.exampleService.deletev2(parameter._id);
  }
}
