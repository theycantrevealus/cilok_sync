export default () => ({
  'link-aja-backend': {
    api: {
      url: process.env.LINK_AJA_BACKEND_API_URL,
      url_bonus: process.env.LINK_AJA_BACKEND_API_URL_BONUS,
    },
    client: {
      username: process.env.LINK_AJA_BACKEND_CLIENT_USERNAME,
      secret: process.env.LINK_AJA_BACKEND_CLIENT_SECRET,
      username_bonus: process.env.LINK_AJA_BACKEND_CLIENT_USERNAME_BONUS,
      secret_bonus: process.env.LINK_AJA_BACKEND_CLIENT_SECRET_BONUS,
      proxy: process.env.LINK_AJA_BACKEND_PROXY_URL,
      port: process.env.LINK_AJA_BACKEND_PROXY_PORT,
      http: process.env.LINK_AJA_BACKEND_PROXY_HTTP,
      timeout: process.env.OUTBOUND_TIMEOUT,
    },
  },
});
