/** 
 * @typedef ExpensesFilter
 * Defines filter for listing expenses.
 * @type {Object}
 * @property {IdString} [pmt] Payment method id
 * @property {IdString} [cat] Category id (if sole)
 * @property {Array<IdString>} [cats] Category ids (if many)
 * @property {Array<MonthString>} [months] Months; set to all availibe months if omitted
 */
