export default () => ({
  'sms': {
    host: process.env.SMS_HOST,
    user: process.env.SMS_USER,
    pass: process.env.SMS_PASS
  },
});
