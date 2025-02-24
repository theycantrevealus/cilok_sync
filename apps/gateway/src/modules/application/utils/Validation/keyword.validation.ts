/**
 * This function will validation keyword rule
 * @param payload mandatory
 * @param total_point optional
 */
function validationKeywordPointValueRule(
  payload: any,
  total_point: number = null,
) {
  const eligibility = payload?.keyword?.eligibility;
  let result = 0;
  
  if (eligibility) {
    let poin_changed = payload?.poin_changed ?? eligibility.poin_redeemed;
    
    if (total_point) {
      result = total_point;
    } else if (payload?.incoming?.total_redeem) {
      result = payload?.incoming?.total_redeem;
    }

    if (eligibility.poin_value === 'Fixed') {
      result = poin_changed;
    } else if (eligibility.poin_value === 'Flexible') {
      if (result <= 0) {
        result = poin_changed;
      }
    } else if (eligibility.poin_value === 'Fixed Multiple') {
      result = poin_changed;
      
      // Take out condition cause case multibonus/fixed-multiple : 2024-08-01
      // if (result > 0) {
        // result = poin_changed;
      // }
    }
  }

  return result;
}

export { validationKeywordPointValueRule };
