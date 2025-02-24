import { Buffer } from "buffer";

/**
 Helper for decode and encode password
 Using iteration for encode or decode given string
 */

const Base64DefaultIteration = 5;

enum Base64TrxType {
  ENCODE = 'ENCODE',
  DECODE = 'DECODE'
}

/**
 * Max 8 iteration to keep the string is not too long
 * @param cmd
 * @param text
 * @param iteration
 */
function Base64EncodeDecode(cmd, text, iteration = Base64DefaultIteration) {
  if (iteration > 8) iteration = 8;

  let result = text
  if (cmd.toUpperCase() == Base64TrxType.ENCODE) {
    for (let i = 1; i <= iteration; i++) {
      result = Buffer.from(result, 'utf8').toString('base64');
    }
  } else {
    for (let i = 1; i <= iteration; i++) {
      result = Buffer.from(result, 'base64').toString('utf8');
    }
  }

  return result
}

export {
  Base64TrxType,
  Base64EncodeDecode,
  Base64DefaultIteration,
}
