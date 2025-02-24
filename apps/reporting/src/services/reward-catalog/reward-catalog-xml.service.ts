import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { readFileSync, writeFileSync } from 'fs';
import mongoose, { Model, Types } from 'mongoose';
import { create as xmlCreate } from 'xmlbuilder';

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
import { Location, LocationDocument } from '@/location/models/location.model';
import { Lov, LovDocument } from '@/lov/models/lov.model';

const moment = require('moment-timezone');
const path = require('path');
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
  ) {
    //
  }

  private async getRewardCatalog(filter: any) {
    try {
      const query: any = {};
      const projection: any = {
        eligibility: false,
        bonus: false,
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
        data = await this.keywordModel.find({ ...query }, projection).exec();
      }

      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async generateRewardCatalogXML(filter: RewardCatalogFilterDTO): Promise<any> {
    const data = await this.getRewardCatalog(filter);
    if (data === undefined) {
      console.log('Data tidak ditemukan atau tidak memiliki nilai.');
    } else {
      let rowNum = 1;
      const rewardCatalog = data.map(async (i, index) => {
        if (i.reward_catalog) {
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
          let provinceObj = {};
          let cityObj = {};
          let approval;
          let is_corporate;
          let bonus_type = null;
          let donation = null;
          let auction = null;
          const voting = null;
          const votingOption = '';
          let image_promo_loc = null;
          let image_detail_loc = null;
          let image_small = null;
          let image_medium = null;
          let image_large = null;
          let image_detail_1_loc = null;
          let image_detail_2_loc = null;
          let image_detail_3_loc = null;

          const bonus = i.bonus;
          if (bonus.length > 0) {
            for (const single_bonus of bonus) {
              bonus_type = single_bonus.bonus_type;
              switch (single_bonus.bonus_type) {
                case 'donation':
                  donation = await this.getDonationXML(single_bonus);
                  break;
                case 'auction':
                  auction = await this.getAuctionXML(single_bonus);
                  break;
                default:
                  break;
              }
            }
          }
          //DEFAULT TAG APPLIEDON
          appliedOnObj['IS_LOOP'] = 0;
          appliedOnObj['IS_AS'] = 0;
          appliedOnObj['IS_HALO'] = 0;
          appliedOnObj['IS_SIMPATI'] = 0;

          if (i.reward_catalog.applied_on) {
            appliedOn = await this.getAppliedOn(i.reward_catalog.applied_on);
            appliedOn.forEach((applied) => {
              console.log('data applied on', applied);
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

          //DEFAULT TAG SPECIAL APPLIEDON
          specialAppliedOnObj['SPECIAL_LOOP'] = 0;
          specialAppliedOnObj['SPECIAL_AS'] = 0;
          specialAppliedOnObj['SPECIAL_HALO'] = 0;
          specialAppliedOnObj['SPECIAL_SIMPATI'] = 0;
          if (i.reward_catalog.special_applied_on) {
            spesialappliedOn = await this.getAppliedOn(
              i.reward_catalog.special_applied_on,
            );
            spesialappliedOn.forEach((spclapplied) => {
              console.log('data special applied on', spclapplied);
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

          if (
            i.reward_catalog.catalog_type ||
            i.reward_catalog.catalog_display ||
            i.reward_catalog.channel
          ) {
            catalog_type = await this.getCatalogAndDisplay(
              i.reward_catalog.catalog_type,
            );
            catalog_typeObj = catalog_type.join(',');
            console.log('catalog_typeObj', catalog_typeObj);
            catalog_display = await this.getCatalogAndDisplay(
              i.reward_catalog.catalog_display,
            );
            catalog_displayObj = catalog_display.join(',');
            channel = i.reward_catalog.channel.join(',');
          }

          if (i.reward_catalog.province || i.reward_catalog.city) {
            // city = await this.getCityAndProvince(i.reward_catalog.city)
            // cityObj = city.join(',')
            // province = await this.getCityAndProvince(i.reward_catalog.province)
            // provinceObj = province.join(',')
            cityObj = i.reward_catalog.city.join(',');
            provinceObj = i.reward_catalog.province.join(',');
          }

          if (i.reward_catalog.enable_for_corporate_subs == 'Both') {
            is_corporate = 1;
          } else {
            is_corporate = 0;
          }

          if (i.hq_approver) {
            approval = 1;
          } else {
            approval = 0;
          }

          const votingParse = {};
          if (i.reward_catalog.voting_target_redeemer) {
            i.reward_catalog.voting_options.map((v, index) => {
              (votingParse[`OPTION${index + 1}`] = v.name),
                (votingParse[`OPTION${index + 1}_IMAGE`] = v.image);
            });
          }
          const startPeriod = moment.tz(
            i.reward_catalog.effective,
            'Asia/Jakarta',
          );
          const endPeriod = moment.tz(i.reward_catalog.to, 'Asia/Jakarta');

          if (
            i.reward_catalog.image_promo_loc ||
            i.reward_catalog.image_detail_loc ||
            i.reward_catalog.image_small ||
            i.reward_catalog.image_medium ||
            i.reward_catalog.image_large
          ) {
            image_promo_loc = i.reward_catalog.image_promo_loc.split('/img');
            image_promo_loc = '/img' + image_promo_loc[1];

            image_detail_loc = i.reward_catalog.image_detail_loc.split('/img');
            image_detail_loc = '/img' + image_detail_loc[1];

            image_small = i.reward_catalog.image_small.split('/img');
            image_small = '/img' + image_small[1];

            image_medium = i.reward_catalog.image_medium.split('/img');
            image_medium = '/img' + image_medium[1];

            image_large = i.reward_catalog.image_large.split('/img');
            image_large = '/img' + image_large[1];
          }

          if (
            i.reward_catalog.image_detail1_loc ||
            i.reward_catalog.image_detail2_loc ||
            i.reward_catalog.image_detail3_loc
          ) {
            const regex = /\/img\/([^\/]+\/[^\/]+\/)/;

            image_detail_1_loc =
              i.reward_catalog.image_detail1_loc.match(regex);
            image_detail_1_loc = 'img/' + image_detail_1_loc[1];

            image_detail_2_loc =
              i.reward_catalog.image_detail2_loc.match(regex);
            image_detail_2_loc = 'img/' + image_detail_2_loc[1];

            image_detail_3_loc =
              i.reward_catalog.image_detail3_loc.match(regex);
            image_detail_3_loc = 'img/' + image_detail_3_loc[1];
          }

          const ROW = {
            '@num': rowNum++,
            APPROVAL: approval,
            KEYWORD: i.reward_catalog.keyword ? i.reward_catalog.keyword : '',
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
            IS_CORPORATE:
              i.reward_catalog.enable_for_corporate_subs === 'Both' ? 1 : 0,
            IMAGE_PROMO_LOC: i.reward_catalog.image_promo_loc
              ? image_promo_loc
              : '',
            IMAGE_DETAIL_LOC: i.reward_catalog.image_detail_loc
              ? image_detail_loc
              : '',
            IMAGE_DETAIL1_LOC: i.reward_catalog.image_detail1_loc
              ? image_detail_1_loc
              : '',
            IMAGE_DETAIL2_LOC: i.reward_catalog.image_detail2_loc
              ? image_detail_2_loc
              : '',
            IMAGE_DETAIL3_LOC: i.reward_catalog.image_detail3_loc
              ? image_detail_3_loc
              : '',
            IMAGE_SMALL: i.reward_catalog.image_small ? image_small : '',
            IMAGE_MEDIUM: i.reward_catalog.image_medium ? image_medium : '',
            IMAGE_LARGE: i.reward_catalog.image_large ? image_large : '',
            PROVINCE: provinceObj ?? '',
            CITY: cityObj ?? '',
            VIDEO: i.reward_catalog.video,
            GOOGLE_MAPS: i.reward_catalog.google_maps,
            HOT_PROMO: i.reward_catalog.hot_promo ? 1 : 0,
            SORT_HOT_PROMO: i.reward_catalog.hot_promo ? 1 : 0,
            CATALOGTYPE: i.reward_catalog.catalog_type ? catalog_typeObj : '',
            DISPLAYTYPE: i.reward_catalog.catalog_display
              ? catalog_displayObj
              : '',
            CHANNEL: channel ?? '',
            STOCK: i.reward_catalog.stock ?? '',
            // CHECK_DONATION: donation ? {
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
            VOTING: i.reward_catalog.voting_target_redeemer
              ? {
                  TARGET_REDEEMER: i.reward_catalog.voting_target_redeemer,
                  OPTION_VOTING: votingParse,
                }
              : '',
            // LINK_AJA: i.reward_catalog.link_aja_voucher_banner_image || i.reward_catalog.link_aja_voucher_title || i.reward_catalog.link_aja_voucher_poin_price || i.reward_catalog.link_aja_voucher_description ? {
            // } : '',
            LINK_AJA_VOUCHER_BANNER_IMAGE: i.reward_catalog
              .link_aja_voucher_banner_image
              ? i.reward_catalog.link_aja_voucher_banner_image
              : '',
            LINK_AJA_VOUCHER_TITLE: i.reward_catalog.link_aja_voucher_title
              ? i.reward_catalog.link_aja_voucher_title
              : '',
            LINK_AJA_VOUCHER_POIN_PRICE: i.reward_catalog
              .link_aja_voucher_poin_price
              ? i.reward_catalog.link_aja_voucher_poin_price
              : '',
            LINK_AJA_VOUCHER_DESCRIPTION: i.reward_catalog
              .link_aja_voucher_description
              ? i.reward_catalog.link_aja_voucher_description
              : '',
            CATEGORY: i.reward_catalog.category
              ? i.reward_catalog.category
              : '',
            CREATED_DATE: i.reward_catalog.created_at
              ? moment(i.reward_catalog.created_at).format('YYYY-MM-DD')
              : '',
            UPDATED_DATE: i.reward_catalog.updated_at
              ? moment(i.reward_catalog.updated_at).format('YYYY-MM-DD')
              : '',
          };
          return ROW;
        } else {
          return null;
        }
      });
      const dataRewardArr = [];
      // Filter hasil mapping yang bukan null
      const validRewardCatalogPromises = rewardCatalog.filter(
        (item) => item !== null,
      );

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
      const temfile = path.resolve(
        __dirname,
        '../reward-catalog-mytsel/xml-temp.json',
      );
      // const temfile = `./reward-catalog-mytsel/xml-temp.json`
      const fileBuffer = readFileSync(temfile, { encoding: 'utf-8' });

      // file temp ada? menandakan sudah sempat dibuat
      if (fileBuffer.length > 0) {
        const fileData = JSON.parse(fileBuffer);
        fileData.map((p) => dataRewardArr.push(p));
      }

      rewardCatalogPromises.map((data, index) => {
        let foundIndex = null;
        const found = dataRewardArr.some((el, j) => {
          foundIndex = j;
          return el.KEYWORD === data.KEYWORD;
        });
        if (found) {
          dataRewardArr[foundIndex] = data;
        } else {
          dataRewardArr.push(data);
        }
      });
      dataRewardArr.map((i, index) => {
        i['@num'] = index + 1;
        return i;
      });
      // tulis ke file temp
      writeFileSync(temfile, JSON.stringify(dataRewardArr, null, 4), {
        flag: 'w',
      });

      const pathxml = path.resolve(
        __dirname,
        '../reward-catalog-mytsel/my_telkomsel_merchant.xml',
      );
      const root = {
        ROOT: {
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

      return pathxml;
    }
  }

  async getDonationXML(payload): Promise<any> {
    const getCategoryDonation = await this.lovsModel.findOne({
      _id: new mongoose.Types.ObjectId(payload.donation_category),
    });
    const donationXML = {
      DONATION_CATEGORY: getCategoryDonation.set_value,
      MINIMUM_POIN: payload.minimum_poin,
      TARGET_POIN: payload.target_poin,
    };
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
      STOCK_PER_LOCATION: [],
      TARGET_REDEEMER: payload.target_redeemer,
      OPTION_VOTING: [],
    };

    for (const location of payload.stock_location) {
      const formattedName = location.name.replace(/\s/g, '_').toUpperCase();
      votingData.STOCK_PER_LOCATION.push({
        name: formattedName,
        stock: location.stock,
      });
    }

    for (let i = 0; i < payload.voting_options.length; i++) {
      votingData.OPTION_VOTING.push(payload.voting_options[i].name);
    }
    console.log('voting data', votingData);
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

    return result.map((item) => item.name);
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
}
