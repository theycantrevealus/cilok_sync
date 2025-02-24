import * as process from 'process';

export default () => {
  const currentUri =
    process.env.MONGO_DB_USER !== '' && process.env.MONGO_DB_PASSWORD !== ''
      ? `mongodb://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB_NAME}`
      : `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB_NAME}`;

  const currentUriReporting =
    process.env.MONGO_REPORTING_DB_USER !== '' &&
    process.env.MONGO_REPORTING_DB_PASSWORD !== ''
      ? `mongodb://${process.env.MONGO_REPORTING_DB_USER}:${process.env.MONGO_REPORTING_DB_PASSWORD}@${process.env.MONGO_REPORTING_DB_HOST}:${process.env.MONGO_REPORTING_DB_PORT}/${process.env.MONGO_REPORTING_DB_NAME}`
      : `mongodb://${process.env.MONGO_REPORTING_DB_HOST}:${process.env.MONGO_REPORTING_DB_PORT}/${process.env.MONGO_REPORTING_DB_NAME}`;

  return {
    seed: {
      location: process.env.SEEDS_DIR,
    },
    mongo: {
      host: process.env.MONGO_HOST,
      port: parseInt(process.env.MONGO_PORT),

      'db-name': process.env.MONGO_DB_NAME,
      'db-user': process.env.MONGO_DB_USER,
      'db-password': process.env.MONGO_DB_PASSWORD,
      uri:
        process.env.MONGO_DB_CUSTOM_URI !== ''
          ? process.env.MONGO_DB_CUSTOM_URI
          : currentUri,
      direct_connection: parseInt(process.env.MONGO_DB_DIRECT_CONNECTION) === 1,
      tls: parseInt(process.env.MONGO_DB_TLS) === 1,
      tls_allow_invalid_certificates:
        parseInt(process.env.MONGO_DB_ALLOW_INVALID_CERTIFICATES) === 1,
      auth_source: process.env.MONGO_DB_AUTH_SOURCE,
    },
    mongo_reporting: {
      host: process.env.MONGO_REPORTING_DB_HOST,
      port: parseInt(process.env.MONGO_REPORTING_DB_PORT),

      'db-name': process.env.MONGO_REPORTING_DB_NAME,
      'db-user': process.env.MONGO_REPORTING_DB_USER,
      'db-password': process.env.MONGO_REPORTING_DB_PASSWORD,
      uri:
        process.env.MONGO_REPORTING_DB_CUSTOM_URI !== ''
          ? process.env.MONGO_REPORTING_DB_CUSTOM_URI
          : currentUri,
      direct_connection:
        parseInt(process.env.MONGO_REPORTING_DB_DIRECT_CONNECTION) === 1,
      tls: parseInt(process.env.MONGO_REPORTING_DB_TLS) === 1,
      tls_allow_invalid_certificates:
        parseInt(process.env.MONGO_REPORTING_DB_ALLOW_INVALID_CERTIFICATES) ===
        1,
      auth_source: process.env.MONGO_REPORTING_DB_AUTH_SOURCE,
    },
    mongo_secondary: {
      host: process.env.MONGO_SECONDARY_DB_HOST,
      port: parseInt(process.env.MONGO_SECONDARY_DB_PORT),

      'db-name': process.env.MONGO_SECONDARY_DB_NAME,
      'db-user': process.env.MONGO_SECONDARY_DB_USER,
      'db-password': process.env.MONGO_SECONDARY_DB_PASSWORD,
      uri:
        process.env.MONGO_SECONDARY_DB_CUSTOM_URI !== ''
          ? process.env.MONGO_SECONDARY_DB_CUSTOM_URI
          : currentUri,
      direct_connection:
        parseInt(process.env.MONGO_SECONDARY_DB_DIRECT_CONNECTION) === 1,
      tls: parseInt(process.env.MONGO_SECONDARY_DB_TLS) === 1,
      tls_allow_invalid_certificates:
        parseInt(process.env.MONGO_SECONDARY_DB_ALLOW_INVALID_CERTIFICATES) ===
        1,
      auth_source: process.env.MONGO_SECONDARY_DB_AUTH_SOURCE,
    },
    mongo_test: {
      host: process.env.TEST_MONGO_HOST,
      port: parseInt(process.env.TEST_MONGO_PORT),
      'db-name': process.env.TEST_MONGO_DB_NAME,
      'db-user': process.env.TEST_MONGO_DB_USER,
      'db-password': process.env.TEST_MONGO_DB_PASSWORD,
      uri:
        process.env.TEST_MONGO_DB_USER !== '' &&
        process.env.TEST_MONGO_DB_PASSWORD !== ''
          ? `mongodb://${process.env.TEST_MONGO_DB_USER}:${process.env.TEST_MONGO_DB_PASSWORD}@${process.env.TEST_MONGO_HOST}:${process.env.TEST_MONGO_PORT}/${process.env.TEST_MONGO_DB_NAME}`
          : `mongodb://${process.env.TEST_MONGO_HOST}:${process.env.TEST_MONGO_PORT}/${process.env.TEST_MONGO_DB_NAME}`,
    },
  };
};
