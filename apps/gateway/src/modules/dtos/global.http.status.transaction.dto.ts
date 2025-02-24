import { HttpStatus } from '@nestjs/common';

import { HttpStatusTransaction } from './http.status.transaction.dto';

export enum HttpCodeTransaction {
  CODE_SUCCESS_200 = 'S00000',
  CODE_SKIP_200 = 'W00000',
  CODE_INTERNAL_ERROR_500 = 'X00000',
  ERR_NOT_FOUND_404 = 'E00000',
  ERR_API_NOT_FOUND_404 = 'E00001',
  ERR_SERVICE_NOT_FOUND_404 = 'E00002',
  ERR_ACCESS_TOKEN_MISSING_403 = 'E01000',
  ERR_ACCESS_TOKEN_INVALID_401 = 'E01001',
  ERR_ACCESS_TOKEN_NOT_FOUND_OR_EXPIRED_401 = 'E01001',
  ERR_GRANT_TYPE_INVALID_403 = 'E01002',
  ERR_AUTHENTICATE_FAILED_403 = 'E01003',
  ERR_CONTENT_TYPE_INVALID_400 = 'E02000',
  ERR_CONTENT_DATA_INVALID_400 = 'E02001',
  ERR_UNSUPPORTED_METHOD_405 = 'E02002',
  ERR_QUERY_STRING_400 = 'E02003',
  ERR_RECIPIENT_MISSING_400 = 'E03000',
  ERR_FILE_MISSING_400 = 'E03001',
  ERR_PHONE_INVALID_400 = 'E03002',
  ERR_QUOTA_LIMIT_400 = 'E03003',
  ERR_OTP_MISMATCH_400 = 'E04000',
  ERR_PIN_MISMATCH_400 = 'E04001',
  ERR_FRAUD_400 = 'E04002',
  ERR_BLACK_LIST_400 = 'E04003',
  ERR_WHITE_LIST_400 = 'E04004',
  ERR_MAX_REDEEM_400 = 'E04005',
  ERR_CUSTOMER_TYPE_400 = 'E04006',
  ERR_LOS_400 = 'E04007',
  ERR_MAX_REDEEM_PERIOD_400 = 'E04008',
  ERR_DATA_VERSIONING_400 = 'E07000',
  ERR_DATA_EXISTS_400 = 'E07001',
  ERR_INSUFFICIENT_POINTS_400 = 'E07005',
  UNKNOWN_ERROR_500 = '-',
}

export enum HttpMsgTransaction {
  DESC_CODE_SUCCESS = 'Success',
  DESC_CODE_SUCCESS_200 = 'Code Success',
  DESC_CODE_SKIP_200 = 'Code Skip',
  DESC_CODE_INTERNAL_ERROR_500 = 'Code Internal Error',
  DESC_ERR_NOT_FOUND_404 = 'Error Not Found',
  DESC_ERR_API_NOT_FOUND_404 = 'Error API Not Found',
  DESC_ERR_SERVICE_NOT_FOUND_404 = 'Error Srvice Not Found',
  DESC_ERR_ACCESS_TOKEN_MISSING_403 = 'Error Access Token Missing',
  DESC_ERR_ACCESS_TOKEN_INVALID_401 = 'Error Access Token Invalid',
  DESC_ERR_GRANT_TYPE_INVALID_403 = 'Error Grand Type Invalid',
  DESC_ERR_AUTHENTICATE_FAILED_403 = 'Error Authenticate Failed',
  DESC_ERR_CONTENT_TYPE_INVALID_400 = 'Error Content Type Invalid',
  DESC_ERR_CONTENT_DATA_INVALID_400 = 'Error Content Data Invalid',
  DESC_ERR_UNSUPPORTED_METHOD_405 = 'Error Unsupported Method',
  DESC_ERR_QUERY_STRING_400 = 'Error Query String',
  DESC_ERR_RECIPIENT_MISSING_400 = 'Error Recipent Missing',
  DESC_ERR_FILE_MISSING_400 = 'Error File Missing',
  DESC_ERR_PHONE_INVALID_400 = 'Error Phone Invalid',
  DESC_ERR_QUOTA_LIMIT_400 = 'Error Quota Limit',
  DESC_ERR_OTP_MISMATCH_400 = 'Error OTP Mismatch',
  DESC_ERR_PIN_MISMATCH_400 = 'Error PIN Mismatch',
  DESC_ERR_FRAUD_400 = 'Error Fraud',
  DESC_ERR_BLACK_LIST_400 = 'Error Black List',
  DESC_ERR_WHITE_LIST_400 = 'Error White List',
  DESC_ERR_MAX_REDEEM_400 = 'Error Max Redeem',
  DESC_ERR_CUSTOMER_TYPE_400 = 'Error Customer Type',
  DESC_ERR_LOS_400 = 'Error Los',
  DESC_ERR_MAX_REDEEM_PERIOD_400 = 'Error Max Redeem Period',
  DESC_ERR_DATA_VERSIONING_400 = 'Error Data Versioning',
  DESC_ERR_DATA_EXISTS_400 = 'Error Data Exists',
  DESC_UNKNOWN_ERROR_500 = 'Unknown Error',
}

export enum HttpMsgOtherTransaction {
  DESC_ERR_CONTENT_DATA_INVALID_400 = 'Keyword parameter is not number. ex: [keyword][space][number]',
}

export const responseGlobal = {
  success: {
    S00000: {
      httpCode: 200,
      forResponse: { code: 'W00000', message: 'Code Success' },
    },
    W00000: {
      httpCode: 200,
      forResponse: { code: 'W00000', message: 'Code Skip' },
    },
  },
  error: {
    insufficient: {
      condition: ['isInsufficientPoint'],
      httpCode: 400,
      forResponse: {
        code: 'E70005',
        message: 'Error: Insufficient Point Balance',
      },
    },
    format: {
      condition: ['matches', 'isExpired'],
      httpCode: 400,
      forResponse: {
        code: 'E70002',
        message: 'Error: Input Format is invalid',
      },
    },
    invalid: {
      condition: [
        'minLength',
        'isBoolean',
        'isNumber',
        'isNumberString',
        'isNotEmpty',
        'isInvalidDataContent',
        'isDefined',
        'isPositive',
        'IsPositive',
        'isNegative',
        'IsNegative',
        'ValidateIf',
        'Min',
      ],
      httpCode: 400,
      forResponse: {
        code: 'E02001',
        message: 'Error: Invalid Data Content',
      },
    },
    required: {
      condition: [''],
      httpCode: 400,
      forResponse: {
        code: 'E02001',
        message: 'Error: Required input is empty',
      },
    },
    unAuthorized: {
      condition: ['isUnauthorized'],
      httpCode: HttpStatus.UNAUTHORIZED,
      forResponse: {
        code: 'E01003',
        message: 'Error: Unauthorized Account',
      },
    },
    tokenNotFoundOrExpired: {
      condition: ['isTokenNotFoundOrExpired'],
      httpCode: HttpStatus.UNAUTHORIZED,
      forResponse: {
        code: 'E01001',
        message: 'Error: Refresh/Access Token not found or expired',
      },
    },
    notFound: {
      condition: ['isNotFound'],
      httpCode: HttpStatus.NOT_FOUND,
      forResponse: {
        code: HttpStatusTransaction.ERR_KEYWORD_NOT_FOUND,
        message: 'Error : Not Found',
      },
    },
    unregisteredProgram: {
      condition: ['isUnregisteredProgram'],
      httpCode: HttpStatus.NOT_FOUND,
      forResponse: {
        code: 'E10005',
        message: 'Error : Not Found',
      },
    },
    merchantNotFound: {
      condition: ['isMerchantNotFound'],
      httpCode: HttpStatus.NOT_FOUND,
      forResponse: {
        code: 'E10002',
        message: 'Merchant Not Found',
      },
    },
    notFoundGeneral: {
      condition: ['isNotFoundGeneral'],
      httpCode: HttpStatus.NOT_FOUND,
      forResponse: {
        code: HttpStatusTransaction.ERR_NOT_FOUND,
        message: 'Error : Not Found',
      },
    },
    tokenMissing: {
      condition: ['isTokenMissing'],
      httpCode: HttpStatus.FORBIDDEN,
      forResponse: {
        code: HttpCodeTransaction.ERR_ACCESS_TOKEN_MISSING_403,
        message: HttpMsgTransaction.DESC_ERR_ACCESS_TOKEN_MISSING_403,
      },
    },
    grantTypeInvalid: {
      condition: ['isGrantTypeInvalid'],
      httpCode: HttpStatus.FORBIDDEN,
      forResponse: {
        code: HttpCodeTransaction.ERR_GRANT_TYPE_INVALID_403,
        message: HttpMsgTransaction.DESC_ERR_GRANT_TYPE_INVALID_403,
      },
    },
    general: {
      condition: ['isUnknown'],
      httpCode: HttpStatus.INTERNAL_SERVER_ERROR,
      forResponse: {
        code: '-',
        message: 'Error: Unknown',
      },
    },
    voucherCodeLength: {
      condition: ['isVoucherCodeLength'],
      httpCode: HttpStatus.UNPROCESSABLE_ENTITY,
      forResponse: {
        code: '-',
        message: 'Error: Invalid Data Content',
      },
    },
  },
};
