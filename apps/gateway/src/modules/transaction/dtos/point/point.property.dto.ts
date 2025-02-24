const ApiOperationPoint = {
  inject: {
    summary: 'Inject Point',
    description:
      'This API used to inject point to subscriber based on defined keyword. ',
  },
  deduct: {
    summary: 'Deduct Point',
    description:
      'This API used to deduct point to subscriber based on defined keyword. ',
  },
  refund: {
    summary: 'Refund Point',
    description:
      'This API used to refund point to subscriber based on defined keyword. ',
  },
  view_current_balance: {
    summary: 'View Current Balance',
    description: 'This API used to get current point balance per subscriber.',
  },
  view_point_history: {
    summary: 'View Point History',
    description: 'This API used to get point history',
  },
};

export { ApiOperationPoint };
