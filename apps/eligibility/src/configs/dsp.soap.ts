import * as process from 'process';
export default () => ({
  dsp: {
    url: process.env.SOAP_DSP_URL,
    timeout: process.env.SOAP_DSP_TIMEOUT,
    user: process.env.SOAP_DSP_USER,
    password: process.env.SOAP_DSP_PWD,
  },
});
