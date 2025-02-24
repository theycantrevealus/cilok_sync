import { HttpStatus } from '@nestjs/common';

import {
  InjectPointResponseAccepted,
  InjectPointResponseBadRequest,
  InjectPointResponseCreated,
  InjectPointResponseForbidden,
  InjectPointResponseInternalServerError,
  InjectPointResponseMethodNotAllowed,
  InjectPointResponseNoContent,
  InjectPointResponseNotFound,
  InjectPointResponseOk,
  InjectPointResponseUnauthorized,
  InjectPointResponseUnprocessableEntity,
} from '@/transaction/dtos/point/inject/inject.point.response.dto';

const ApiResponseInjectPoint = {
  R200: {
    status: HttpStatus.OK,
    type: InjectPointResponseOk,
    description: `The HTTP 201 Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`,
  },
  R201: {
    status: HttpStatus.CREATED,
    type: InjectPointResponseCreated,
    description: `The HTTP 201 Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`,
  },
  R202: {
    status: HttpStatus.ACCEPTED,
    type: InjectPointResponseAccepted,
    description: `The HTTP 201 Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`,
  },
  R204: {
    status: HttpStatus.NO_CONTENT,
    type: InjectPointResponseNoContent,
    description: `The HTTP 204 No Content success status response code indicates that a request has succeeded, but that <b>the client doesn't need to navigate away from its current page</b>.`,
  },
  R400: {
    status: HttpStatus.BAD_REQUEST,
    type: InjectPointResponseBadRequest,
    description: `The HyperText Transfer Protocol (HTTP) 400 Bad Request response status code indicates that <b>the server cannot or will not process the request due to something that is perceived to be a client error</b> (for example, malformed request syntax, invalid request message framing, or deceptive request routing).`,
  },
  R401: {
    status: HttpStatus.UNAUTHORIZED,
    type: InjectPointResponseUnauthorized,
    description: `The HyperText Transfer Protocol (HTTP) 401 Unauthorized response status code indicates that <b>the client request has not been completed because it lacks valid authentication credentials for the requested resource</b>.`,
  },
  R403: {
    status: HttpStatus.FORBIDDEN,
    type: InjectPointResponseForbidden,
    description: `The HTTP 403 Forbidden response status code indicates that <b>the server understands the request but refuses to authorize it</b>.<br />This status is similar to 401, but for the 403 Forbidden status code re-authenticating makes no difference. The access is permanently forbidden and tied to the application logic, such as insufficient rights to a resource.`,
  },
  R404: {
    status: HttpStatus.NOT_FOUND,
    example: 404,
    type: InjectPointResponseNotFound,
    description: `A 404 <b>not found error</b> is an HTTP status code that means that the page you wanted to access a website couldn't be found on their server.`,
  },
  R405: {
    status: HttpStatus.METHOD_NOT_ALLOWED,
    type: InjectPointResponseMethodNotAllowed,
    description: `The HyperText Transfer Protocol (HTTP) 405 Method Not Allowed response status code indicates that <b>the server knows the request method, but the target resource doesn't support this method</b>.`,
  },
  R422: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: InjectPointResponseUnprocessableEntity,
    description: `The HyperText Transfer Protocol (HTTP) 422 Unprocessable Entity response status code indicates that <b>the server understands the content type of the request entity, and the syntax of the request entity is correct, but it was unable to process the contained instructions</b>.`,
  },
  R424: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: InjectPointResponseUnprocessableEntity,
    description: `The 424 <b>(Failed Dependency)</b> status code means that the method could not be performed on the resource because the requested action depended on another action and that action failed.`,
  },
  R500: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    type: InjectPointResponseInternalServerError,
    description: `The HTTP status code 500 is a generic error response. It means that <b>the server encountered an unexpected condition that prevented it from fulfilling the request</b>.`,
  },
};

export { ApiResponseInjectPoint };
