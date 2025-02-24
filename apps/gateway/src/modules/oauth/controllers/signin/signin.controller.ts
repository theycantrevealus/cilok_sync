import {
  Body,
  CacheInterceptor,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseFilters,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';

import { Authorization } from '@/decorators/auth.decorator';
import { AllExceptionsFilter, RequestValidatorFilter, RequestValidatorFilterCustom } from '@/filters/validator.filter';

import { AccountLoginDTO } from '../../dto/login.dto';
import { SignInService } from '../../services/signin/signin.service';

@Controller('oauth')
@ApiTags('Oauth')
@UseFilters(AllExceptionsFilter)
export class SigninController {
  constructor(@Inject(SignInService) private signInService: SignInService) {}

  @Post('signin')
  @Authorization(false)
  // @ApiOAuth2(['oauth2'])
  // @UseGuards(OAuth2Guard)
  @UseInterceptors(CacheInterceptor)
  @HttpCode(200)
  @Version('1')
  async signIn(
    @Body() request: AccountLoginDTO,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    // const ip = req.clientIp ? req.clientIp : requestIp.getClientIp(req);
    return await this.signInService.getSignInData(
      {
        locale: request.locale ? request.locale : 'id-ID',
        type: request.type,
        client_id: request.client_id,
        client_secret: request.client_secret,
        username: request.username,
        password: request.password,
      },
      '',
    );
  }
}
