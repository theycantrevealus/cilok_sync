import {
  Controller,
  Get,
  Param,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Queue } from 'bull';
import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';

import { ProgramServiceV2 } from '@/program/services/program.service.v2';
import { ProgramServiceV3 } from '../services/program.service.v3';

@Controller({ path: 'program', version: '3' })
@ApiTags('Program Management')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class ProgramControllerV3 {
  private programService: ProgramServiceV3;

  constructor(
    programService: ProgramServiceV3,
  ) {
    this.programService = programService;
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Find program item by ID',
    description: 'Showing detail of program without program parent detail',
  })
  @ApiParam({
    name: '_id',
  })
  @Get(':_id/detail')
  async findProgramById(@Param() parameter) {
    return await this.programService.findProgramById(parameter._id);
  }
}
