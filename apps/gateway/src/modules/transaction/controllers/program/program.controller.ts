import {
  Body,
  Controller, Inject,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
  Version
} from "@nestjs/common";
import { ApiOAuth2, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Authorization, CredentialAccount } from '@/decorators/auth.decorator';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { GlobalTransactionApiResponse } from '@/transaction/dtos/global.transaction.property.dto';
import { ApiOperationProgram } from '@/transaction/dtos/program/program.property.dto';
import { ProgramWinner } from '@/transaction/models/program/program.winner.model';
import { ProgramService } from '@/transaction/services/program/program.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class TransactionProgramController {
  constructor(@Inject(ProgramService) private programService: ProgramService) {
    //
  }

  /* Update KYC Winner Profile */
  @UseGuards(OAuth2Guard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiOAuth2(['oauth2'])
  @ApiOperation(ApiOperationProgram.winner)
  @ApiResponse(GlobalTransactionApiResponse.R200)
  @ApiResponse(GlobalTransactionApiResponse.R400)
  @ApiResponse(GlobalTransactionApiResponse.R403)
  @ApiResponse(GlobalTransactionApiResponse.R404)
  @ApiResponse(GlobalTransactionApiResponse.R405)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @ApiResponse(GlobalTransactionApiResponse.R500)
  @Version('1')
  @Post('program/winner')
  async program_winner(
    @Body() data: ProgramWinner,
    @CredentialAccount() account,
    @Req() req,
  ): Promise<GlobalTransactionResponse> {
    return await this.programService.program_winner(data, account, req.headers.authorization);
  }
}
