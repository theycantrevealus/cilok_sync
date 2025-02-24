export default () => ({
  'core-backend': {
    raw: process.env.CORE_BACK_END,
    raw_port: process.env.CORE_BACK_END_PORT,
    raw_core_port: `${process.env.CORE_BACK_END_HTTP_MODE}://${
      process.env.CORE_BACK_END
    }${
      parseInt(process.env.CORE_BACK_END_PORT) > 0
        ? `:${process.env.CORE_BACK_END_PORT}`
        : ''
    }`,
    api: {
      mode: process.env.CORE_BACK_END_HTTP_MODE,
      url:
        (process.env.CORE_BACK_END_HTTP_MODE
          ? `${process.env.CORE_BACK_END_HTTP_MODE}://`
          : 'https://') + `${process.env.CORE_BACKEND_API_URL}`,
      'token-gateway': process.env.CORE_BACKEND_API_TOKEN_GATEWAY,
    },
    client: {
      id: process.env.CORE_BACKEND_CLIENT_ID,
      secret: process.env.CORE_BACKEND_CLIENT_SECRET,
    },
    realm: {
      id: process.env.CORE_BACKEND_REALM_ID,
    },
    branch: {
      id: process.env.CORE_BACKEND_BRANCH_ID,
    },
    merchant: {
      id: process.env.CORE_BACKEND_MERCHANT_ID,
    },
    coupon_prefix: {
      id: process.env.CORE_BACKEND_COUPON_PREFIX,
    },
    product: {
      id: process.env.CORE_BACKEND_PRODUCT_ID,
    },
    coupon_product: {
      id: process.env.CORE_BACKEND_COUPON_PRODUCT,
    },
    voucher_product: {
      id: process.env.CORE_BACKEND_VOUCHER_PRODUCT,
    },
    telco_postpaid_product: {
      id: process.env.CORE_BACKEND_TELCO_POSTPAID_PRODUCT,
    },
    telco_prepaid_product: {
      id: process.env.CORE_BACKEND_TELCO_PREPAID_PRODUCT,
    },
    link_aja_main_product: {
      id: process.env.CORE_BACKEND_LINK_AJA_MAIN_PRODUCT,
    },
    link_aja_bonus_product: {
      id: process.env.CORE_BACKEND_LINK_AJA_BONUS_PRODUCT,
    },
    link_aja_voucher_product: {
      id: process.env.CORE_BACKEND_LINK_AJA_VOUCHER_PRODUCT,
    },
    ngrs_product: {
      id: process.env.CORE_BACKEND_NGRS_PRODUCT,
    },
    direct_redeem_product: {
      id: process.env.CORE_BACKEND_DIRECT_REDEEM_PRODUCT,
    },
    void_product: {
      id: process.env.CORE_BACKEND_VOID_PRODUCT,
    },
    loyalty_poin_product: {
      id: process.env.CORE_BACKEND_LOYALTY_POIN_PRODUCT_ID,
    },
    donation_product: {
      id: process.env.CORE_BACKEND_DONATION_PRODUCT_ID,
    },
  },
});
