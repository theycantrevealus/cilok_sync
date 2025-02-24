export default () => ({
  slIP: process.env.SL_IP,
  kafkaMBSEConfig: {
    ip1: process.env.KAFKA_MBSE_IP1,
    ip2: process.env.KAFKA_MBSE_IP2,
    ip3: process.env.KAFKA_MBSE_IP3,
    hostname1: process.env.KAFKA_MBSE_HOSTNAME1,
    hostname2: process.env.KAFKA_MBSE_HOSTNAME2,
    hostname3: process.env.KAFKA_MBSE_HOSTNAME3,
    port: process.env.KAFKA_MBSE_PORT,
    username: process.env.KAFKA_MBSE_USERNAME,
    password: process.env.KAFKA_MBSE_PASSWORD,
  },

  proxyMBSEConfig: {
    ipProxy1: process.env.PROXY_MBSE_IP1,
    ipProxy2: process.env.PROXY_MBSE_IP2,
    hostname1: process.env.PROXY_MBSE_HOSTNAME1,
    hostname2: process.env.PROXY_MBSE_HOSTNAME2,
    port: process.env.PROXY_MBSE_PORT,
    username: process.env.PROXY_MBSE_USERNAME,
    password: process.env.PROXY_MBSE_PASSWORD,
  },
  registryMBSEConfig: {
    ip1: process.env.SCHEMA_REGISTRY_MBSE_IP1,
    ip2: process.env.SCHEMA_REGISTRY_MBSE_IP2,
    hostname1: process.env.SCHEMA_REGISTRY_MBSE_HOSTNAME1,
    hostname2: process.env.SCHEMA_REGISTRY_MBSE_HOSTNAME2,
    port: process.env.SCHEMA_REGISTRY_MBSE_PORT,
    username: process.env.SCHEMA_REGISTRY_USERNAME,
    password: process.env.SCHEMA_REGISTRY_PASSWORD,
  },

  certificates: {
    preTruststore: process.env.KAFKA_MBSE_PRE_TRUSTSTORE_FILE,
    prodTruststore: process.env.KAFKA_MBSE_PROD_TRUSTSTORE_FILE,
    truststore: process.env.KAFKA_MBSE_TRUSTSTORE_FILE,
    developmentTruststore: process.env.KAFKA_MBSE_DEVELOPMENT_TRUSTSTORE_FILE,
  }
});
