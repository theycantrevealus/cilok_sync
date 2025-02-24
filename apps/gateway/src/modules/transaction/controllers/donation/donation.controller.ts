import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseFilters,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Authorization } from '@/decorators/auth.decorator';
import { GlobalTransactionResponse } from '@/dtos/response.transaction.dto';
import {
  
  
  RequestValidatorFilter,
} from '@/filters/validator.filter';
import { OAuth2Guard } from '@/guards/oauth.guard';
import {
  ViewDonationParamDTO,
  ViewDonationQueryDTO,
} from '@/transaction/dtos/donation/donation.keyword.check.property.dto';
import {
  ApiOperationDonation,
  ApiParamMyDonation,
  ApiQueryDonationKeyword,
  ApiQueryMyDonation,
} from '@/transaction/dtos/donation/donation.property.dto';
import {
  MyDonationParamDTO,
  MyDonationQueryDTO,
} from '@/transaction/dtos/donation/my-donation.dto';
import { DonationService } from '@/transaction/services/donation/donation.service';

@Controller('')
@ApiTags('Transaction')
@UseFilters(
  
  
  new RequestValidatorFilter(),
)
export class DonationController {
  constructor(
    @Inject(DonationService) private donationService: DonationService,
  ) {
    //
  }

  /* My Donation */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationDonation.my_donation)
  @ApiParam(ApiParamMyDonation.msisdn)
  @ApiQuery(ApiQueryMyDonation.additional_param)
  @ApiQuery(ApiQueryMyDonation.filter)
  @ApiQuery(ApiQueryMyDonation.channel_id)
  @ApiQuery(ApiQueryMyDonation.transaction_id)
  @ApiQuery(ApiQueryMyDonation.skip)
  @ApiQuery(ApiQueryMyDonation.limit)
  @Version('1')
  @Get(':msisdn/donation')
  async my_donation(
    @Param() param: MyDonationParamDTO,
    @Query() query: MyDonationQueryDTO,
  ) {
    return await this.donationService.my_donation(param, query);
  }

  /* Check Donation by Keyword */
  @UseGuards(OAuth2Guard)
  @ApiOAuth2(['oauth2'])
  @Authorization(true)
  @ApiOperation(ApiOperationDonation.check_donation_by_keyword)
  @ApiParam(ApiQueryDonationKeyword.keyword)
  // @ApiQuery(ApiQueryDonationKeyword.keyword)
  @ApiQuery(ApiQueryDonationKeyword.transaction_id)
  @ApiQuery(ApiQueryDonationKeyword.channel_id)
  @ApiQuery(ApiQueryDonationKeyword.filter)
  @ApiQuery(ApiQueryDonationKeyword.additional_param)
  @Version('1')
  @Get(':keyword/donation/summary-keyword')
  async donation_by_keyword(
    @Param() param: ViewDonationParamDTO,
    @Query() query: ViewDonationQueryDTO,
  ): //
  Promise<GlobalTransactionResponse> {
    return await this.donationService.getDonationByKeyword(param, query);
  }
}
