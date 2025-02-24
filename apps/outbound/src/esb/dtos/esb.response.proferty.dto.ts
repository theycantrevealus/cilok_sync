import { HttpStatus } from "@nestjs/common";
import { EsbOrderResponseBadRequest } from "./esb.order.response";
import {EsbGetBalanceResponseBadRequest} from "@/esb/dtos/esb.getbalance.response";

const ApiResponseEsb = {
  ORDERR400 : {
    status : HttpStatus.BAD_REQUEST,
    type : EsbOrderResponseBadRequest,
    description: `The HyperText Transfer Protocol (HTTP) 400 Bad Request response status code indicates that <b>the server cannot or will not process the request due to something that is perceived to be a client error</b> (for example, malformed request syntax, invalid request message framing, or deceptive request routing).`,
  },
  BALANCER400 : {
    status : HttpStatus.BAD_REQUEST,
    type : EsbGetBalanceResponseBadRequest,
    description: `The HyperText Transfer Protocol (HTTP) 400 Bad Request response status code indicates that <b>the server cannot or will not process the request due to something that is perceived to be a client error</b> (for example, malformed request syntax, invalid request message framing, or deceptive request routing).`,
  }
}

export { ApiResponseEsb };
