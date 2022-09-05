/**
 * @typedef AggregateItem
 * @property {IdString} catId category id
 * @property {Array<AggregateItem>} [subs] sub-category aggregates
 * @property {Number} sum Sum of expenses
 * @property {Number} count Sount of expenses
 *
 * @typedef MonthAggregate
 * Record having a key for each master category with aggregates of all subcategories within.
 * @type {Record<IdString, AggregateAtom>}
 */
