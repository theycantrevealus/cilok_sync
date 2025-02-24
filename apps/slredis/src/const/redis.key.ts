export enum RedisDataKey {
  KEYWORD_KEY = 'nc-keyword',
  KEYWORD_KEY2 = 'nc-keywordv2',
  LOV_KEY = 'nc-lov', // _id, name
  NOTIFICATIONTEMPLATE_KEY = 'nc-notificationtemplate',
  SYSTEMCONFIG_KEY = 'nc-systemconfig', // _id, name
  KEYWORDPRIORITY_KEY = 'nc-keywordpriority', // keyword
  ACCOUNTS = 'nc-account-find-by',
  PROGRAM_KEY = 'nc-program', // _id, name, keyword_registration,
  CUSTOMER_KEY = 'nc-customer', // tier
  AUCTION = 'nc-auction',
  RC_BY_SUBS_POINTS_HIGHEST_KEY = 'nc-rc-highest', //reward_catalogue => nc-rc-highest-(point) -> nc-rc-highest-13
  RC_BY_SUBS_POINTS_LOWEST_KEY = 'nc-rc-lowest', //reward_catalogue => nc-rc-lowest-(point) -> nc-rc-lowest-12
  RC_BY_SUBS_TRANSACTION_KEY = 'nc-rc-trx', //reward_catalogue => nc-rc-trx-(program_experience_id)-(point)
  BID_KEY = 'nc-bid',
  STOCK_SUMMARY_KEY = 'nc-stock-summary',
  STOCK_KEY = 'nc-stock',
}

/**
 * KEYWORD_KEY
 * -
 *
 * KEYWORD_KEY2
 * - name
 * - profile-name
 * - coupon-confirmation-${keyword}
 * - coupon-approval-code-${otpDetail.keyword}
 * - coupon-info-${keyword}
 * - coupon-check-${keyword}
 * - approved-${name}
 *
 * LOV_KEY
 * - _id
 * - name
 *
 * NOTIFICATIONTEMPLATE_KEY
 * -
 *
 * SYSTEMCONFIG_KEY
 * - _id
 * - name
 *
 * KEYWORDPRIORITY_KEY
 * - keyword
 *
 * ACCOUNT
 * -
 *
 * PROGRAM_KEY
 * - _id
 * - name
 * - keyword_registration
 */
