import { Authorization } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import {Body, Controller, Get, Param, Post, Put, UseGuards} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CronApiOperations, cronEditConfigBodyDTO, cronEditDataBodyDTO, cronGetConfigByKeyParam } from './cron.property';
import { CronService } from './cron.service';
import {ExampleJobSetup} from "@/cron/sftp/services/example.job.setup";

@Controller({ path: 'cronjob', version: '1' })
@ApiTags('CRONJOB Management')
export class CronController {

  constructor(
    private cronService: CronService,
    private exampleJobSetup: ExampleJobSetup,
  ) { }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(CronApiOperations.GetAllCronjob)
  @Get()
  async getAllCronjob() {
    return await this.cronService.getAllCronjob();
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
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(CronApiOperations.GetAllCronjobConfig)
  @Get('config')
  async getAllCronjobConfig() {
    return await this.cronService.getAllCronjobConfig();
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
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(CronApiOperations.GetAllCronjobConfigByKey)
  @Get('config/:key')
  async getAllCronjobConfigByKey(
    @Param() param: cronGetConfigByKeyParam,
  ) {
    return await this.cronService.getAllCronjobConfigByKey(param.key);
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
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(CronApiOperations.EditCronjobConfig)
  @Put('config/edit')
  async editConfig(
    @Body() data: cronEditConfigBodyDTO,
  ) {
    return await this.cronService.editCronjobConfig(data.config);
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
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(CronApiOperations.EditCronjobData)
  @Put('data/edit')
  async editData(
    @Body() data: cronEditDataBodyDTO,
  ) {
    return await this.cronService.editCronjobData(data.data);
  }

  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(CronApiOperations.TestSftpGeneralCronjob)
  @Post('sftp-test')
  async testSftpCron() {
    return await this.exampleJobSetup.runCronJob();
  }
}

