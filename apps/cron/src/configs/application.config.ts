export default () => ({
  application: {
    name: process.env.APP_NAME,
    host: process.env.APP_HOST,
    port: process.env.APP_PORT,
    hostport: process.env.APP_HOST_PORT,
    token: '',
    server_identifier: process.env.SERVER_IDENTIFIER,
  },
});
