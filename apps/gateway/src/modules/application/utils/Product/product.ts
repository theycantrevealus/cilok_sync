import { ConfigService } from '@nestjs/config';

function getProductID(
  bonus_type: string,
  configService: ConfigService,
): string | null {
  let product_id: string = null;

  switch (bonus_type) {
    case 'discount_voucher':
      product_id = configService.get<string>('core-backend.voucher_product.id');
      break;
    case 'lucky_draw':
      product_id = configService.get<string>('core-backend.coupon_product.id');
      break;
    case 'mbp':
      product_id = configService.get<string>('core-backend.coupon_product.id');
      break;
    case 'telco_postpaid':
      product_id = configService.get<string>(
        'core-backend.telco_postpaid_product.id',
      );
      break;
    case 'telco_prepaid':
      product_id = configService.get<string>(
        'core-backend.telco_prepaid_product.id',
      );
      break;
    case 'linkaja_main':
      product_id = configService.get<string>(
        'core-backend.link_aja_main_product.id',
      );
      break;
    case 'linkaja_bonus':
      product_id = configService.get<string>(
        'core-backend.link_aja_bonus_product.id',
      );
      break;
    case 'linkaja_voucher':
      product_id = configService.get<string>(
        'core-backend.link_aja_voucher_product.id',
      );
      break;
    case 'ngrs':
      product_id = configService.get<string>('core-backend.ngrs_product.id');
      break;
    case 'direct_redeem':
      // for merchandise product_id only null
      product_id = null;
      // product_id = configService.get<string>(
      //   'core-backend.direct_redeem_product.id',
      // );
      break;
    case 'void':
      product_id = configService.get<string>('core-backend.void_product.id');
      break;
    case 'loyalty_poin':
      product_id = configService.get<string>(
        'core-backend.loyalty_poin_product.id',
      );
      break;
    case 'donation':
      product_id = configService.get<string>(
        'core-backend.donation_product.id',
      );
      break;
    case 'voting':
      product_id = configService.get<string>('core-backend.voting_product.id');
      break;
    case 'sms_auction':
      product_id = configService.get<string>(
        'core-backend.sms_auction_product.id',
      );
      break;
    case 'e_auction':
      product_id = configService.get<string>(
        'core-backend.e_auction_product.id',
      );
      break;
    default:
      break;
  }

  //console.log(`PRODUCT ID for "${bonus_type}": ${product_id}`);

  return product_id;
}

export { getProductID };
