export default () => ({
  application: {
    name: process.env.PROV_PREPAID_NAME,
    host: process.env.PROV_PREPAID_HOST,
    port: process.env.PROV_PREPAID_PORT,
  },
});
