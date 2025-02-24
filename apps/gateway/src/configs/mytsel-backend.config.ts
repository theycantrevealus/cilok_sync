export default () => ({
  'mytsel-backend': {
    api: {
      url: process.env.MYTSEL_BACKEND_API_URL,
    },
    client: {
      api_key: process.env.MYTSEL_BACKEND_API_KEY,
      secret: process.env.MYTSEL_BACKEND_API_SECRET,
      encryption_secret: process.env.MYTSEL_BACKEND_API_ENCRYPTION_SECRET,
    },
  },
});
