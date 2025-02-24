export const RewardCatalog = () => ({
  reward_catalog_preprod: {
    host: process.env.KEYWORD_SFTP_REWARD_CATALOG_HOST,
    port: process.env.KEYWORD_SFTP_REWARD_CATALOG_PORT,
    username: process.env.KEYWORD_SFTP_REWARD_CATALOG_USERNAME,
    password: process.env.KEYWORD_SFTP_REWARD_CATALOG_PASSWORD,
    key: process.env.KEYWORD_SFTP_REWARD_CATALOG_KEY,
  },
  reward_catalog_tsel: {
    host: process.env.KEYWORD_SFTP_REWARD_CATALOG_HOST_TSEL,
    port: process.env.KEYWORD_SFTP_REWARD_CATALOG_PORT_TSEL,
    username: process.env.KEYWORD_SFTP_REWARD_CATALOG_USERNAME_TSEL,
    password: process.env.KEYWORD_SFTP_REWARD_CATALOG_PASSWORD_TSEL,
  },
});
