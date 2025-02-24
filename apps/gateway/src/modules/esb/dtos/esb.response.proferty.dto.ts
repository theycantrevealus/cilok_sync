import { HttpStatus } from '@nestjs/common';

import { EsbGetBalanceResponseBadRequest } from '@/esb/dtos/esb.getbalance.response';

import { EsbInboxResponseBadRequest } from './ebs.inbox.response';
import { EsbNotificationResponseBadRequest } from './ebs.notification.response';
import { EsbOrderResponseBadRequest } from './esb.order.response';
import { EsbProfileResponseBadRequest } from './esb.profile.response';

const ApiResponseEsb = {
  ORDERR400: {
    status: HttpStatus.BAD_REQUEST,
    type: EsbOrderResponseBadRequest,
    description: `The HyperText Transfer Protocol (HTTP) 400 Bad Request response status code indicates that <b>the server cannot or will not process the request due to something that is perceived to be a client error</b> (for example, malformed request syntax, invalid request message framing, or deceptive request routing).`,
  },
  INBOX400: {
    status: HttpStatus.BAD_REQUEST,
    type: EsbInboxResponseBadRequest,
    description: `The HyperText Transfer Protocol (HTTP) 400 Bad Request response status code indicates that <b>the server cannot or will not process the request due to something that is perceived to be a client error</b> (for example, malformed request syntax, invalid request message framing, or deceptive request routing).`,
  },
  NOTIFICATIONR400: {
    status: HttpStatus.BAD_REQUEST,
    type: EsbNotificationResponseBadRequest,
    description: `The HyperText Transfer Protocol (HTTP) 400 Bad Request response status code indicates that <b>the server cannot or will not process the request due to something that is perceived to be a client error</b> (for example, malformed request syntax, invalid request message framing, or deceptive request routing).`,
  },
  BALANCER400: {
    status: HttpStatus.BAD_REQUEST,
    type: EsbGetBalanceResponseBadRequest,
    description: `The HyperText Transfer Protocol (HTTP) 400 Bad Request response status code indicates that <b>the server cannot or will not process the request due to something that is perceived to be a client error</b> (for example, malformed request syntax, invalid request message framing, or deceptive request routing).`,
  },
  PROFILE400: {
    status: HttpStatus.BAD_REQUEST,
    type: EsbProfileResponseBadRequest,
    description: `The HyperText Transfer Protocol (HTTP) 400 Bad Request response status code indicates that <b>the server cannot or will not process the request due to something that is perceived to be a client error</b> (for example, malformed request syntax, invalid request message framing, or deceptive request routing).`,
  },
};

export { ApiResponseEsb };
