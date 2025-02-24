import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { isJson } from '@/application/utils/JSON/json';
import { Authorization } from '@/decorators/auth.decorator';
import { ApiOperationExample, ApiQueryExample } from '@/dtos/property.dto';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { BidAddDTO } from '@/transaction/dtos/bid/bid.add.dto';
import { BidEditDTO } from '@/transaction/dtos/bid/bid.edit.dto';
import { BidService } from '@/transaction/services/bid/bid.service';

@Controller('bid')
@ApiTags('Bid Management')
@Controller('bid')
export class BidController {
  private bidService: BidService;

  constructor(bidService: BidService) {
    this.bidService = bidService;
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'List all bid (Prime)',
  })
  @ApiQuery(ApiQueryExample.primeDT)
  @Get('prime')
  async all(@Query('lazyEvent') parameter: string) {
    try {
      if (isJson(parameter)) {
        const parsedData = JSON.parse(parameter);
        return await this.bidService.getBidPrime({
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        });
      }

      return {
        message: 'filters is not a valid json',
        payload: {},
      };
    } catch (error) {
      return {
        message: 'Error processing request',
        payload: {},
        error: error.message,
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
    summary: 'List all bid',
  })
  @Get()
  async index(
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.bidService.getBid({
      limit: limit,
      filter: filter,
      sort: sort,
      skip: skip,
    });
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Detail Bid Item',
  })
  @Get(':_id/detail')
  async detail_customer(@Param() parameter) {
    return await this.bidService.detailBid(parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Bid Item',
  })
  @Post()
  async add(@Body() parameter: BidAddDTO) {
    return await this.bidService.addBid(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit Bid Item',
  })
  @Put(':_id/edit')
  async edit_customer(@Body() data: BidEditDTO, @Param() parameter) {
    return await this.bidService.editBid(data, parameter._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Bid Item',
  })
  @Delete(':_id/delete')
  async delete_customer(@Param() parameter) {
    return await this.bidService.deleteBid(parameter._id);
  }
}
