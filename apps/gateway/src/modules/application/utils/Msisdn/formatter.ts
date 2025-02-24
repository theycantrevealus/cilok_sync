import { FmcIdenfitiferType } from '../../../transaction/dtos/point/fmc.member.identifier.type';

function allowedMSISDN(msisdn: string) {
  const testRegex = new RegExp(/^(08|62|81|82|83|85|628)+[0-9]+$/gm);
  return testRegex.test(msisdn);
}

function allowedProgramMSISDN(msisdn: string) {
  const testRegex = new RegExp(
    /^((08|628)+(11|12|13|21|22|23|51|52|53))+([0-9]{1,13})$/,
  );
  return testRegex.test(msisdn);
}

function allowedTselID(msisdn: string) {
  const testRegex = new RegExp(/^TID-\d{1,36}$/);
  return testRegex.test(msisdn);
}

function FMC_allowedMSISDN(msisdn: string) {
  return (
    allowedMSISDN(msisdn) ||
    allowedIndihomeNumber(msisdn) ||
    allowedTselID(msisdn)
  );
}

function formatMsisdnCore(msisdn: string) {
  const testRegex = new RegExp(/^(628|8)/gm);
  return msisdn?.toString().replace(testRegex, '08');
}

function formatMsisdnToID(msisdn: string) {
  if (msisdn) {
    const testRegex = new RegExp(/^(08|8)/gm);
    return msisdn?.toString().replace(testRegex, '628');
  }
  return msisdn;
}

function formatIndihomeCore(msisdn: string) {
  const testRegex = new RegExp(/^(1)/gm);
  return msisdn?.toString().replace(testRegex, '01');
}

function FMC_reformatMsisdnCore(msisdn: string) {
  let newFormat = msisdn;
  if (allowedMSISDN(msisdn)) {
    newFormat = formatMsisdnCore(msisdn);
  } else if (allowedIndihomeNumber(msisdn)) {
    newFormat = formatIndihomeCore(msisdn);
  }
  return newFormat;
}

function getMsisdnOnly(msisdn: string) {
  let testRegex = /^(0|62)(\d+)/;
  const match = msisdn.match(testRegex);
  testRegex = /^(1)(\d+)/;
  const matchIndihome = msisdn.match(testRegex);
  if (match) {
    // return the phone number without the leading '0' or '62'
    return match[2];
  } else if (matchIndihome) {
    // return the phone number without the leading '0' or '62'
    return msisdn;
  } else {
    return null; // or throw an error if the phone number is invalid
  }
}

function coreValidationMaxMinLength(str) {
  str = parseInt(str);
  const regex = /^\d{9,12}$/;
  return regex.test(str);
}

function formatIndihomeNumberCore(custNumber: string) {
  const testRegex = new RegExp(/^(1)/gm);
  return custNumber?.toString().replace(testRegex, '01');
}

function formatIndihomeNumberToNonCore(custNumber: string) {
  if (custNumber) {
    const testRegex = new RegExp(/^(01)/, 'gm');
    return custNumber?.toString().replace(testRegex, '1');
  }
  return custNumber;
}

function allowedIndihomeNumber(msisdn: string) {
  // const testRegex = new RegExp(/^(1|01)+[0-9]+$/gm);
  // return testRegex.test(msisdn);
  return !allowedMSISDN(msisdn);
}

function checkIndihomeNumberLength(msisdn: string) {
  return msisdn.length == 12;
}

enum identifierSSO {
  MSISDN = 'msisdn',
  INDIHOME = 'indihome',
  TSELID = 'tselid',
}
function isMatchProgramSSO(msisdn: string, identifier: string) {
  // check identifier service_id
  if (identifier === identifierSSO.MSISDN) {
    return allowedProgramMSISDN(msisdn);
  } else if (identifier === identifierSSO.INDIHOME) {
    return allowedIndihomeNumber(msisdn);
  } else {
    return allowedTselID(msisdn);
  }
}

function validateIndihomeNumber(msisdn: string): ValidateCustomerResult {
  let msg = '';
  let isValid = true;
  if (!allowedIndihomeNumber(msisdn)) {
    msg +=
      'Invalid Indihome number format, must start with any number except 08 & 62';
    isValid = false;
  }

  // if (!checkIndihomeNumberLength(msisdn)) {
  //   msg += 'Invalid Indihome number length, must 12 character';
  //   isValid = false;
  // }

  return {
    isValid: isValid,
    message: msg,
  } as ValidateCustomerResult;
}

/**
 * For validate customer number using flag `idenfitier` type
 * @param custNumber
 * @param type
 * @returns
 */
function validateCustomerIdentifierNumber(
  custNumber: string,
  type: FmcIdenfitiferType,
): ValidateCustomerResult {
  let isValid = false;
  let errMsg = '';
  if (type) {
    switch (type.toUpperCase()) {
      case FmcIdenfitiferType.MSISDN:
        isValid = allowedMSISDN(custNumber);
        if (!isValid) {
          errMsg = 'Invalid MSISDN format';
        }
        break;

      case FmcIdenfitiferType.INDIHOME:
        isValid = allowedIndihomeNumber(custNumber);

        if (!isValid) {
          errMsg =
            'Invalid Indihome number format, must start with any number except 08 & 62';
        }
        break;

      case FmcIdenfitiferType.TSEL_ID:
        isValid = allowedTselID(custNumber);

        if (!isValid) {
          errMsg =
            'Invalid TSEL ID format, must start with TID-, number length start from 1 to 36 characters';
        }
        break;

      default:
        isValid = false;
        errMsg = 'Invalid Identifier Type';
        break;
    }
  } else {
    isValid = false;
    errMsg = 'Identifier can not be empty';
  }

  return {
    isValid: isValid,
    message: errMsg,
  } as ValidateCustomerResult;
}

/**
 * For validate customer number without flag `idenfitifer` type
 * Only using for msisdn or indihome (not for tsel id)
 * @param custNumber
 * @returns
 */
function validateCustomerIdentifierWithoutType(
  custNumber: string,
): ValidateCustomerResult {
  const isMsisdn = allowedMSISDN(custNumber);
  const isIndihome = validateIndihomeNumber(custNumber);

  if (!(isMsisdn || isIndihome.isValid)) {
    return {
      isValid: false,
      message: `Invalid MSISDN or Indihome number`,
    } as ValidateCustomerResult;
  }

  return {
    isValid: true,
    message: '',
  } as ValidateCustomerResult;
}

/**
 * For validate customer number without flag `idenfitifer` type
 * Only using for msisdn or indihome (not for tsel id)
 * @param custNumber
 * @returns
 */
function checkCustomerIdentifier(
  custNumber: string,
): CheckCustomerIdentifierResult {
  const isMsisdn = allowedMSISDN(custNumber);
  if (isMsisdn) {
    return {
      isValid: true,
      type: FmcIdenfitiferType.MSISDN,
      custNumber: custNumber,
    } as CheckCustomerIdentifierResult;
  }

  const isIndihome = validateIndihomeNumber(custNumber);
  if (isIndihome) {
    return {
      isValid: true,
      type: FmcIdenfitiferType.INDIHOME,
      custNumber: custNumber,
    } as CheckCustomerIdentifierResult;
  }

  return {
    isValid: false,
    type: null,
    custNumber: custNumber,
  } as CheckCustomerIdentifierResult;
}

function isObject(value) {
  return typeof value === 'object' && 
         value !== null && 
         !Array.isArray(value);
}

function msisdnCombineFormatted(msisdn: string): string {
  if (allowedMSISDN(msisdn)) {
    return formatMsisdnCore(msisdn);
  }
  if (allowedIndihomeNumber(msisdn)) {
    return formatIndihomeNumberCore(msisdn);
  }
}
function msisdnCombineFormatToId(msisdn: string): string {
  if (allowedMSISDN(msisdn)) {
    return formatMsisdnToID(msisdn);
  }
  if (allowedIndihomeNumber(msisdn)) {
    return formatIndihomeNumberToNonCore(msisdn);
  }
}
function ssoFormatToId(msisdn: string): string {
  if (allowedMSISDN(msisdn)) {
    return formatMsisdnToID(msisdn);
  }
  if (allowedIndihomeNumber(msisdn)) {
    return formatIndihomeNumberToNonCore(msisdn);
  }
  if (allowedTselID(msisdn)) {
    return msisdn;
  }
}
type ValidateCustomerResult = {
  isValid: boolean;
  message: string;
};

type CheckCustomerIdentifierResult = {
  isValid: boolean;
  type: FmcIdenfitiferType;
  custNumber: string;
};

function removeByAttr(arr, attr, value) {
  let i = arr.length;
  while (i--) {
    if (
      arr[i] &&
      arr[i].hasOwnProperty(attr) &&
      arguments.length > 2 &&
      arr[i][attr] === value
    ) {
      arr.splice(i, 1);
    }
  }
  return arr;
}

export {
  allowedIndihomeNumber,
  allowedMSISDN,
  allowedTselID,
  checkCustomerIdentifier,
  CheckCustomerIdentifierResult,
  coreValidationMaxMinLength,
  FMC_allowedMSISDN,
  FMC_reformatMsisdnCore,
  formatIndihomeNumberCore,
  formatIndihomeNumberToNonCore,
  formatMsisdnCore,
  formatMsisdnToID,
  getMsisdnOnly,
  identifierSSO,
  isMatchProgramSSO,
  msisdnCombineFormatted,
  msisdnCombineFormatToId,
  removeByAttr,
  ssoFormatToId,
  validateCustomerIdentifierNumber,
  validateCustomerIdentifierWithoutType,
  ValidateCustomerResult,
  isObject
};
