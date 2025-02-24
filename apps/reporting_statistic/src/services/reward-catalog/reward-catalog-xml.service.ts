import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import mongoose, { Model, Types } from 'mongoose';
import { create as xmlCreate } from 'xmlbuilder';

import { ApplicationService } from '@/application/services/application.service';
import { getProductID } from '@/application/utils/Product/product';
import {
  CustomerBrand,
  CustomerBrandDocument,
} from '@/customer/models/customer.brand.model';
import {
  CustomerTier,
  CustomerTierDocument,
} from '@/customer/models/customer.tier.model';
import { RewardCatalogFilterDTO } from '@/keyword/dto/reward.catalog.filter';
import { Keyword, KeywordDocument } from '@/keyword/models/keyword.model';
import { KeywordService } from '@/keyword/services/keyword.service';
import { Location, LocationDocument } from '@/location/models/location.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';
import { Stock, StockDocument } from '@/stock/models/stock.model';
import { StockService } from '@/stock/services/stock.service';
import { Vote, VoteDocument } from '@/vote/models/vote.model';
import {
  VoteOption,
  VoteOptionDocument,
} from '@/vote/models/vote_option.model';

import { ReportingServiceResult } from '../../../../reporting_generation/src/model/reporting_service_result';
const moment = require('moment-timezone');
const path = require('path');
const he = require('he');

@Injectable()
export class RewardCatalogXMLService {
  constructor(
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>,
    @InjectModel(Lov.name) private lovsModel: Model<LovDocument>,
    @InjectModel(CustomerBrand.name)
    private readonly customerBrandModel: Model<CustomerBrandDocument>,
    @InjectModel(CustomerTier.name)
    private readonly customerTierModel: Model<CustomerTierDocument>,
    @InjectModel(Location.name)
    private readonly locationsModel: Model<LocationDocument>,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    private serviceStock: StockService,
    @InjectModel(Stock.name)
    private readonly stockModel: Model<StockDocument>,

    @InjectModel(Vote.name)
    private voteModel: Model<VoteDocument>,

    @InjectModel(VoteOption.name)
    private voteOptionModel: Model<VoteOptionDocument>,

    private appsService: ApplicationService,
  ) {
    //
  }

  private async getRewardCatalog(filter: any) {
    const statusKeywordAprrove = new Types.ObjectId(
      await this.appsService.getConfig('DEFAULT_STATUS_KEYWORD_APPROVE_HQ'),
    );
    try {
      const query: any = {};
      const projection: any = {
        eligibility: false,
        notification: false,
        created_by: false,
      };

      if (filter.keyword) {
        query['reward_catalog.keyword'] = filter.keyword;
      }

      if (filter.category) {
        query['reward_catalog.category'] = filter.category;
      }

      if (filter.merchant_id) {
        query['reward_catalog.merchant_id'] = filter.merchant_id;
      }

      const match: any = {
        $or: [
          { hq_approver: { $exists: true } },
          { hq_approver: { $exists: false } },
        ],
      };

      let data;

      if (filter.keyword && filter.category && filter.merchant_id) {
        data = await this.keywordModel
          .aggregate([
            {
              $match: {
                'reward_catalog.keyword': filter.keyword,
                'reward_catalog.category': filter.category,
                'reward_catalog.merchant_id': filter.merchant_id,
                keyword_edit: null,
              },
            },
            {
              $match: match,
            },
            {
              $project: projection,
            },
          ])
          .exec();
      } else if (filter.keyword && filter.category) {
        data = await this.keywordModel
          .aggregate([
            {
              $match: {
                'reward_catalog.keyword': filter.keyword,
                'reward_catalog.category': filter.category,
                keyword_edit: null,
              },
            },
            {
              $match: match,
            },
            {
              $project: projection,
            },
          ])
          .exec();
      } else if (filter.keyword && filter.merchant_id) {
        data = await this.keywordModel
          .aggregate([
            {
              $match: {
                'reward_catalog.keyword': filter.keyword,
                'reward_catalog.merchant_id': filter.merchant_id,
                keyword_edit: null,
              },
            },
            {
              $match: match,
            },
            {
              $project: projection,
            },
          ])
          .exec();
      } else if (filter.category && filter.merchant_id) {
        data = await this.keywordModel
          .aggregate([
            {
              $match: {
                'reward_catalog.category': filter.category,
                'reward_catalog.merchant_id': filter.merchant_id,
                keyword_edit: null,
              },
            },
            {
              $match: match,
            },
            {
              $project: projection,
            },
          ])
          .exec();
      } else if (filter.category) {
        data = await this.keywordModel
          .aggregate([
            {
              $match: {
                'reward_catalog.category': filter.category,
                keyword_edit: null,
              },
            },
            {
              $match: match,
            },
            {
              $project: projection,
            },
          ])
          .exec();
      } else if (filter.keyword) {
        data = await this.keywordModel
          .aggregate([
            {
              $match: {
                'reward_catalog.keyword': filter.keyword,
                keyword_edit: null,
              },
            },
            {
              $match: match,
            },
            {
              $project: projection,
            },
          ])
          .exec();
      } else if (filter.merchant_id) {
        data = await this.keywordModel
          .aggregate([
            {
              $match: {
                'reward_catalog.merchant_id': filter.merchant_id,
              },
            },
            {
              $match: match,
            },
            {
              $project: projection,
            },
          ])
          .exec();
      } else {
        data = await this.keywordModel.aggregate([
          {
            $match: {
              'reward_catalog.keyword': { $not: /-/ },
              is_stoped: false,
              hq_approver: { $exists: true },
              need_review_after_edit: false,
              keyword_approval: statusKeywordAprrove,
              is_draft: false,
            },
          },
          {
            $project: projection,
          },
        ]);
      }
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async generateRewardCatalogXML(
    filter: RewardCatalogFilterDTO,
    payload: any,
  ): Promise<any> {
    const serviceResult = new ReportingServiceResult({
      is_error: false,
      message: '',
      stack: '',
    });
    try {
      const data = await this.getRewardCatalog(filter);
      if (data === undefined) {
        console.log('Data tidak ditemukan atau tidak memiliki nilai.');
        serviceResult.custom_code = HttpStatus.BAD_REQUEST;
        serviceResult.message = 'Generate Reward Catalog XML: Not found!';
        serviceResult.stack = 'Data not found or not contain value';

        return serviceResult;
      } else {
        let rowNum = 1;
        const rewardCatalog = data.map(async (i, index) => {
          try {
            const stockRemainingXML = await this.getStockRemaining(
              i?.reward_catalog?.keyword,
            );
            const dateNow = moment();
            const effectiveTo = moment(i?.reward_catalog?.to);
            const effectiveFrom = moment(i?.reward_catalog?.effective);

            const isEffectiveTo = effectiveTo.isBefore(dateNow);
            const isEffectiveFrom = effectiveFrom.isAfter(dateNow);
            if (
              i.reward_catalog &&
              i?.reward_catalog?.created_at !== '' &&
              stockRemainingXML !== 0 &&
              isEffectiveTo === false &&
              isEffectiveFrom === false
            ) {
              let appliedOn = null;
              let spesialappliedOn = null;
              const appliedOnObj = {};
              const specialAppliedOnObj = {}; // Initialize specialAppliedOn as an empty object
              let catalog_type = null;
              let catalog_display = null;
              let catalog_typeObj = {};
              let catalog_displayObj = {};
              let channel = {};
              const province = null;
              const city = null;
              let provinceObj = null;
              let cityObj = null;
              let approval;
              let is_corporate;
              let bonus_type = null;
              let donation = null;
              let auction = null;
              let voting = null;
              const votingOption = '';
              let image_promo_loc = null;
              let image_detail_loc = null;
              let image_small = null;
              let image_medium = null;
              let image_large = null;
              let image_detail_1_loc = null;
              let image_detail_2_loc = null;
              let image_detail_3_loc = null;
              let banefit_category = null;

              const bonus = i.bonus;
              if (bonus?.length > 0) {
                for (const single_bonus of bonus) {
                  bonus_type = single_bonus?.bonus_type;
                  switch (single_bonus?.bonus_type) {
                    case 'donation':
                      try {
                        donation = await this.getDonationXML(single_bonus);
                      } catch (error) {
                        console.error('Error Donation Bonus', error);
                        break;
                      }
                      break;
                    case 'auction':
                      try {
                        auction = await this.getAuctionXML(single_bonus);
                      } catch (err) {
                        console.error('Error Auction Bonus:', err);
                        // Hentikan perulangan jika terjadi error
                        break;
                      }
                      break;
                    case 'voting':
                      try {
                        voting = await this.getVotingXML(i);
                      } catch (error) {
                        console.error('Error: Voting Bonus', error);
                        // Hentikan perulangan jika terjadi error
                        break;
                      }
                      break;
                    default:
                      break;
                  }
                }
              }
              // console.log('>>>>> Voting data.', voting);

              //DEFAULT TAG APPLIEDON
              appliedOnObj['IS_LOOP'] = 0;
              appliedOnObj['IS_AS'] = 0;
              appliedOnObj['IS_HALO'] = 0;
              appliedOnObj['IS_SIMPATI'] = 0;
              if (i?.reward_catalog?.applied_on?.length > 0) {
                if (i?.reward_catalog?.applied_on) {
                  appliedOn = await this.getAppliedOn(
                    i?.reward_catalog?.applied_on,
                  );
                  appliedOn?.forEach((applied) => {
                    if (applied === 'is_as') {
                      appliedOnObj['IS_AS'] = 1;
                    }
                    if (applied === 'is_halo') {
                      appliedOnObj['IS_HALO'] = 1;
                    }
                    if (applied === 'is_simpati') {
                      appliedOnObj['IS_SIMPATI'] = 1;
                    }
                    if (applied === 'is_loop') {
                      appliedOnObj['IS_LOOP'] = 1;
                    }
                  });
                }
              } else {
                appliedOnObj['IS_LOOP'] = 1;
                appliedOnObj['IS_AS'] = 1;
                appliedOnObj['IS_HALO'] = 1;
                appliedOnObj['IS_SIMPATI'] = 1;
              }

              //DEFAULT TAG SPECIAL APPLIEDON
              specialAppliedOnObj['SPECIAL_LOOP'] = 0;
              specialAppliedOnObj['SPECIAL_AS'] = 0;
              specialAppliedOnObj['SPECIAL_HALO'] = 0;
              specialAppliedOnObj['SPECIAL_SIMPATI'] = 0;
              if (i?.reward_catalog?.applied_on?.length > 0) {
                if (i?.reward_catalog?.special_applied_on) {
                  spesialappliedOn = await this.getAppliedOn(
                    i?.reward_catalog?.special_applied_on,
                  );
                  spesialappliedOn?.forEach((spclapplied) => {
                    if (spclapplied === 'is_as') {
                      specialAppliedOnObj['SPECIAL_AS'] = 1;
                    }
                    if (spclapplied === 'is_halo') {
                      specialAppliedOnObj['SPECIAL_HALO'] = 1;
                    }
                    if (spclapplied === 'is_simpati') {
                      specialAppliedOnObj['SPECIAL_SIMPATI'] = 1;
                    }
                    if (spclapplied === 'is_loop') {
                      specialAppliedOnObj['SPECIAL_LOOP'] = 1;
                    }
                  });
                }
              } else {
                specialAppliedOnObj['SPECIAL_LOOP'] = 1;
                specialAppliedOnObj['SPECIAL_AS'] = 1;
                specialAppliedOnObj['SPECIAL_HALO'] = 1;
                specialAppliedOnObj['SPECIAL_SIMPATI'] = 1;
              }
              // if (voting) {
              //   votingOption = voting?.OPTION_VOTING?.map((option, index) => ({
              //     [`OPTION_${index + 1}`]: option,
              //   }));
              // }

              if (
                i?.reward_catalog?.catalog_type ||
                i?.reward_catalog?.catalog_display ||
                i?.reward_catalog?.channel
              ) {
                if (i?.reward_catalog?.catalog_type?.length > 0) {
                  catalog_type = await this.getCatalogAndDisplay(
                    i?.reward_catalog?.catalog_type,
                  );
                  catalog_typeObj = catalog_type?.join(',');
                } else {
                  catalog_typeObj = 'GOLD,SILVER,DIAMOND,PLATINUM';
                }
                if (i?.reward_catalog?.catalog_type?.length > 0) {
                  catalog_display = await this.getCatalogAndDisplay(
                    i?.reward_catalog?.catalog_display,
                  );
                  catalog_displayObj = catalog_display?.join(',');
                } else {
                  catalog_displayObj = 'GOLD,SILVER,DIAMOND,PLATINUM';
                }

                channel = i?.reward_catalog?.channel?.join(',');
              }

              if (i?.reward_catalog?.province && i?.reward_catalog?.city) {
                if (Array.isArray(i?.reward_catalog?.city)) {
                  const cityUppercase = i?.reward_catalog?.city?.join(',');
                  cityObj = cityUppercase ? cityUppercase?.toUpperCase() : null;
                } else if (
                  Array.isArray(i?.reward_catalog?.city) &&
                  i?.reward_catalog?.city.length === 0
                ) {
                  cityObj = 'NASIONAL';
                } else if (typeof i?.reward_catalog?.city === 'string') {
                  cityObj = i?.reward_catalog?.city;
                }

                if (Array.isArray(i?.reward_catalog?.province)) {
                  const provinceUppercase =
                    i?.reward_catalog?.province?.join(',');
                  provinceObj = provinceUppercase
                    ? provinceUppercase?.toUpperCase()
                    : null;
                } else if (
                  Array.isArray(i?.reward_catalog?.province) &&
                  i?.reward_catalog?.province.length === 0
                ) {
                  provinceObj = 'NASIONAL';
                } else if (typeof i?.reward_catalog?.province === 'string') {
                  provinceObj = i?.reward_catalog?.province;
                }
              }

              if (
                i.reward_catalog?.enable_for_corporate_subs?.toUpperCase() ===
                'CORPORATEONLY'
              ) {
                is_corporate = 1;
              } else if (
                i.reward_catalog?.enable_for_corporate_subs?.toUpperCase() ===
                  'IRISANCONSUMER' ||
                i.reward_catalog?.enable_for_corporate_subs?.toUpperCase() ===
                  'CORPORATE'
              ) {
                is_corporate = 0;
              } else if (
                i.reward_catalog?.enable_for_corporate_subs?.toUpperCase() ===
                'CONSUMERONLY'
              ) {
                is_corporate = '';
              }

              if (i?.hq_approver) {
                approval = 1;
              } else {
                approval = 0;
              }
              const startPeriod = moment.tz(
                i?.reward_catalog?.effective,
                'Asia/Jakarta',
              );

              const endPeriod = moment.tz(
                i?.reward_catalog?.to,
                'Asia/Jakarta',
              );

              if (
                i?.reward_catalog?.image_promo_loc ||
                i?.reward_catalog?.image_detail_loc ||
                i?.reward_catalog?.image_small ||
                i?.reward_catalog?.image_medium ||
                i?.reward_catalog?.image_large
              ) {
                if (
                  i?.reward_catalog?.image_promo_loc &&
                  typeof i.reward_catalog.image_promo_loc === 'string'
                ) {
                  const imagePromoParts =
                    i.reward_catalog.image_promo_loc.split('/img');
                  image_promo_loc = 'img' + imagePromoParts[1];
                }

                if (i?.reward_catalog?.image_detail_loc) {
                  if (typeof i.reward_catalog.image_detail_loc === 'string') {
                    const imageDetailParts =
                      i.reward_catalog.image_detail_loc.split('/img');
                    image_detail_loc = 'img' + imageDetailParts[1];
                  }
                }

                if (i?.reward_catalog?.image_small) {
                  if (typeof i.reward_catalog.image_small === 'string') {
                    const imageSmallParts =
                      i.reward_catalog.image_small.split('/img');
                    image_small = 'img' + imageSmallParts[1];
                  }
                }

                if (i?.reward_catalog?.image_medium) {
                  if (typeof i.reward_catalog.image_medium === 'string') {
                    const imageMediumParts =
                      i.reward_catalog.image_medium.split('/img');
                    image_medium = 'img' + imageMediumParts[1];
                  }
                }

                if (i?.reward_catalog?.image_large) {
                  if (typeof i.reward_catalog.image_large === 'string') {
                    const imageLargeParts =
                      i.reward_catalog.image_large.split('/img');
                    image_large = 'img' + imageLargeParts[1];
                  }
                }
              }

              if (i?.reward_catalog?.image_detail1_loc) {
                const imageDetail1Match =
                  i?.reward_catalog?.image_detail1_loc?.split('/img');
                if (imageDetail1Match) {
                  image_detail_1_loc = 'img' + imageDetail1Match[1];
                } else {
                  // Handle when match is not found
                  image_detail_1_loc = 'img/default'; // Set a default value or handle the case accordingly
                }
              }

              if (i?.reward_catalog?.image_detail2_loc) {
                const imageDetail2Match =
                  i?.reward_catalog?.image_detail2_loc?.split('/img');
                if (imageDetail2Match) {
                  image_detail_2_loc = 'img' + imageDetail2Match[1];
                } else {
                  // Handle when match is not found
                  image_detail_2_loc = 'img/default'; // Set a default value or handle the case accordingly
                }
              }

              if (i?.reward_catalog?.image_detail3_loc) {
                const imageDetail3Match =
                  i?.reward_catalog?.image_detail3_loc?.split('/img');
                if (imageDetail3Match) {
                  image_detail_3_loc = 'img' + imageDetail3Match[1];
                } else {
                  // Handle when match is not found
                  image_detail_3_loc = 'img/default'; // Set a default value or handle the case accordingly
                }
              }

              //PEMBUATAN VALUE TAG SEGMENT

              //PEMBENTUKAN TAG BANEFIT_CATEGORY LOWCR-SPRINT-3 Nomor 84
              const benefitCategory = i.reward_catalog?.benefit_category;

              if (benefitCategory && typeof benefitCategory === 'string') {
                const objectId = mongoose.Types.ObjectId.isValid(
                  benefitCategory,
                )
                  ? new mongoose.Types.ObjectId(benefitCategory)
                  : null;

                if (objectId) {
                  const foundDocument = await this.lovsModel.findOne({
                    _id: objectId,
                  });

                  if (foundDocument && foundDocument.set_value !== undefined) {
                    banefit_category = foundDocument.set_value;
                  }
                }
              }

              const ROW = {
                '@num': rowNum++,
                APPROVAL: approval,
                KEYWORD: i.reward_catalog.keyword
                  ? i.reward_catalog.keyword
                  : '',
                MERCHANT_ID: i.reward_catalog.merchant_id
                  ? i.reward_catalog.merchant_id
                  : '',
                HASHTAG: i.reward_catalog.hashtag_1 ?? '',
                TITLE: i.reward_catalog.title ?? i.reward_catalog.title ?? '',
                TEASER: i.reward_catalog.teaser ?? '',
                TEASER_EN: i.reward_catalog.teaser ?? '',
                DESCRIPTION: i.reward_catalog.description ?? '',
                DESCRIPTION_EN: i.reward_catalog.description_en ?? '',
                FAQ: i.reward_catalog.title ?? '',
                FAQ_EN: i.reward_catalog.faq_en ?? '',
                HOW_TO_REDEEM: i.reward_catalog.how_to_redeem ?? '',
                HOW_TO_REDEEM_EN: i.reward_catalog.how_to_redeem_en ?? '',
                EVENT_PERIOD: `${startPeriod.format(
                  'DD MMM YYYY',
                )} sd ${endPeriod.format('DD MMM YYYY')}`,
                EXPIRY_PERIOD:
                  moment(i.reward_catalog.to).format('YYYY-MM-DD') ?? '',
                POIN: i.reward_catalog.point_keyword,
                POIN_MARK_UP: i.reward_catalog.poin_markup_display ?? '',
                ...appliedOnObj,
                ...specialAppliedOnObj,
                IS_CORPORATE: i.reward_catalog?.enable_for_corporate_subs
                  ? is_corporate
                  : '',
                IMAGE_PROMO_LOC: i.reward_catalog.image_promo_loc
                  ? image_promo_loc
                  : 'img/image_merchant/promo/',
                IMAGE_DETAIL_LOC: i.reward_catalog.image_detail_loc
                  ? image_detail_loc
                  : 'img/image_merchant/detail/',
                IMAGE_DETAIL1_LOC: i.reward_catalog.image_detail1_loc
                  ? image_detail_1_loc
                  : 'img/image_merchant/detail1/',
                IMAGE_DETAIL2_LOC: i.reward_catalog.image_detail2_loc
                  ? image_detail_2_loc
                  : 'img/image_merchant/detail2/',
                IMAGE_DETAIL3_LOC: i.reward_catalog.image_detail3_loc
                  ? image_detail_3_loc
                  : 'img/image_merchant/detail3/',
                IMAGE_SMALL: i.reward_catalog.image_small
                  ? image_small
                  : 'img/image_merchant/small/',
                IMAGE_MEDIUM: i.reward_catalog.image_medium
                  ? image_medium
                  : 'img/image_merchant/medium/',
                IMAGE_LARGE: i.reward_catalog.image_large
                  ? image_large
                  : 'img/image_merchant/large/',
                PROVINCE: provinceObj ?? '',
                CITY: cityObj ?? '',
                VIDEO: i.reward_catalog.video,
                GOOGLE_MAPS: i.reward_catalog.google_maps,
                HOT_PROMO: i.reward_catalog.hot_promo ? 1 : 0,
                SORT_HOT_PROMO: i.reward_catalog.hot_promo ? 1 : 0,
                CATALOGTYPE: i.reward_catalog.catalog_type
                  ? catalog_typeObj
                  : '',
                DISPLAYTYPE: i.reward_catalog.catalog_display
                  ? catalog_displayObj
                  : '',
                CHANNEL: channel ?? '',
                STOCK: null,
                // DONATION: donation ? {
                //   DONATION_CATEGORY: donation.DONATION_CATEGORY,
                //   MINIMUM_POIN: donation.MINIMUM_POIN,
                //   TARGET_POIN: donation.TARGET_POIN
                // } : '',
                // AUCTION: auction ? {
                //   PRIZE_IMAGE: auction.PRIZE_IMAGE,
                //   PRIZE_NAME: auction.PRIZE_NAME,
                //   PRIZE_DESCRIPTION: auction.PRIZE_DESCRIPTION,
                //   PRIZE_DESCRIPTION_EN: auction.PRIZE_DESCRIPTION_EN,
                //   MULTIPLIER_POIN: auction.MULTIPLIER_POIN,
                //   MINIMUM_BID_POIN: auction.MINIMUM_BID_POIN
                // } : '',
                VOTING: voting
                  ? {
                      VOTING_OPTION: voting.VOTING_OPTION,
                      TARGET_VOTE: voting.TARGET_VOTE,
                    }
                  : '',
                CATEGORY: i.reward_catalog.category
                  ? i.reward_catalog.category
                  : '',
                CREATED_DATE: i?.reward_catalog?.created_at
                  ? moment(i?.reward_catalog?.created_at)
                      .format('DD-MMM-YY')
                      ?.toUpperCase()
                  : '',
                MODIFIED_DATE: i?.reward_catalog?.updated_at
                  ? moment(i?.reward_catalog?.updated_at)
                      .format('DD-MMM-YY')
                      ?.toUpperCase()
                  : '',
                SORT_CATEGORY: '',
                CHECK_DONATION: '',
                ID_SEGMENT: i.reward_catalog?.microsite_segment
                  ? await this.getMicrositSegment(
                      i.reward_catalog.microsite_segment,
                    )
                  : '',
                SORT_MOST_REDEEM: '',
                // FLEXIBLE_POIN: "",
                BENEFIT_CATEGORY: banefit_category ?? '',
                TELCO_PRICE_INFO: i.reward_catalog.price_info
                  ? i.reward_catalog.price_info
                  : '',
                URL_MERCHANT: i.reward_catalog.url_merchant
                  ? i.reward_catalog.url_merchant
                  : '',
              };

              //LOGIC STOCK 0 (Unlimited dari sisi SL) jadi 999999999999
              if (stockRemainingXML == null) {
                ROW.STOCK = '999999999999';
              } else {
                ROW.STOCK = stockRemainingXML;
              }

              return ROW;
            } else {
              serviceResult.custom_code = HttpStatus.BAD_REQUEST;
              serviceResult.message += `\n01. Data reward_catalog tidak ditemukan`;
              serviceResult.stack += `$\n01. Data reward_catalog tidak ditemukan pada indeks: ${index}`;
              return null;
            }
          } catch (err) {
            serviceResult.custom_code = HttpStatus.BAD_REQUEST;
            serviceResult.message = `\n${err.message}`;
            serviceResult.stack = `$\n${err.stack}`;

            console.error(err);
            throw err;
          }
        });
        let dataRewardArr = [];
        // Filter hasil mapping yang bukan null
        const validRewardCatalogPromises = rewardCatalog.filter(
          (item) => item !== null,
        );

        if (validRewardCatalogPromises.length !== data.length) {
          console.log('Tidak semua data reward_catalog ditemukan.');
          serviceResult.message += `\n02. Not all reward catalog is found`;
          serviceResult.stack +=
            '\n02. Not all reward catalog is found: validRewardCatalogPromises.length != data.length';
        }

        // Melakukan Promise.all hanya pada hasil mapping yang valid
        const rewardCatalogPromises = await Promise.all(
          validRewardCatalogPromises,
        ).then((results) => results.filter((result) => result !== null));

        // Mengurutkan elemen-elemen berdasarkan properti '@num'
        rewardCatalogPromises.sort((a, b) => {
          if (a && b && a['@num'] && b['@num']) {
            return a['@num'] - b['@num'];
          }
          return 0;
        });
        const dir = path.resolve(__dirname, payload.generated_dir);
        const dirFileJson = `${dir}/xml-temp.json`;
        const dirFileJsonCategory = `${dir}/xml-category-temp.json`;
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        } else if (!existsSync(dirFileJson)) {
          const contentJson = '[]';
          writeFileSync(dirFileJson, contentJson);
          console.log('>>>>> File generate File Json success.');
          serviceResult.message += `\n03. File Json generate success`;
        } else if (!existsSync(dirFileJsonCategory)) {
          const contentJsonCategory = '[]';
          writeFileSync(dirFileJsonCategory, contentJsonCategory);
          console.log('>>>>> File generate File Json Category success.');
          serviceResult.message += `\n03. File Json Category generate success`;
        }

        const temfile = path.resolve(dir, 'xml-temp.json');
        const fileBuffer = readFileSync(temfile, { encoding: 'utf-8' });

        let fileData: any = [];
        if (fileBuffer.length > 0) {
          fileData = JSON.parse(fileBuffer);
        }

        // Menghapus data dari file JSON yang tidak ada dalam hasil terbaru
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        fileData = fileData.filter((fileItem) => {
          return rewardCatalogPromises.some(
            (data) => data.KEYWORD === fileItem.KEYWORD,
          );
        });

        // Menghapus data dari dataRewardArr yang tidak ada dalam hasil terbaru
        dataRewardArr = dataRewardArr.filter((data) => {
          return rewardCatalogPromises.some(
            (item) => item.KEYWORD === data.KEYWORD,
          );
        });

        // Menambahkan hasil terbaru ke dataRewardArr
        rewardCatalogPromises.forEach((data) => {
          const foundIndex = dataRewardArr.findIndex(
            (el) => el.KEYWORD === data.KEYWORD,
          );

          if (foundIndex !== -1) {
            //console.log('DATA FOUND', data.KEYWORD);
            dataRewardArr[foundIndex] = data;
          } else {
            dataRewardArr.push(data);
          }
        });

        // Memberi nomor pada setiap item di dataRewardArr
        dataRewardArr.forEach((i, index) => {
          i['@num'] = index + 1;
        });

        // Menulis kembali dataRewardArr ke file JSON
        writeFileSync(temfile, JSON.stringify(dataRewardArr, null, 4), {
          flag: 'w',
        });

        //XML CATEGORY EXPERINCE
        let dataRewardArrCategory = [];
        let rowNumCat = 1;
        const temfileCategory = path.resolve(dir, 'xml-category-temp.json');
        const fileBufferCategory = readFileSync(temfileCategory, {
          encoding: 'utf-8',
        });
        // file temp ada? menandakan sudah sempat dibuat
        if (fileBufferCategory.length > 0) {
          const fileDataCategory = JSON.parse(fileBufferCategory);
          fileDataCategory.map((p) => dataRewardArrCategory.push(p));
        }
        let image_small_additional = null;
        let image_medium_additional = null;
        let image_large_additional = null;

        let channelCategories = [];
        if (filter.category) {
          const getCategory = await this.lovsModel.find(
            {
              group_name: 'PROGRAM_EXPERIENCE',
              set_value: filter.category,
              deleted_at: null,
            },
            { set_value: 1, additional: 1 },
          );

          if (getCategory[0].additional?.image_small) {
            const imageSmallParts =
              getCategory[0].additional?.image_small?.split('/img');
            image_small_additional = imageSmallParts
              ? 'img' + imageSmallParts[1]
              : '';
          } else {
            image_small_additional = 'img/image_merchant/small';
          }

          if (getCategory[0].additional?.image_medium) {
            const imageMediumParts =
              getCategory[0].additional?.image_medium?.split('/img');
            image_medium_additional = imageMediumParts
              ? 'img' + imageMediumParts[1]
              : '';
          } else {
            image_medium_additional = 'img/image_merchant/medium';
          }

          if (getCategory[0].additional?.image_large) {
            const imageLargeParts =
              getCategory[0].additional?.image_large?.split('/img');
            image_large_additional = imageLargeParts
              ? 'img' + imageLargeParts[1]
              : '';
          } else {
            image_large_additional = 'img/image_merchant/large/';
          }
          // Check Cateogries available channel
          if (Array.isArray(getCategory[0]?.additional?.channel)) {
            getCategory[0].additional.channel.map((datas) => {
              if (datas?.name) {
                channelCategories.push(datas.name);
                const modifiedChannelCategories = channelCategories.map(
                  (item) => {
                    if (typeof item === 'string') {
                      const itemName = item?.toUpperCase();
                      if (itemName === 'MYTELKOMSEL WEB') {
                        return 'Web';
                      } else if (itemName === 'MYTELKOMSEL APP') {
                        return 'Mobile';
                      }
                    }
                    return item;
                  },
                );
                channelCategories = modifiedChannelCategories;
              }
            });
          }
          const CATEGORY = {
            '@num': rowNumCat++,
            NAME: getCategory[0].set_value || '',
            DESCRIPTION: getCategory[0].additional?.description || '',
            DESCRIPTION_EN: getCategory[0].additional?.description_en || '',
            IMAGE_SMALL: image_small_additional || '',
            IMAGE_MEDIUM: image_medium_additional || '',
            IMAGE_LARGE: image_large_additional || '',
            CHANNEL: getCategory[0].additional?.channel
              ? channelCategories.join(',')
              : '',
          };
          const foundIndex = null;
          const foundCategory = dataRewardArrCategory.some((el, j) => {
            return el.NAME === CATEGORY.NAME;
          });
          if (foundCategory) {
            dataRewardArrCategory[foundIndex] = CATEGORY;
            console.log('data ini sudah di file');
            serviceResult.message = '05. Data is exists in file';
          } else {
            dataRewardArrCategory.push(CATEGORY);
            console.log('data ini belum ada di file');
            serviceResult.message = '05. Data is not exists in file';
            serviceResult.stack =
              '05. Data is not exists in file: foundCategory is empty or false';
          }
          dataRewardArrCategory.map((i, index) => {
            i['@num'] = index + 1;
            return i;
          });
          // tulis ke file temp
          writeFileSync(
            temfileCategory,
            JSON.stringify(dataRewardArrCategory, null, 4),
            {
              flag: 'w',
            },
          );
        } else {
          const getCategory = await this.lovsModel.find(
            { group_name: 'PROGRAM_EXPERIENCE', deleted_at: null },
            { set_value: 1, additional: 1 },
          );

          const updatedCategories = getCategory.map((data) => {
            if (data.additional?.image_small) {
              const imageSmallParts =
                data.additional?.image_small?.split('/img');
              image_small_additional = imageSmallParts
                ? 'img' + imageSmallParts[1]
                : '';
            } else {
              image_small_additional = 'img/image_merchant/small';
            }

            if (data.additional?.image_medium) {
              const imageMediumParts =
                data.additional?.image_medium?.split('/img');
              image_medium_additional = imageMediumParts
                ? 'img' + imageMediumParts[1]
                : '';
            } else {
              image_medium_additional = 'img/image_merchant/medium';
            }

            if (data.additional?.image_large) {
              const imageLargeParts =
                data.additional?.image_large?.split('/img');
              image_large_additional = imageLargeParts
                ? 'img' + imageLargeParts[1]
                : '';
            } else {
              image_large_additional = 'img/image_merchant/large/';
            }

            // Check Cateogries available channel
            if (Array.isArray(data?.additional?.channel)) {
              data?.additional?.channel?.map((datas) => {
                if (datas?.name) {
                  channelCategories?.push(datas.name);
                  const modifiedChannelCategories = channelCategories?.map(
                    (item) => {
                      if (typeof item === 'string') {
                        const itemName = item?.toUpperCase();
                        if (itemName === 'MYTELKOMSEL WEB') {
                          return 'Web';
                        } else if (itemName === 'MYTELKOMSEL APP') {
                          return 'Mobile';
                        }
                      }
                      return item;
                    },
                  );
                  channelCategories = modifiedChannelCategories;
                }
              });
            }
            const ROWCATEGORY = {
              '@num': rowNumCat++,
              NAME: data.set_value || '',
              DESCRIPTION: data.additional?.description || '',
              DESCRIPTION_EN: data.additional?.description_en || '',
              IMAGE_SMALL: image_small_additional || '',
              IMAGE_MEDIUM: image_medium_additional || '',
              IMAGE_LARGE: image_large_additional || '',
              CHANNEL: data.additional?.channel
                ? channelCategories.join(',')
                : '',
            };
            return ROWCATEGORY;
          });

          const indexCategory = 1;
          updatedCategories.forEach((data) => {
            let foundIndexCategory = null;
            const foundCategory = dataRewardArrCategory.some((el, j) => {
              foundIndexCategory = j;
              return el.NAME === data.NAME;
            });

            if (foundCategory) {
              dataRewardArrCategory[foundIndexCategory] = data;
              serviceResult.message += `\n06.${indexCategory} Data already exists`;
            } else {
              dataRewardArrCategory.push(data);
              serviceResult.message += `\n06.${indexCategory} Data not exists`;
              serviceResult.stack += `\n06.${indexCategory} Data not exists: foundCategory is empty or false`;
            }
          });

          // Menentukan data yang perlu dihapus dari file xml-category-temp.json
          const newDataNames = updatedCategories.map((data) => data.NAME);
          const dataNamesInFile = dataRewardArrCategory.map(
            (data) => data.NAME,
          );

          dataNamesInFile.filter((name) => !newDataNames.includes(name));

          // Menghapus data yang tidak ada dalam updatedCategories dari file xml-category-temp.json
          dataRewardArrCategory = dataRewardArrCategory.filter((data) =>
            newDataNames.includes(data.NAME),
          );

          dataRewardArrCategory.forEach((i, index) => {
            i['@num'] = index + 1;
          });

          try {
            writeFileSync(
              temfileCategory,
              JSON.stringify(dataRewardArrCategory, null, 4),
              {
                flag: 'w',
              },
            );
            console.log('File written successfully');
            serviceResult.message += '\n07. File write succesfully';
          } catch (error) {
            console.error('Error writing file:', error);
            serviceResult.message += `\n07. File write error`;
            serviceResult.stack += `\n07. File write error: ${temfileCategory}`;
          }
        }

        // const dirFileXML = `${dir}/${payload.name_file_xml}`;
        const pathxml = path.resolve(dir, payload.name_file_xml);
        const root = {
          ROOT: {
            CATEGORIES: {
              ROWSET: {
                ROW: dataRewardArrCategory,
              },
            },
            KEYWORDS: {
              ROWSET: {
                ROW: dataRewardArr,
              },
            },
          },
        };
        const doc = xmlCreate(root, { headless: true });
        const buffer = doc.end({ pretty: true });
        writeFileSync(pathxml, buffer, { flag: 'w' });
        console.log('>>>>> File XML generate success.');
        serviceResult.message = 'Reward Catalogue XML File generate success';
        serviceResult.result = pathxml;
        return serviceResult;
        // return pathxml;
      }
    } catch (error) {
      serviceResult.is_error = true;
      serviceResult.message = error.message;
      serviceResult.stack = error.stack;
      return serviceResult;
    }
  }

  async getDonationXML(payload): Promise<any> {
    const donationXML = {
      DONATION_CATEGORY: '',
      MINIMUM_POIN: payload.minimum_poin,
      TARGET_POIN: payload.target_poin,
    };

    if (payload.donation_category) {
      const getCategoryDonation = await this.lovsModel.findOne({
        _id: new mongoose.Types.ObjectId(payload.donation_category),
      });

      if (getCategoryDonation && getCategoryDonation.set_value) {
        donationXML.DONATION_CATEGORY = getCategoryDonation.set_value;
      } else {
        // Handle when getCategoryDonation or getCategoryDonation.set_value is undefined
        // Set a default value or handle the case accordingly
        donationXML.DONATION_CATEGORY = 'Default Category';
      }
    }

    return donationXML;
  }

  async getAuctionXML(payload): Promise<any> {
    const donationXML = {
      PRIZE_IMAGE: payload.auction_prize_image,
      PRIZE_NAME: payload.auction_prize_name,
      PRIZE_DESCRIPTION: payload.auction_prize_desc_id,
      PRIZE_DESCRIPTION_EN: payload.auction_prize_desc_en,
      MULTIPLIER_POIN: payload.auction_multiplier_poin,
      MINIMUM_BID_POIN: payload.auction_poin_min_bidding,
    };
    return donationXML;
  }

  async getVotingXML(payload): Promise<any> {
    const votingData = {
      // STOCK_PER_LOCATION: [],
      TARGET_VOTE: 0,
      VOTING_OPTION: [],
    };
    let image_voting = null;
    const voteData = await this.voteModel.findOne({
      keyword: new Types.ObjectId(payload?._id),
    });

    const voteOptionsData = await this.voteOptionModel.find({
      vote: new Types.ObjectId(voteData?._id),
      deleted_at: null
    });

    // console.log('=== VOTE DATA ===', voteData);
    // console.log('=== VOTE OPTIONS ===', voteOptionsData);

    // const location = payload?.bonus[0]?.stock_location;
    // if (location?.length > 0) {
    //   for (let i = 0; i < location.length; i++) {
    //     const stocklocation = location[i];
    //     // Mendorong string key-value pair ke dalam array
    //     votingData.STOCK_PER_LOCATION.push(`<${stocklocation?.name.toUpperCase()}>${stocklocation?.stock}<${stocklocation?.name.toUpperCase()}/>`);
    //   }
    // }

    if (voteOptionsData.length > 0) {
      for (let i = 0; i < voteOptionsData.length; i++) {
        const vote = voteOptionsData[i];

        if (vote?.image) {
          const imageDetail3Match = vote?.image?.split('/img');
          if (imageDetail3Match) {
            image_voting = 'img' + imageDetail3Match[1];
          } else {
            // Handle when match is not found
            image_voting = 'img/default'; // Set a default value or handle the case accordingly
          }
        }
        const votingOptionMap: any = {
          OPTION: i + 1, // Menggunakan index untuk OPTION
          ID: vote?._id.toString(),
          TITLE: vote?.option, // Menggunakan vote.title
          DESC: vote?.description,
          IMAGE: image_voting,
        };
        votingData.VOTING_OPTION.push(votingOptionMap);
      }
    }

    votingData.TARGET_VOTE = voteData?.target_votes || 0;

    return votingData;
  }

  async getAppliedOn(payload: any): Promise<any> {
    const objectIds = payload.map((id) => new mongoose.Types.ObjectId(id));

    const result = await this.customerBrandModel.aggregate([
      {
        $match: {
          _id: { $in: objectIds },
        },
      },
      {
        $project: {
          reward_catalogue_identifier: 1,
          _id: 0,
        },
      },
    ]);

    return result.map((item) => item.reward_catalogue_identifier);
  }

  async getCatalogAndDisplay(payload: any): Promise<any> {
    const objectIds = payload.map((id) => new mongoose.Types.ObjectId(id));

    const result = await this.customerTierModel.aggregate([
      {
        $match: {
          _id: { $in: objectIds },
        },
      },
      {
        $project: {
          name: 1,
          _id: 0,
        },
      },
    ]);

    return result.map((item) => item.name.toUpperCase());
  }

  async getCityAndProvince(payload: any): Promise<any> {
    const objectIds = payload.map((id) => new mongoose.Types.ObjectId(id));

    const result = await this.locationsModel.aggregate([
      {
        $match: {
          _id: { $in: objectIds },
        },
      },
      {
        $project: {
          name: 1,
          _id: 0,
        },
      },
    ]);
    console.log('results city and province', result);
    return result.map((item) => item.name);
  }

  async getMicrositSegment(payload: any): Promise<any> {
    try {
      const data = payload;
      const setValues = data.map((item) => item.set_value);
      return setValues.join(',');
    } catch (error) {
      console.log('Invalid JSON format or missing key.');
      return '';
    }
  }

  async getStockRemaining(payload: any): Promise<any> {
    try {
      const stockRemaining: any = await this.keywordModel.aggregate([
        {
          $match: {
            $and: [{ 'eligibility.name': payload }, { deleted_at: null }],
          },
        },
        {
          $project: {
            bonus: 1,
          },
        },
      ]);
      let stockBalance: any = null;
      for (
        let mainIndex = 0;
        mainIndex < stockRemaining[0]?.bonus.length;
        mainIndex++
      ) {
        const bonusMain = stockRemaining[0]?.bonus[mainIndex];
        const product_idMain = getProductID(
          bonusMain?.bonus_type,
          this.configService,
        );

        for (
          let bonusIndex = 0;
          bonusIndex < bonusMain.stock_location.length;
          bonusIndex++
        ) {
          const locationMain = bonusMain.stock_location[bonusIndex];
          // console.log('=== LOCATION ID ===', locationMain?.location_id);
          // console.log('=== ID KEYWORD ===', stockRemaining[0]?._id);
          // console.log('=== PRODUCT MAIN ===', product_idMain);
          if (bonusMain?.bonus_type === 'direct_redeem') {
            stockBalance = await this.serviceStock.getStockRC({
              product: product_idMain,
              keyword: stockRemaining[0]?._id,
            });
          } else {
            stockBalance = await this.serviceStock.getStockRC({
              product: product_idMain,
              keyword: stockRemaining[0]?._id,
            });
          }
        }
      }
      return stockBalance ? stockBalance?.totalBalance : null;
    } catch (error) {
      return null;
    }
  }
}
