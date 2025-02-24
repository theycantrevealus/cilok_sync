import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiOAuth2, ApiTags } from '@nestjs/swagger';

import { Authorization } from '@/decorators/auth.decorator';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LogOauthRefreshTokenService } from '@/logging/services/oauth/oauth.service';

import { AccountRefreshDTO } from '../../dto/refresh.dto';
import { RefreshTokenService } from '../../services/refresh-token/refresh-token.service';

@Controller('oauth')
@ApiTags('Oauth')
export class RefreshTokenController {
  private refreshTokenService: RefreshTokenService;
  private logService: LogOauthRefreshTokenService;

  constructor(
    refreshTokenService: RefreshTokenService,
    logService: LogOauthRefreshTokenService,
  ) {
    this.refreshTokenService = refreshTokenService;
    this.logService = logService;
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Post('refresh-token')
  @Authorization(true)
  @Version('1')
  @HttpCode(200)
  async refreshToken(@Body() request: AccountRefreshDTO, @Req() req) {
    return await this.refreshTokenService.getRefreshTokenData(request, {
      auth: req.headers.authorization,
    });

    // return this.refreshTokenService.refresh_token({
    //   auth: req.headers.authorization,
    //   request: req.body,
    // });
  }
}
