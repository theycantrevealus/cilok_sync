import {
  Controller,
  Get,
  Param,
  UseFilters,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { HttpStatusCode } from 'axios';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { GlobalResponse } from '@/dtos/response.dto';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { TelegramService } from '@/telegram/services/telegram.service';

@ApiTags('Telegram')
@Controller({ path: 'telegram', version: '1' })
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class TelegramController {
  constructor(private telergamService: TelegramService) {}

  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'All Telegram BOT supported commands',
    description: 'Showing list supported commands for Telegram BOT',
  })
  @Get('help')
  async findAllBotCommands(@Param() parameter) {
    const response = new GlobalResponse();

    response.statusCode = HttpStatusCode.Ok;
    response.message = 'Success';
    response.payload = [
      {
        command: 'search',
        param: ['Keyword'],
        desc: 'summary aggregation by keyword',
      },
      {
        command: 'lkey',
        param: ['Program_Name'],
        desc: 'search keyword by program name',
      },
      {
        command: 'program',
        param: ['Program_Name'],
        desc: 'summary aggregation by program name',
      },
      {
        command: 'key',
        param: ['Keyword'],
        desc: 'search keyword',
      },
      {
        command: 'prog',
        param: ['Program_Name'],
        desc: 'search program',
      },
      {
        command: 'cekstock',
        param: ['Keyword'],
        desc: 'summary aggregation by keyword',
      },
    ];

    return response;
  }

  // @UseGuards(OAuth2Guard)
  // @ApiOAuth2(['oauth2'])
  // @Authorization(true)
  @ApiOperation({
    summary: 'Get Keyword Transaction',
    description:
      'Get total YTD, MTD and Today transaction from specific keyword',
  })
  @ApiParam({
    name: 'keyword_name',
  })
  @Version('1')
  @Get('keyword/:keyword_name/transaction')
  async findKeyword(@Param() parameter) {
    return await this.telergamService.getTotalTransactionByKeywordName(
      parameter.keyword_name,
    );
  }

  // @UseGuards(OAuth2Guard)
  // @ApiOAuth2(['oauth2'])
  // @Authorization(true)
  @ApiOperation({
    summary: 'Get Keyword List',
    description: 'Get all keyword list from specific keyword',
  })
  @ApiParam({
    name: 'keyword_name',
  })
  @Version('1')
  @Get('keyword/:keyword_name/name-only')
  async findAllKeyword(@Param() parameter) {
    return await this.telergamService.findAllKeywordByNameRegex(
      parameter.keyword_name,
    );
  }

  // @UseGuards(OAuth2Guard)
  // @ApiOAuth2(['oauth2'])
  // @Authorization(true)
  @ApiOperation({
    summary: 'Get Keyword Stock',
    description: 'Get information about stock from keyword',
  })
  @ApiParam({
    name: 'keyword_name',
  })
  @Version('1')
  @Get('keyword/:keyword_name/stock')
  async getKeywordStock(@Param() parameter) {
    return await this.telergamService.getKeywordStock(parameter.keyword_name);
  }

  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Show all keyword by program name',
    description: 'Showing all active keywords by program name',
  })
  @ApiParam({
    name: 'program_name',
  })
  @Get('program/:program_name/keyword')
  async findKeywordsByName(@Param() parameter) {
    return await this.telergamService.findKeywordsByName(
      parameter.program_name,
    );
  }

  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Get Program Transaction',
    description:
      'Get total YTD, MTD and Today transaction per keyword under program',
  })
  @ApiParam({
    name: 'program_name',
  })
  @Get('program/:program_name/transaction')
  async getProgramTransaction(@Param() parameter) {
    return await this.telergamService.getTotalTransactionByProgramName(
      parameter.program_name,
    );
  }

  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Get active program by name',
    description: 'Get all active program by name',
  })
  @ApiParam({
    name: 'program_name',
  })
  @Get('program/:program_name/active')
  async getActiveProgram(@Param() parameter) {
    return await this.telergamService.getActiveProgram(parameter.program_name);
  }
}
