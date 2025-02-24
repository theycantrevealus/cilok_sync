import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseFilters,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Authorization } from '@/decorators/auth.decorator';
import { AllExceptionsFilter } from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';

import { VoteService } from '../services/vote.service';
import { VoteResponseDto } from '../dto/vote.response';
import { VoteResponseSingleDto } from '../dto/vote.single.response';
import { MyVoteResponseDto } from '../dto/myvote.response';
import { VoteResultResponseDto } from '../dto/vote.result.response';

@Controller('voting')
@ApiTags('Voting')
@UseFilters(AllExceptionsFilter)
export class VoteController {
  constructor(private voteService: VoteService) {
    //
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'List of Voting',
    description: 'Get all list of available voting',
  })
  @ApiQuery({
    name: 'skip',
    type: String,
    required: false,
    description: `Offset data, will start record after specified value.`,
  })
  @ApiQuery({
    name: 'limit',
    type: String,
    required: false,
    description: `Limit record, default is last 5 records ( configurable )`,
  })
  @ApiQuery({
    name: 'transaction_id',
    type: String,
    required: false,
    description: `Channel transaction id`,
  })
  @ApiQuery({
    name: 'channel_id',
    type: String,
    required: false,
    description: `Channel information from source application`,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    required: false,
    description: `Return only data matching to filter<br>
    { "code": "X", "name": "Y" }
    `,
  })
  @ApiQuery({
    name: 'additional_param',
    type: String,
    required: false,
    description: `Additional	parameter	if needed, with format :<br>
    { "code": "X", "name": "Y" }
    `,
  })
  @ApiOkResponse({
    description: "response",
    type: VoteResponseDto
  })
  @Version('1')
  @Get('')
  async voting_all(@Param() param, @Query() query) {
    return await this.voteService.voting_all(query);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Voting Detail',
    description: 'Get detail from voting',
  })
  @ApiQuery({
    name: 'transaction_id',
    type: String,
    required: false,
    description: `Channel transaction id`,
  })
  @ApiQuery({
    name: 'channel_id',
    type: String,
    required: false,
    description: `Channel information from source application`,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    required: true,
    description: `Return only data matching to filter<br>
    { "code": "X", "name": "Y" }
    `,
  })
  @ApiQuery({
    name: 'additional_param',
    type: String,
    required: false,
    description: `Additional	parameter	if needed, with format :<br>
    { "code": "X", "name": "Y" }
    `,
  })
  @ApiOkResponse({
    description: "response of detail vote",
    type: VoteResponseSingleDto
  })
  @Version('1')
  @Get('detail')
  async voting_detail(@Param() param, @Query() query) {
    return await this.voteService.voting_desc(query);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'My Votes',
    description: 'Get total vote from customer',
  })
  @ApiParam({
    name: 'msisdn',
    type: String,
    required: true,
    description: 'Msisdn',
  })
  @ApiQuery({
    name: 'transaction_id',
    type: String,
    required: false,
    description: `Channel transaction id`,
  })
  @ApiQuery({
    name: 'channel_id',
    type: String,
    required: false,
    description: `Channel information from source application`,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    required: false,
    description: `Return only data matching to filter<br>
    { "code": "X", "name": "Y" }
    `,
  })
  @ApiQuery({
    name: 'additional_param',
    type: String,
    required: false,
    description: `Additional	parameter	if needed, with format :<br>
    { "code": "X", "name": "Y" }
    `,
  })
  @ApiOkResponse({
    description: "response of my vote",
    type : MyVoteResponseDto
  })
  @Version('1')
  @Get(':msisdn/voting')
  async my_votes(@Param() param, @Query() query) {
    // TODO: Implementation Filters
    return await this.voteService.my_votes(param.msisdn, query);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Voting Result',
    description: 'Get voting result',
  })
  @ApiParam({
    name: 'keyword_id',
    type: String,
    required: true,
    description: 'Keyword ID',
  })
  @ApiOkResponse({
    type: VoteResultResponseDto
  })
  @Version('1')
  @Get(':keyword_id/results')
  async vote_result(@Param() param, @Query() query) {
    return await this.voteService.vote_result(param.keyword_id);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Download Voting Msisdn Result',
    description: 'For download file, the content is list of voters msisdn',
  })
  @ApiParam({
    name: 'keyword_id',
    type: String,
    required: true,
    description: 'Keyword ID',
  })
  @Version('1')
  @Get(':keyword_id/msisdn')
  async vote_result_msisdn(
    @Res({ passthrough: true }) res: Response,
    @Param() param,
    @Query() query,
  ) {
    return await this.voteService.vote_result_msisdn(res, param.keyword_id);
  }

  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation({
    summary: 'Voting Detail by Keyword',
    description: 'Get detail from voting',
  })
  @ApiParam({
    name: 'keyword',
    type: String,
    required: true,
    description: 'Keyword',
  })
  @ApiQuery({
    name: 'skip',
    type: String,
    required: false,
    description: `Offset data, will start record after specified value.`,
  })
  @ApiQuery({
    name: 'limit',
    type: String,
    required: false,
    description: `Limit record, default is last 5 records ( configurable )`,
  })
  @ApiQuery({
    name: 'transaction_id',
    type: String,
    required: false,
    description: `Channel transaction id`,
  })
  @ApiQuery({
    name: 'channel_id',
    type: String,
    required: false,
    description: `Channel information from source application`,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    required: false,
    description: `Return only data matching to filter<br>
    { "code": "X", "name": "Y" }
    `,
  })
  @ApiOkResponse({
    description: "response of detail vote",
    type: VoteResponseSingleDto
  })
  @Version('1')
  @Get('/:keyword/voting-summary')
  async voting_detail_by_keyword(@Param() param, @Query() query) {
    const {keyword} = param;
    return await this.voteService.voting_detail(keyword, query);
  }
}
