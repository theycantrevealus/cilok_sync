import {HttpStatus} from "@nestjs/common";
import {LinkAjaResponseModel} from "@/linkaja/models/link.aja.response.model";
import {AdjustCustomerPointResponseModel} from "@/linkaja/models/adjust.customer.point.response.model";

const CrmbResponsePropertyDto = {
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

export {CrmbResponsePropertyDto};
