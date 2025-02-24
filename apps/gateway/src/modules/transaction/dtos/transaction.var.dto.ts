import { HttpStatus } from '@nestjs/common';

const DESC_RESP_OK = `The HTTP ${HttpStatus.OK} Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`;
const DESC_RESP_CREATED = `The HTTP ${HttpStatus.CREATED} Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`;
const DESC_RESP_ACCEPTED = `The HTTP ${HttpStatus.ACCEPTED} Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`;
const DESC_RESP_NO_CONTENT = `The HTTP ${HttpStatus.NO_CONTENT} No Content success status response code indicates that a request has succeeded, but that <b>the client doesn't need to navigate away from its current page</b>.`;
const DESC_RESP_BAD_REQUEST = `The HyperText Transfer Protocol (HTTP) ${HttpStatus.BAD_REQUEST} Bad Request response status code indicates that <b>the server cannot or will not process the request due to something that is perceived to be a client error</b> (for example, malformed request syntax, invalid request message framing, or deceptive request routing).`;
const DESC_RESP_UNAUTHORIZED = `The HyperText Transfer Protocol (HTTP) ${HttpStatus.UNAUTHORIZED} Unauthorized response status code indicates that <b>the client request has not been completed because it lacks valid authentication credentials for the requested resource</b>.`;
const DESC_RESP_FORBIDDEN = `The HTTP ${HttpStatus.FORBIDDEN} Forbidden response status code indicates that <b>the server understands the request but refuses to authorize it</b>.<br />This status is similar to 401, but for the 403 Forbidden status code re-authenticating makes no difference. The access is permanently forbidden and tied to the application logic, such as insufficient rights to a resource.`;
const DESC_RESP_NOT_FOUND = `A ${HttpStatus.NOT_FOUND} <b>not found error</b> is an HTTP status code that means that the page you wanted to access a website couldn't be found on their server.`;
const DESC_RESP_METHOD_NOT_ALLOWED = `The HyperText Transfer Protocol (HTTP) ${HttpStatus.METHOD_NOT_ALLOWED} Method Not Allowed response status code indicates that <b>the server knows the request method, but the target resource doesn't support this method</b>.`;
const DESC_RESP_UNPROCESSABLE_ENTITY = `The HyperText Transfer Protocol (HTTP) ${HttpStatus.UNPROCESSABLE_ENTITY} Unprocessable Entity response status code indicates that <b>the server understands the content type of the request entity, and the syntax of the request entity is correct, but it was unable to process the contained instructions</b>.`;
const DESC_INTERNAL_SERVER_ERROR = `The HTTP status code ${HttpStatus.INTERNAL_SERVER_ERROR} is a generic error response. It means that <b>the server encountered an unexpected condition that prevented it from fulfilling the request</b>.`;
const DESC_RESP_FAILED_DEPENDENCY = `The ${HttpStatus.FAILED_DEPENDENCY} <b>(Failed Dependency)</b> status code means that the method could not be performed on the resource because the requested action depended on another action and that action failed.`;

export {
  DESC_INTERNAL_SERVER_ERROR,
  DESC_RESP_ACCEPTED,
  DESC_RESP_BAD_REQUEST,
  DESC_RESP_CREATED,
  DESC_RESP_FAILED_DEPENDENCY,
  DESC_RESP_FORBIDDEN,
  DESC_RESP_METHOD_NOT_ALLOWED,
  DESC_RESP_NO_CONTENT,
  DESC_RESP_NOT_FOUND,
  DESC_RESP_OK,
  DESC_RESP_UNAUTHORIZED,
  DESC_RESP_UNPROCESSABLE_ENTITY,
};
