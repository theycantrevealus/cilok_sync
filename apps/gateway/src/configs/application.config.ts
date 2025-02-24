export default () => ({
  slIP: process.env.SL_IP,
  application: {
    environment: process.env.NODE_ENV,
    name: process.env.APP_NAME,
    host: process.env.APP_HOST,
    port: process.env.APP_PORT,
    hostport: process.env.APP_HOST_PORT,
    token: '',
  },
});
