import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiOAuth2, ApiTags } from '@nestjs/swagger';

import { OAuth2Guard } from '@/guards/oauth.guard';
import { LogOauthSignOutService } from '@/logging/services/oauth/oauth.service';
import { AccountLogoutDTO } from '@/oauth/dto/logout.dto';

import { SignOutService } from '../../services/signout/signout.service';

@Controller('oauth')
@ApiTags('Oauth')
export class SignoutController {
  private signOutService: SignOutService;
  private logService: LogOauthSignOutService;

  constructor(
    signOutService: SignOutService,
    logService: LogOauthSignOutService,
  ) {
    this.signOutService = signOutService;
    this.logService = logService;
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Post('signout')
  @Version('1')
  signOut(@Body() request: AccountLogoutDTO, @Req() req): Promise<any> {
    return this.signOutService.getSignOutData(
      request,
      req.headers.authorization,
    );
  }
}
