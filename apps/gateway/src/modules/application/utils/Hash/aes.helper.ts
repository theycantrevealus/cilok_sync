import * as process from "process";

enum AesTrxType {
  ENCRYPT = 'ENCRYPT',
  DECRYPT = 'DECRYPT'
}

function AesEncryptDecrypt(cmd: string, text: string) {
  const CryptoJS = require('crypto-js');

  if (cmd.toUpperCase() == AesTrxType.ENCRYPT) {
    return CryptoJS.AES.encrypt(
      text,
      process.env.SECRET_KEY_CALLBACK
    ).toString()
  } else {
    const bytes = CryptoJS.AES.decrypt(
      text,
      process.env.SECRET_KEY_CALLBACK
    )
    return bytes.toString(CryptoJS.enc.Utf8)
  }
}

export {
  AesTrxType,
  AesEncryptDecrypt
}
