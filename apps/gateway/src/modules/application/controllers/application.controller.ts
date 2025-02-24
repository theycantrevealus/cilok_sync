import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';

import { Authorization } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';

import { SetConfigDTO } from '../dto/set.config.dto';
import { ApplicationService } from '../services/application.service';

@Controller({ path: 'configuration', version: '1' })
@ApiTags('Application Configuration')
export class ApplicationController {
  constructor(
    @Inject(ApplicationService)
    private readonly appsService: ApplicationService,
  ) {}

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Endpoint sync',
    description: 'Populate all meta authorize and sync with core',
  })
  @Get('populate')
  async populate(@Req() req) {
    return this.appsService.repopulateURL(req);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Load all configuration',
    description: 'Load all configuration',
  })
  @Get()
  async get() {
    return await this.appsService.loadConfig();
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Add Configuration',
    description: 'Add Configuration',
  })
  @Post()
  async add(@Body() parameter: SetConfigDTO) {
    return await this.appsService.newConfig(parameter);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Edit Configuration',
    description: 'Edit Configuration',
  })
  @Put(':_id/edit')
  async edit_customer(@Body() data: SetConfigDTO, @Param() param) {
    return await this.appsService.editConfig(data, param._id);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiParam({
    name: '_id',
  })
  @ApiOperation({
    summary: 'Delete Configuration',
    description: 'Delete Configuration',
  })
  @Delete(':_id/delete')
  async delete_customer(@Param() parameter) {
    return await this.appsService.deleteConfig(parameter._id);
  }

  @Post('/upload')
  public async upload2Files(@Request() request) {
    const files = request.files();

    for await (const file of files) {
      const writeStream = fs.createWriteStream(
        `./document-upload-storage/${file.filename}`,
      );

      file.file.pipe(writeStream);
    }
    return { message: 'files uploaded' };
  }

  /**
   * Redis API
   */
  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Reload Redis',
    description: 'Reload All Redis Data',
  })
  @Get('redis/reload')
  async redis_reload(@Req() req) {
    return this.appsService.redis_reload(req);
  }

  @ApiOperation({
    summary: 'Reload Authorization meta',
    description: 'Reload All Authorization Data',
  })
  @Get('authorization/reload')
  async authorization_reload(@Req() req) {
    return this.appsService.auth_reload(req);
  }

  // @UseGuards(OAuth2Guard)
  // @Authorization(true)
  // @ApiOAuth2(['oauth2'])
  @ApiOperation({
    summary: 'Delete Redis',
    description: 'Delete All Redis Data with given key',
  })
  @ApiParam({
    name: 'key',
  })
  @Get('redis/delete/:key')
  async redis_delete(@Req() req, @Param() param) {
    return await this.appsService.redis_delete(req, param);
  }
}
