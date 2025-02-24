export default () => ({
  'esb-backend': {
    api: {
      url: process.env.ESB_BACKEND_API_URL,
      url_dsp: process.env.ESB_BACKEND_API_URL_DSP,
      ca: process.env.ESB_BACKEND_API_CA,
      timeout: process.env.OUTBOUND_TIMEOUT,
    },
    client: {
      api_key: process.env.ESB_BACKEND_API_KEY,
      secret: process.env.ESB_BACKEND_API_SECRET,
      encryption_secret: process.env.ESB_BACKEND_API_ENCRYPTION_SECRET,
    },
    ngrs: {
      merchant: {
        third_party_id: process.env.ESB_BACKEND_NGRS_MERCHANT_THIRD_PARTY_ID,
        third_party_password:
          process.env.ESB_BACKEND_NGRS_MERCHANT_THIRD_PARTY_PASSWORD,
        delivery_channel:
          process.env.ESB_BACKEND_NGRS_MERCHANT_DELIVERY_CHANNEL,
        organization_short_code:
          process.env.ESB_BACKEND_NGRS_MERCHANT_ORGANIZATION_SHORT_CODE,
      },
      recharge: {
        organization_code:
          process.env.ESB_BACKEND_NGRS_RECHARGE_ORGANIZATION_CODE,
        channel: process.env.ESB_BACKEND_NGRS_RECHARGE_CHANNEL,
        stock_type: process.env.ESB_BACKEND_NGRS_RECHARGE_STOCK_TYPE,
        element: process.env.ESB_BACKEND_NGRS_RECHARGE_ELEMENT,
      },
    },
    telco: {
      prepaid: {
        order_type: process.env.ESB_BACKEND_PREPAID_ORDER_TYPE,
        purchase_mode: process.env.ESB_BACKEND_PREPAID_PURCHASE_MODE,
        payment_method: process.env.ESB_BACKEND_PREPAID_PAYMENT_METHOD,
        payment_name: process.env.ESB_BACKEND_PREPAID_PAYMENT_NAME,
        subscription: process.env.ESB_BACKEND_PREPAID_SUBSCRIPTION_FLAG,
        callback_url: process.env.ESB_BACKEND_PREPAID_CALLBACK_URL,
        version: process.env.ESB_BACKEND_PREPAID_VERSION,
      },
      postpaid: {
        order_type: process.env.ESB_BACKEND_POSTPAID_ORDER_TYPE,
        purchase_mode: process.env.ESB_BACKEND_POSTPAID_PURCHASE_MODE,
        payment_method: process.env.ESB_BACKEND_POSTPAID_PAYMENT_METHOD,
        payment_name: process.env.ESB_BACKEND_POSTPAID_PAYMENT_NAME,
        subscription: process.env.ESB_BACKEND_POSTPAID_SUBSCRIPTION_FLAG,
        callback_url: process.env.ESB_BACKEND_POSTPAID_CALLBACK_URL,
        version: process.env.ESB_BACKEND_POSTPAID_VERSION,
      },
    },
  },
});
