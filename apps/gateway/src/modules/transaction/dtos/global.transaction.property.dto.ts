import { HttpStatus } from '@nestjs/common';

import {
  HttpCodeTransaction,
  HttpMsgTransaction,
} from '@/dtos/global.http.status.transaction.dto';

const GlobalTransactionApiResponse = {
  R200: {
    status: HttpStatus.OK,
    description:
      `<ul style="padding:5px">` +
      `<li>` +
      HttpCodeTransaction.CODE_SUCCESS_200 +
      ` (` +
      HttpMsgTransaction.DESC_CODE_SUCCESS_200 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.CODE_SKIP_200 +
      ` (` +
      HttpMsgTransaction.DESC_CODE_SKIP_200 +
      `)` +
      `</li>` +
      `</ul>`,
  },
  R400: {
    status: HttpStatus.BAD_REQUEST,
    description:
      `<ul style="padding:5px">` +
      `<li>` +
      HttpCodeTransaction.ERR_CONTENT_TYPE_INVALID_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_CONTENT_TYPE_INVALID_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_CONTENT_DATA_INVALID_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_CONTENT_DATA_INVALID_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_QUERY_STRING_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_QUERY_STRING_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_RECIPIENT_MISSING_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_RECIPIENT_MISSING_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_FILE_MISSING_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_FILE_MISSING_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_PHONE_INVALID_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_PHONE_INVALID_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_QUOTA_LIMIT_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_QUOTA_LIMIT_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_OTP_MISMATCH_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_OTP_MISMATCH_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_PIN_MISMATCH_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_PIN_MISMATCH_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_FRAUD_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_FRAUD_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_BLACK_LIST_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_BLACK_LIST_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_WHITE_LIST_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_WHITE_LIST_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_MAX_REDEEM_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_MAX_REDEEM_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_CUSTOMER_TYPE_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_CUSTOMER_TYPE_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_LOS_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_LOS_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_MAX_REDEEM_PERIOD_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_MAX_REDEEM_PERIOD_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_DATA_VERSIONING_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_DATA_VERSIONING_400 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_DATA_EXISTS_400 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_DATA_EXISTS_400 +
      `)` +
      `</li>` +
      `</ul>`,
  },
  R401: {
    status: HttpStatus.UNAUTHORIZED,
    description:
      `<ul style="padding:5px">` +
      `<li>` +
      HttpCodeTransaction.ERR_ACCESS_TOKEN_INVALID_401 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_ACCESS_TOKEN_INVALID_401 +
      `)` +
      `</li>` +
      `</ul>`,
  },
  R403: {
    status: HttpStatus.FORBIDDEN,
    description:
      `<ul style="padding:5px">` +
      `<li>` +
      HttpCodeTransaction.ERR_ACCESS_TOKEN_MISSING_403 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_ACCESS_TOKEN_MISSING_403 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_GRANT_TYPE_INVALID_403 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_GRANT_TYPE_INVALID_403 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_AUTHENTICATE_FAILED_403 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_AUTHENTICATE_FAILED_403 +
      `)` +
      `</li>` +
      `</ul>`,
  },
  R404: {
    status: HttpStatus.NOT_FOUND,
    description:
      `<ul style="padding:5px">` +
      `<li>` +
      HttpCodeTransaction.ERR_NOT_FOUND_404 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_NOT_FOUND_404 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_API_NOT_FOUND_404 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_API_NOT_FOUND_404 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.ERR_SERVICE_NOT_FOUND_404 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_SERVICE_NOT_FOUND_404 +
      `)` +
      `</li>` +
      `</ul>`,
  },
  R405: {
    status: HttpStatus.METHOD_NOT_ALLOWED,
    description:
      `<ul style="padding:5px">` +
      `<li>` +
      HttpCodeTransaction.ERR_UNSUPPORTED_METHOD_405 +
      ` (` +
      HttpMsgTransaction.DESC_ERR_UNSUPPORTED_METHOD_405 +
      `)` +
      `</li>` +
      `</ul>`,
  },
  R500: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description:
      `<ul style="padding:5px">` +
      `<li>` +
      HttpCodeTransaction.CODE_INTERNAL_ERROR_500 +
      ` (` +
      HttpMsgTransaction.DESC_CODE_INTERNAL_ERROR_500 +
      `)` +
      `</li>` +
      `<li>` +
      HttpCodeTransaction.UNKNOWN_ERROR_500 +
      ` (` +
      HttpMsgTransaction.DESC_UNKNOWN_ERROR_500 +
      `)` +
      `</li>` +
      `</ul>`,
  },
};

export { GlobalTransactionApiResponse };
