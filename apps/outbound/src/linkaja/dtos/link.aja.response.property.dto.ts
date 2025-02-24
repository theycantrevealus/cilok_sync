import {HttpStatus} from "@nestjs/common";
import { AdjustCustomerPointResponseModel } from "../models/adjust.customer.point.response.model";
import { LinkAjaResponseModel } from "../models/link.aja.response.model";

const ApiResponseLinkAja = {
  R200: {
    status: HttpStatus.OK,
    type: LinkAjaResponseModel,
    description: `The HTTP 201 Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`,
  },
  AdjustCustomerPointR200: {
    status: HttpStatus.OK,
    type: AdjustCustomerPointResponseModel,
    description: `The HTTP 201 Created success status response code indicates that <b>the request has succeeded and has led to the creation of a resource</b>.`,
  },
}

export {ApiResponseLinkAja};
