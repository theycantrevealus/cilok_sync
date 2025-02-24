import { Authorization } from '@/decorators/auth.decorator';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post, Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOAuth2, ApiOperation, ApiTags } from '@nestjs/swagger';
import {PoineventService} from "@/e2ebi/services/poinevent.service";
import {PoineventAddDTO} from "@/e2ebi/dtos/poinevent.dto";
import {SetConfigDTOResponse} from "@/application/dto/set.config.dto";

@ApiTags('Integrate BI')
@Controller({ path: 'e2ebi', version: '1' })
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class E2ebiController {
  constructor(
    private poineventService: PoineventService,
  ) {}

  @ApiOperation({
    summary: 'Integrate point BI',
    description:
      'integrate',
  })
  @UseGuards(OAuth2Guard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiOAuth2(['oauth2'])
  @HttpCode(HttpStatus.OK)
  @Post('poinevent')
  async poineventAdd(
    @Req() req,
    @Body() payload: PoineventAddDTO,
  ): Promise<SetConfigDTOResponse> {
    return await this.poineventService.post(payload);
  }
}
