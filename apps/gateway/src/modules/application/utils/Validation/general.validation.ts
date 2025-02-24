/**
 * This function will find origin before border
 * @param origin mandatory
 * @example "redeem.redeem_success.eligibility_success.deduct_fail.deduct_success.outbound_fail.refund_success.notification_success";
 *
 * @param border mandatory|default = "refund"
 * @example "refund"
 */
function walkingCheckOriginBefore(origin: string, border = 'refund', num = 1) {
  try {
    const origin_split = origin.split('.');
    const index_border =
      origin_split.indexOf(`${border}_success`) > 0
        ? origin_split.indexOf(`${border}_success`)
        : origin_split.indexOf(`${border}_fail`);
    const value_check = origin_split[index_border - num];

    if (!value_check) {
      return null;
    }

    const before_border =
      value_check != `${border}_success` && value_check != `${border}_fail`
        ? value_check
        : walkingCheckOriginBefore(origin, border, num + 1);

    return before_border;
  } catch (error) {
    console.log('<-- fail :: walking_check_origin_before -->');
    console.log(error);
    console.log('<-- fail :: walking_check_origin_before -->');
    return null;
  }
}

export { walkingCheckOriginBefore };
