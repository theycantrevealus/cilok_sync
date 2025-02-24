// TODO blocker
export default () => ({
  'e2ebi-backend': {
    raw_port: process.env.E2EBI_BACKEND_CLIENT_PORT,
    api: {
      url: process.env.E2EBI_BACKEND_CLIENT_IP,
    },
    client: {
      api_key: process.env.E2EBI_BACKEND_CLIENT_API_KEY,
      secret: process.env.E2EBI_BACKEND_CLIENT_SECRET,
    },
  },
});
