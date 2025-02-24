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
  UseGuards,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';

import {
  Authorization,
  CredentialAccount,
} from '../../decorators/auth.decorator';
import { OAuth2Guard } from '../../guards/oauth.guard';
import { PartnerAddDTO } from '../dto/partner.add.dto';
import { PartnerEditDTO } from '../dto/partner.edit.dto';
import { PartnerService } from '../services/partner.service';
import { ApiOperationExample, ApiQueryExample } from '@/dtos/property.dto';
import { isJson } from '@/application/utils/JSON/json';

@Controller({ path: 'partner', version: '2' })
@ApiTags('Partner Management')
@Controller('partner')
export class PartnerController {
  private partnerService: PartnerService;
  private logService: LogOauthSignInService;

  constructor(
    partnerService: PartnerService,
    logService: LogOauthSignInService,
  ) {
    this.partnerService = partnerService;
    this.logService = logService;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationExample.primeDT)
  @ApiQuery(ApiQueryExample.primeDT)
  @Get('prime')
  async get_merchant_prime(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;

    if (isJson(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.partnerService.getPatnerPrime({
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
    summary: 'List all partner',
    description:
      'Partner (List of values) used to store all default value or selection collection that rarely changes',
  })
  @Get()
  async index(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.partnerService.getPartner({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Partner Item',
    description: 'group_name is used for grouping value',
  })
  @Post()
  async add(@Body() parameter: PartnerAddDTO, @CredentialAccount() credential) {
    return await this.partnerService.addPartner(parameter, credential);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit Partner Item',
    description: 'group_name is used for grouping value',
  })
  @Put(':_id/edit')
  async edit_customer(@Body() data: PartnerEditDTO, @Param() param) {
    return await this.partnerService.editPartner(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Partner Item',
    description: '',
  })
  @Delete(':_id/delete')
  async delete_customer(@Param() parameter) {
    return await this.partnerService.deletePartner(parameter._id);
  }
}
