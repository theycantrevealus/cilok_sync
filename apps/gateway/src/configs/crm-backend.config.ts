export default () => ({
  'crmb': {
    api: {
      url: process.env.CRMB_API_URL,
      timeout: process.env.CRM_API_TIMEOUT,
      ca: process.env.CRMB_API_CA,
      auth_token: process.env.CRMB_API_AUTH_TOKEN,
    },
    client: {
      api_key: process.env.CRMB_CLIENT_API_KEY,
      secret: process.env.CRMB_CLIENT_SECRET,
      is_http: process.env.CRMB_IS_HTTP,
    },
  },
});
