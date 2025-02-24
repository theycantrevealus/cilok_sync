import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';
import { LovAddDTO } from '@/lov/dto/lov.add.dto';
import { LovEditDTO } from '@/lov/dto/lov.edit.dto';
import { LovService } from '@/lov/services/lov.service';

@Controller({ path: 'lov', version: '2' })
@ApiTags('lov')
@Controller('lov')
export class LovControllerv2 {
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
    summary: 'List all keyword notif receiver',
    description: 'group_name : NOTIF_RECEIVER',
  })
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
  @Get('point_type')
  async get_point_type() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "POINT_TYPE"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List add program type',
    description: 'group_name : PROGRAM_TYPE',
  })
  @Get('program_type')
  async get_program_type() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "PROGRAM_TYPE"}',
      sort: '{}',
      skip: 0,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'List all customer type',
    description: 'group_name : CUSTOMER_TYPE',
  })
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
  @Get('mechanism')
  async get_mechanism() {
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
    summary: 'List all owner type',
    description: 'group_name : OWNER',
  })
  @Get('owner')
  async get_owner() {
    return await this.lovService.getLov({
      limit: 10,
      filter: '{"group_name": "OWNER"}',
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

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add LOV Item',
    description: 'group_name is used for grouping value',
  })
  @Post()
  async add(@Body() parameter: LovAddDTO, @CredentialAccount() credential) {
    const data = await this.lovService.addLov(parameter, credential);
    if (data.status === HttpStatus.OK) {
      return data;
    } else {
      throw new HttpException(data.message, data.status);
    }
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
  @Put(':_id/edit')
  async edit_customer(@Body() data: LovEditDTO, @Param() param) {
    return await this.lovService.editLov(data, param._id);
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
  @Delete(':_id/delete')
  async delete_customer(@Param() parameter) {
    return await this.lovService.deleteLov(parameter._id);
  }
}
