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
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { isJSON } from 'class-validator';

import { Authorization } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';

import { ChannelAddDTO, ChannelAddDTOResponse } from '../dto/channel.add.dto';
import { ChannelDeleteDTOResponse } from '../dto/channel.delete.dto';
import {
  ChannelEditDTO,
  ChannelEditDTOResponse,
} from '../dto/channel.edit.dto';
import { ChannelService } from '../services/channel.service';

@Controller('channel')
@ApiTags('Channel Management')
@Controller('channel')
export class ChannelController {
  private channelService: ChannelService;
  private logService: LogOauthSignInService;

  constructor(
    channelService: ChannelService,
    logService: LogOauthSignInService,
  ) {
    this.channelService = channelService;
    this.logService = logService;
  }

  @UseGuards(OAuth2Guard)
  // @UseInterceptors(LoggingInterceptor)
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
    summary: 'List all channel',
    description:
      'Channel (List of values) used to store all default value or selection collection that rarely changes',
  })
  @Get()
  async index(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.channelService.getChannel({
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
    name: 'lazyEvent',
    type: String,
    example:
      '{"first":0,"rows":10,"sortField":"created_at","sortOrder":1,"filters":{}}',
    description: `Format: Prime default param<br />`,
    required: false,
  })
  @ApiOperation({
    summary: 'Show all program item',
    description: `<table>
    <tr>
      <td>
        first<br />
        <i>Offset of data</i>
      </td>
      <td>:</td>
      <td><b>number</b></td>
    </tr>
    <tr>
      <td>
      rows<br />
      <i>Limit data in page</i>
      </td>
      <td>:</td>
      <td><b>number</b></td>
      </tr>
    <tr>
      <td>
        sortField<br />
        <i>Field to be sort</i>
      </td>
      <td>:</td>
      <td><b>string</b></td>
    </tr>
    <tr>
      <td>
      sortOrder<br />
      <i>1 is ascending. -1 is descending</i>
      </td>
      <td>:</td>
      <td><b>number</b></td>
    </tr>
    <tr>
    <td>filters</td>
    <td>:</td>
    <td>
    <b>object</b><br />
    <table>
      <tr>
      <td>
      column_name_1<br />
      <i>Name of column to be searched</i>
      </td>
      <td>:</td>
      <td>
      <b>object</b>
      <table>
      <tr>
        <td>matchMode</td>
        <td>:</td>
        <td>
        <b>string</b><br />
        Only filled by following item:
        <ul>
          <li>
          <b>contains</b><br />
          Will search all data if column_name_1 contains the value
          <br />
          </li>
          <li>
          <b>notContains</b><br />
          Will search all data if column_name_1 not contains the value
          <br />
          </li>
          <li>
          <b>startsWith</b><br />
          Will search all data if column_name_1 starts with the value
          <br />
          </li>
          <li>
          <b>endsWith</b><br />
          Will search all data if column_name_1 ends with the value
          <br />
          </li>
          <li>
          <b>equals</b><br />
          Will search all data if column_name_1 equals to the value
          <br />
          </li>
          <li>
          <b>notEquals</b><br />
          Will search all data if column_name_1 not equals to the value
          <br />
          </li>
        </li>
        </td>
      </tr>
      <tr>
        <td>value</td>
        <td>:</td>
        <td><b>string</b></td>
      </tr>
      </table>
      </td>
      </tr>
      <tr>
      <td>
      column_name_2<br />
      <i>Name of column to be searched</i>
      </td>
      <td>:</td>
      <td>
      <b>object</b>
      <table>
      <tr>
        <td>matchMode</td>
        <td>:</td>
        <td>
        <b>string</b><br />
        Only filled by following item:
        <ul>
          <li>
          <b>contains</b><br />
          Will search all data if column_name_2 contains the value
          <br />
          </li>
          <li>
          <b>notContains</b><br />
          Will search all data if column_name_2 not contains the value
          <br />
          </li>
          <li>
          <b>startsWith</b><br />
          Will search all data if column_name_2 starts with the value
          <br />
          </li>
          <li>
          <b>endsWith</b><br />
          Will search all data if column_name_2 ends with the value
          <br />
          </li>
          <li>
          <b>equals</b><br />
          Will search all data if column_name_2 equals to the value
          <br />
          </li>
          <li>
          <b>notEquals</b><br />
          Will search all data if column_name_2 not equals to the value
          <br />
          </li>
        </li>
        </td>
      </tr>
      <tr>
        <td>value</td>
        <td>:</td>
        <td><b>string</b></td>
      </tr>
      </table>
      </td>
      </tr>
    </table>
    </td>
    </tr>
    </table>`,
  })
  @UseInterceptors(LoggingInterceptor)
  @Get('prime')
  async prime_all(@Query('lazyEvent') parameter: string) {
    const lazyEvent = parameter;
    if (isJSON(lazyEvent)) {
      const parsedData = JSON.parse(parameter);
      return await this.channelService.getChannelPrime({
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
    summary: 'Add Channel Item',
    description: 'group_name is used for grouping value',
  })
  @Post()
  async add(@Body() parameter: ChannelAddDTO): Promise<ChannelAddDTOResponse> {
    return await this.channelService.addChannel(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit Channel Item',
    description: 'group_name is used for grouping value',
  })
  @Put(':_id/edit')
  async edit_customer(
    @Body() data: ChannelEditDTO,
    @Param() param,
  ): Promise<ChannelEditDTOResponse> {
    return await this.channelService.editChannel(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Channel Item',
    description: '',
  })
  @Delete(':_id/delete')
  async delete_customer(@Param() parameter): Promise<ChannelDeleteDTOResponse> {
    return await this.channelService.deleteChannel(parameter._id);
  }
}
