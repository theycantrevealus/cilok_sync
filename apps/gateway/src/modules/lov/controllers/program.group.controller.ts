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

import { Authorization } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { LogOauthSignInService } from '@/logging/services/oauth/oauth.service';
import {
  ProgramGroupAddDTO,
  ProgramGroupAddDTOResponse,
} from '@/lov/dto/program.group.add.dto';
import { ProgramGroupDeleteDTOResponse } from '@/lov/dto/program.group.delete.dto';
import {
  ProgramGroupEditDTO,
  ProgramGroupEditDTOResponse,
} from '@/lov/dto/program.group.edit.dto';
import { ProgramGroupService } from '@/lov/services/program.group.service';

@Controller({ path: 'lov', version: '1' })
@ApiTags('Program Group Management')
export class ProgramGroupController {
  private programGroupService: ProgramGroupService;
  private logService: LogOauthSignInService;

  constructor(
    programGroupService: ProgramGroupService,
    logService: LogOauthSignInService,
  ) {
    this.programGroupService = programGroupService;
    this.logService = logService;
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
    summary: 'Program Group all bank',
    description:
      'Bank (List of values) used to store all default value or selection collection that rarely changes',
  })
  @Get('program/group')
  async index(
    @Req() req,
    @Query('limit') limit: number,
    @Query('skip') skip: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return await this.programGroupService.get_program_group({
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
    summary: 'Add Program Group Item',
    description: 'group_name is used for grouping value',
  })
  @Post('program/group')
  async add(
    @Body() parameter: ProgramGroupAddDTO,
  ): Promise<ProgramGroupAddDTOResponse> {
    return await this.programGroupService.addProgramGroup(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit Program Group Item',
    description: 'group_name is used for grouping value',
  })
  @Put('program/group/:_id/edit')
  async edit(
    @Body() data: ProgramGroupEditDTO,
    @Param() param,
  ): Promise<ProgramGroupEditDTOResponse> {
    return await this.programGroupService.editProgramGroup(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Program Group Item',
    description: '',
  })
  @Delete('program/group/:_id/delete')
  async delete(@Param() parameter): Promise<ProgramGroupDeleteDTOResponse> {
    return await this.programGroupService.deleteBank(parameter._id);
  }
}
