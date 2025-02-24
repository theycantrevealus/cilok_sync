import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

import { SetConfigDTOResponse } from '@/application/dto/set.config.dto';

import { EsbOrderResponse } from './esb.order.response';
import { OrderActiveMemberDTO } from './order.activemember.dto';
import { OrderCustomerInfoDto } from './order.customerinfo.dto';
import { OrderExpiryDto } from './order.expiry.dto';
import { OrderMerchantProfileDto } from './order.marchantprofile.dto';

export class EsbOrderDTO {
  @ApiProperty({
    example: '1234567890987654321234567',
    description: 'Transaction ID, Leng 25',
    maxLength: 25,
  })
  @IsString()
  @IsNotEmpty()
  @Length(25)
  transaction_id: string;

  @ApiProperty({
    example: '1234567890987654321234567',
    description: 'Transaction ID, Leng 25',
    required: false,
  })
  @IsString()
  trx_genkey: string;

  @ApiProperty({
    example: 'c1',
    description: 'Channel ID.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2)
  channel: string;

  @ApiProperty({
    example: 'CMS',
    description:
      'Username (or employee number) who create the order. It is mandatory if DSC agent creates the order (or channel CMS)',
    required: false,
  })
  @IsString()
  sales_person: string;

  @ApiProperty({
    example: 'LOV',
    description: 'Language option.',
  })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({
    example: 'v1',
    description: 'Response structure version.',
    required: false,
  })
  @IsString()
  version: string;

  @ApiProperty({
    example: 'OVO',
    description:
      'Service ID for funder. Mandatory if payment method is OVO. If payment method is MANDIRI_DD, fill with transaction_id when requesting OTP.',
    required: false,
  })
  @IsString()
  @ValidateIf(
    (o) => o.payment_method === 'OVO' || o.payment_method === 'MANDIRI_DD',
  )
  @IsNotEmpty({
    message:
      'funder_service_id is Mandatory if payment method is OVO. If payment method is MANDIRI_DD, fill with transaction_id when requesting OTP.',
  })
  funder_service_id: string;

  @ApiProperty({
    description: 'Service ID for initiator.',
    maxLength: 13,
  })
  @IsString()
  @IsNotEmpty()
  @Length(13)
  service_id_a: string;

  @ApiProperty({
    example: 'GIFT',
    description:
      'Service ID for receiver. Mandatory if purchase mode is GIFT, ASK, HELP or Order type is TB.',
    maxLength: 13,
  })
  @IsString()
  @Length(13)
  @ValidateIf(
    (o) =>
      o.purchase_mode === 'GIFT' ||
      o.purchase_mode === 'ASK' ||
      o.purchase_mode === 'HELP' ||
      o.order_type === 'TB',
  )
  @IsNotEmpty({
    message:
      'service_id_b is Mandatory if purchase mode is GIFT, ASK, HELP or Order type is TB.',
  })
  service_id_b: string;

  @ApiProperty({
    description: 'Product Offer ID. Mandatory if “menu_id” is not filled.',
    required: false,
  })
  @IsString()
  @ValidateIf(
    (o) =>
      o.menu_id === null || Number.isNaN(o.menu_id) || o.menu_id === undefined,
  )
  @IsNotEmpty({
    message: 'offer_id is Mandatory if “menu_id” is not filled.',
  })
  offer_id: string;

  @ApiProperty({
    description: 'Menu ID. Mandatory if “offer_id” is not filled.',
    required: false,
  })
  @IsString()
  @ValidateIf(
    (o) =>
      o.offer_id === null ||
      Number.isNaN(o.offer_id) ||
      o.offer_id === undefined,
  )
  @IsNotEmpty({
    message: 'menu_id is Mandatory if “offer_id” is not filled.',
  })
  menu_id: string;

  @ApiProperty({
    description:
      'Keyword/Message typed by customer for SMS purchase or if payment_method = POIN. Mandatory for payment_method = POIN',
    required: false,
  })
  @IsString()
  @ValidateIf((o) => o.payment_method === 'POIN')
  @IsNotEmpty({
    message: 'keyword is Mandatory for payment_method = POIN',
  })
  keyword: string;

  @ApiProperty({
    description:
      'ADN number. Mandatory for the request that coming from USSD Channel.',
    required: false,
    maxLength: 6,
  })
  @IsString()
  @Length(6)
  adn: string;

  @ApiProperty({
    description: 'Order Type.',
    required: true,
    enum: ['ACT', 'DEACT', 'REN', 'TB', 'ACT_FAM'],
  })
  @IsString()
  @IsNotEmpty()
  order_type: string;

  @ApiProperty({
    description:
      'Active offer Instance Identifier. Mandatory if “Order Type” = DEACT and “immediate” = 0',
    required: false,
  })
  @IsString()
  @ValidateIf((o) => o.order_type === 'DEACT' && o.immediate === 0)
  @IsNotEmpty({
    message:
      'active_offer_id is Mandatory if “Order Type” = DEACT and “immediate” = 0',
  })
  active_offer_id: string;

  @ApiProperty({
    description:
      'Purchase Mode. Mandatory for order type ACT & REN. For LOV list you can get at enums',
    required: false,
    enum: ['SELF', 'GIFT', 'ASK', 'HELP', 'RESELLER', 'TPULSA'],
  })
  @IsString()
  @ValidateIf((o) => o.order_type === 'ACT' || o.order_type === 'REN')
  @IsNotEmpty({
    message: 'purchase_mode is Mandatory for order type ACT & REN.',
  })
  purchase_mode: string;

  @ApiProperty({
    description:
      'Payment Method. Mandatory for Order Type ACT, TB & REN. For LOV list you can get at enums',
    required: false,
    enum: [
      'BALANCE',
      'POIN',
      'TCASH',
      'MKIOS',
      'CREDITCARD',
      'NOCHARGE',
      'GOPAY',
      'OVO',
      'DANA',
      'SHOPEEPAY',
      'KREDIVO',
      'LINKAJA_APP',
      'LINKAJA_WCO',
      'AKULAKU',
      'MANDIRI_DD',
      'INDOMARET',
      'OMNICHANNEL',
      'FINNET_CC',
      'FINNET_VA',
      'FINNET_WALLET',
      'MCP_VA',
      'EVOUCHER',
      'QRIS',
      'BCA_OC',
    ],
  })
  @IsString()
  payment_method: string;

  @ApiProperty({
    description: 'Product Category',
    required: false,
  })
  @IsString()
  product_category: string;

  @ApiProperty({
    description: 'HRN or Voucher code. For E-voucher redeem transaction.',
    required: false,
  })
  @IsString()
  hrn: string;

  @ApiProperty({
    description: 'Payment Method Name. (Placeholder for future)',
    required: false,
  })
  @IsString()
  payment_name: string;

  @ApiProperty({
    example: 'MKIOS',
    description:
      'To store payment value. (E.g: MKIOS pin, CSC code, TCASH Pin, etc)',
    required: false,
  })
  @IsString()
  element1: string;

  @ApiProperty({
    description:
      'Source of Fund. Mandatory for payment method CREDITCARD and VIRTUALACCOUNT.',
    required: false,
    enum: [
      'cc',
      'vabni',
      'vapermata',
      'vamandiri',
      'briva',
      'ccAdv',
      'kredivo',
    ],
  })
  @IsString()
  @ValidateIf(
    (o) =>
      o.payment_method === 'CREDITCARD' ||
      o.payment_method === 'VIRTUALACCOUNT',
  )
  @IsNotEmpty({
    message:
      'sof_id is Mandatory for payment method CREDITCARD and VIRTUALACCOUNT.',
  })
  sof_id: string;

  @ApiProperty({
    description: 'Nominal for balance transfer. Mandatory for Order Type TB.',
    required: false,
    maxLength: 11,
  })
  @IsNumber()
  @Length(11)
  @ValidateIf((o) => o.order_type === 'TB')
  @IsNotEmpty({
    message: 'nominal is Mandatory for Order Type TB.',
  })
  nominal: number;

  @ApiProperty({
    description:
      'Allocated quota for parent (in KB). If no quota allocated for parent, fill this parameter with 0.',
    required: false,
  })
  @IsString()
  allocated_parent_quota: string;

  @ApiProperty({
    description: 'Kabupaten. Used for renewal by DOM.',
    required: false,
  })
  @IsString()
  kabupaten: string;

  @ApiProperty({
    description:
      'Campaign ID. <br/> Format: <br/> <table><tr><td>System</td><td>Prefix</td></tr> <tr><td>PES</td><td>CAM_</td></tr> <tr><td>PES Aggregator</td><td>CPGGL</td></tr> </table> <br> e.g. CAM_101, CPGGL10001 Mandatory for Channel CMS.',
    required: false,
  })
  @IsString()
  campaign_id: string;

  @ApiProperty({
    description: 'Campaign Offer.',
    required: false,
  })
  @IsString()
  campaign_offer: string;

  @ApiProperty({
    description:
      'Campaign Offer. Campaign Tracking ID. Used as identifier (mandatory) if subscribers purchase campaign product (campaign_offer =“true”) or from channel CMS. <br/> Format: <br/> <table><tr><td>System</td><td>Prefix</td></tr> <tr><td>PES</td><td>CAM_</td></tr> <tr><td>PES Aggregator</td><td>CPGGL</td></tr> </table> <br> e.g. CAM_101, CPGGL10001',
    required: false,
  })
  @IsString()
  campaign_tracking_id: string;

  @ApiProperty({
    description: 'CMS Eligible Counter',
    required: false,
  })
  @IsString()
  cms_eligibile_counter: string;

  @ApiProperty({
    description:
      'Flag to indicate Unsubscribe mode or to indicate submit order request or confirmation. Mandatory for order type DEACT. <ul><li>0 (Indirect Purchase)</li><li>1 (Direct Purchase)</li><li>2 (Check if REG SMS already exists)</li></ul>',
    required: false,
  })
  @IsString()
  @ValidateIf((o) => o.order_type === 'DEACT')
  @IsNotEmpty({
    message: 'immediate is Mandatory for order type DEACT.',
  })
  immediate: string;

  @ApiProperty({
    example: '1',
    description:
      'Subscription flag. 1 (true) or 0 (false). Mandatory for Order type ACT & REN.',
    required: false,
    maxLength: 1,
  })
  @IsString()
  @Length(1)
  @ValidateIf((o) => o.order_type === 'ACT' || o.order_type === 'REN')
  @IsNotEmpty({
    message: 'subscription_flag is Mandatory for order type ACT & REN.',
  })
  subscription_flag: string;

  @ApiProperty({
    description:
      'Recurring type for auto-renewal indicator. LOV: <ul><li>COUNT</li><li>DATE</li></ul>',
    required: false,
  })
  @IsString()
  recurring_type: string;

  @ApiProperty({
    description:
      'Recurring value for auto-renewal indicator. Can be in N or DDMMYY format. Example: <ul><li>7</li><li>310721</li>',
    required: false,
  })
  @IsString()
  recurring_value: string;

  @ApiProperty({
    description:
      'Recurring index sent from DOM that explains the how many recurring purchases has been executed from DOM.',
    required: false,
  })
  @IsString()
  recurring_index: string;

  @ApiProperty({
    description:
      'Recurring end date sent from DOM to identify the end date of recurring purchase. Format: YYYY-MM-DD hh:mm:ss',
    required: false,
  })
  @IsString()
  recurring_end_date: string;

  @ApiProperty({
    example: 1,
    description:
      'Reservation Flag. For future activation (Reservation). 1 (true) or 0 (false).',
    required: false,
    maxLength: 1,
  })
  @IsNotEmpty()
  @Length(1)
  reservation_flag: string;

  @ApiProperty({
    description:
      'Activation Date. (YYYY/MM/DD hh:mm) For future activation (Reservation).',
    required: false,
  })
  @IsDate()
  activation_date: Date;

  @ApiProperty({
    description:
      'Third party identifier / code from Digital Marketing channel.',
    required: false,
  })
  @IsString()
  third_party_code: string;

  @ApiProperty({
    description: 'Third party callback url.',
    required: false,
  })
  @IsString()
  callback_url: string;

  @ApiProperty({
    description:
      'Network type for channel callback via ESB. Possible value is 1/2/3/4 based on callback target location relative to TSEL network: 1 – Secure Zone, 2 – DMZ, 3 – Cloud/Internet, 4 – Internal OCP',
    required: false,
  })
  @IsString()
  ext_network_type: string;

  @ApiProperty({
    description:
      'Reference transaction identifier from Digital Marketing channel',
    required: false,
  })
  @IsString()
  ref_transaction_id: string;

  @ApiProperty({
    description: 'SMAULoop Offer Name',
    required: false,
  })
  @IsString()
  smauloop_offer_name: string;

  @ApiProperty({
    description:
      'Number of poins deducted. Mandatory if payment method is POIN.',
    required: false,
  })
  @IsString()
  @ValidateIf((o) => o.payment_method === 'POIN')
  @IsNotEmpty({
    message: 'poin is  Mandatory if payment method is POIN.',
  })
  poin: string;

  @ApiProperty({
    description: 'User identifier for game voucher direct topup',
    required: false,
  })
  @IsString()
  vas_userid: string;

  @ApiProperty({
    description: 'Regional server identifier for game voucher direct topup',
    required: false,
  })
  @IsString()
  vas_zoneid: string;

  @ApiProperty({
    description:
      'Server ID for game voucher direct topup. Value is either “1” for Android or “2” for iOS.',
    required: false,
  })
  @IsString()
  vas_serverid: string;

  @ApiProperty({
    description: 'User ID A.',
    required: false,
  })
  @IsString()
  user_id_a: string;

  @ApiProperty({
    description: 'User ID B.',
    required: false,
  })
  @IsString()
  user_id_b: string;

  @ApiProperty({
    description: 'User ID C.',
    required: false,
  })
  @IsString()
  user_id_c: string;

  @ApiProperty({
    description:
      'Bank Code or NGRS Organization Code for stock deduction. Mandatory if payment_method is external payment.',
    required: false,
  })
  @IsString()
  bank_code: string;

  @ApiProperty({
    description:
      'NGRS Organization Code Security Credential. Mandatory if payment_method is external payment.',
    required: false,
  })
  @IsString()
  element2: string;

  @ApiProperty({
    description:
      'Channel Third Party ID. Mandatory if payment_method is external payment.',
    required: false,
  })
  @IsString()
  third_party_id: string;

  @ApiProperty({
    description:
      'Channel Third Party Password. Mandatory if payment_method is external payment.',
    required: false,
  })
  @IsString()
  third_party_password: string;

  @ApiProperty({
    description: 'Redirect URL for Gojek app to callback to MyTelkomsel app.',
    required: false,
  })
  @IsString()
  redirect_url: string;

  @ApiProperty({
    description:
      "Redirect URL for failed external payment. Mandatory if payment method belongs to 'FINNET_x' or 'MCP_x'.",
    required: false,
  })
  @IsString()
  @ValidateIf(
    (o) => o.payment_method === 'FINNET_x' || o.payment_method === 'MCP_x',
  )
  @IsNotEmpty({
    message:
      "redirect_url_failed is Mandatory if payment method belongs to 'FINNET_x' or 'MCP_x'.",
  })
  redirect_url_failed: string;

  @ApiProperty({
    description:
      'Page redirection for going back to channel when customer cancel payment. Mandatory for payment via UPP.',
    required: false,
  })
  @IsString()
  redirect_url_back: string;

  @ApiProperty({
    description:
      'Callback URL for receiving info that customer choose payment via Indomaret, Alfamart, or Virtual Account so channel can append in their list inbox to show payment code (via iframe).',
    required: false,
    maxLength: 100,
  })
  @IsString()
  @Length(100)
  callback_url_payment_code: string;

  @ApiProperty({
    description: 'Item Name that will be pass through to ELISA.',
    required: false,
  })
  @IsString()
  item_name: string;

  @ApiProperty({
    description:
      'Admin fee. If this parameter is filled, the admin_fee will be added to the total amount sent to ELISA.',
    required: false,
  })
  @IsNumber()
  admin_fee: number;

  @ApiProperty({
    description:
      'Mandatory for payment method: <br><ul> <li>CREDIT_CARD</li> <li>FINNET_VA</li><li>QRIS</li><li>MANDIRI_DD</li><li>BCA_OC</li></ul><br> Current List of bank Name: <br> <ul><li>CREDIT_CARD: mandiri / bni / bri / bca / cimb / maybank / mega</li> <li>FINNET_VA: mandiri / bni / bri</li> <li>QRIS: gopay / shopeepay</li> <li>If payment method is DANA Direct Debit, SHOPEEPAY Direct Debit, MANDIRI_DD, BCA_OC, fill with value “binding”.</li></ul>',
    required: false,
  })
  @IsString()
  bank_name: string;

  @ApiProperty({
    description:
      'Mandatory if payment method is “CREDIT_CARD”. Installment payment using credit card. <br> <ul> <li>3</li><li>9</li><li>12</li> </ul>',
    required: false,
  })
  @IsString()
  @ValidateIf((o) => o.payment_method === 'CREDIT_CARD')
  @IsNotEmpty({
    message:
      'installment_term is Mandatory if payment method is “CREDIT_CARD”.',
  })
  installment_term: string;

  @ApiProperty({
    description:
      'Promo code that will be pass through to ELISA. Mandatory for payment_method=LINKAJA_APP',
    required: false,
  })
  @IsString()
  promo_code: string;

  @ApiProperty({
    description:
      'Mandatory for external payment_method except “TCASH”. Customer interface device identification. LOV:<br><ul> <li>app</li> <li>android</li> <li>ios</li> <li>web</li> </ul>',
    required: false,
  })
  @IsString()
  interface: string;

  @ApiProperty({
    description:
      'Payment OTP for MANDIRI_DD. If this param is empty, ELISA will request OTP to Mandiri and customer need to reinput OTP in channel page. Then, channel resubmit payment with the inputted OTP (with the same transaction_id).',
    required: false,
    maxLength: 10,
  })
  @IsString()
  @Length(10)
  payment_otp: string;

  @ApiProperty({
    description:
      'User device ID information. Mandatory for payment method <b>BCA_OC</b>. <br> <ul> <li>If using Android fill with Android ID</li> <li>If using iOS fill with UUID</li> <li>If using browser fill with “WEB”</li></ul>',
    required: false,
    maxLength: 255,
  })
  @IsString()
  @Length(255)
  @ValidateIf((o) => o.payment_method === 'BCA_OC')
  @IsNotEmpty({
    message: 'device_id is Mandatory for payment method BCA_OC.',
  })
  device_id: string;

  @ApiProperty({
    description:
      'Contains user device information. Mandatory for payment method BCA_OC.',
    required: false,
    maxLength: 300,
  })
  @IsString()
  @Length(300)
  @ValidateIf((o) => o.payment_method === 'BCA_OC')
  @IsNotEmpty({
    message: 'user_agent is Mandatory for payment method BCA_OC.',
  })
  user_agent: string;

  @ApiProperty({
    example: '127.0.0.1',
    description:
      'User IP address information. Mandatory for payment method BCA_OC. Example: 127.0.0.1',
    required: false,
    maxLength: 50,
  })
  @IsString()
  @Length(50)
  @ValidateIf((o) => o.payment_method === 'BCA_OC')
  @IsNotEmpty({
    message: 'ip_address is Mandatory for payment method BCA_OC.',
  })
  ip_address: string;

  @ApiProperty({
    description: 'UTM Source.',
    required: false,
  })
  @IsString()
  utm_source: string;

  @ApiProperty({
    description: 'UTM Medium.',
    required: false,
  })
  @IsString()
  utm_medium: string;

  @ApiProperty({
    description: 'UTM Campaign.',
    required: false,
  })
  @IsString()
  utm_campaign: string;

  @ApiProperty({
    description:
      'CUG (Closed User Group) ID used for Family Plan child member provisioning.',
    required: false,
  })
  @IsString()
  cug_id: string;

  @ApiProperty({
    description:
      'ELISA Password. Correlated with Channel ID. Mandatory if using external payment fintech via ELISA.',
    required: false,
  })
  @IsString()
  element4: string;

  @ApiProperty({
    description:
      'Service Migration Type. Mandatory for B2C Postpaid Granular Add Offer. <br> LOV <br> <ul> <li>psb</li> <li>ptp</li> <li>sptp</li> </ul>',
    required: false,
  })
  @IsString()
  migration_type: string;

  @ApiProperty({
    description:
      'Mirror Offer ID. <b>Mandatory if scheduler_scenario is 1.</b>',
    required: false,
    example: '00001234',
  })
  @IsString()
  @ValidateIf((o) => o.scheduler_scenario === 1)
  @IsNotEmpty({
    message: 'mirror_offer_id is Mandatory if scheduler_scenario is 1',
  })
  mirror_offer_id: string;

  @ApiProperty({
    description: 'Commitment Period.',
    required: false,
    example: 6,
  })
  @IsNumber()
  commitment_period: number;

  @ApiProperty({
    description:
      'Scheduler Scenario. <br><table><tr><td>LOV</td> <td>Description</td> </tr> <tr> <td>1</td> <td>Contract with Mirror</td> </tr> </tr> <tr> <td>2</td> <td>Contract without Mirror</td> </tr> </tr> <tr> <td>3</td> <td>One Time Purchase</td> </tr> </tr> <tr> <td>4</td> <td>Renewal with VAS</td> </tr></table>',
    required: false,
  })
  @IsNumber()
  scheduler_scenario: number;

  @ApiProperty({
    description: 'User Role/Type.',
    required: false,
  })
  @IsString()
  user_type: string;

  @ApiProperty({
    description: 'Penalty Flag. LOV: - TRUE or FALSE',
    required: false,
    enum: ['TRUE', 'FALSE'],
  })
  @IsString()
  penalty_flag: string;

  @ApiProperty({
    description: 'Penalty Type. LOV: - FLAT or REMAINING',
    required: false,
    enum: ['FLAT', 'REMAINING'],
  })
  @IsString()
  penalty_type: string;

  @ApiProperty({
    description:
      'Penalty Flat Amount. <b>Mandatory if penalty_type is FLAT.</b> ',
    required: false,
    example: '50000',
  })
  @IsString()
  @ValidateIf((o) => o.penalty_type === 'FLAT')
  @IsNotEmpty({
    message: 'penalty_flat_amount is Mandatory if penalty_type is FLAT.',
  })
  penalty_flat_amount: string;

  @ApiProperty({
    description:
      'Penalty Remaining Amount. <b>Mandatory if penalty_type is REMAINING.</b>',
    required: false,
    example: '50000',
  })
  @IsString()
  @ValidateIf((o) => o.penalty_type === 'REMAINING')
  @IsNotEmpty({
    message:
      'penalty_remaining_amount is Mandatory if penalty_type is REMAINING.',
  })
  penalty_remaining_amount: string;

  @ApiProperty({
    description: 'Discount Amount.',
    required: false,
  })
  @IsString()
  discount_amount: string;

  @ApiProperty({
    description: 'Customer information of Service ID A.',
    required: false,
  })
  @Type(() => OrderCustomerInfoDto)
  customer_info: OrderCustomerInfoDto;

  @ApiProperty({
    description:
      "Transaction expiry details. Mandatory for external payment_method except 'TCASH' and 'OMNICHANNEL'.",
    type: OrderExpiryDto,
    required: false,
  })
  @Type(() => OrderExpiryDto)
  expiry: OrderExpiryDto;

  @ApiProperty({
    description:
      'Family members MSISDN for Family Plan. If not send by channel, ignore this parameter.',
    type: OrderActiveMemberDTO,
    isArray: true,
    required: false,
  })
  @Type(() => OrderActiveMemberDTO)
  activated_members: OrderActiveMemberDTO[];

  @ApiProperty({
    description: 'Merchant Profile.',
    type: OrderMerchantProfileDto,
    required: false,
  })
  @Type(() => OrderMerchantProfileDto)
  marchant_profile: OrderMerchantProfileDto;
}

export class EsbOrderDTOResponse extends SetConfigDTOResponse {
  @ApiProperty({
    description: 'Response from submit order',
    type: EsbOrderResponse,
  })
  @Type(() => EsbOrderResponse)
  payload: EsbOrderResponse;
}

export class NgrsDTOResponse extends SetConfigDTOResponse {
  @ApiProperty({
    description: 'Response from submit order',
    type: EsbOrderResponse,
  })
  payload: any;
}
