/**
 * @typedef AggregatesMap
 * Map of aggregates per category where the key is the categorys id.
 * @type {Map<IdString, AggregateAtom>}
 * 
 * @typedef AggregatesCompareProperty
 * Property to use for comparing category aggregates.
 * - "avg"
 * - "count"
 * - "mavg"
 * - "sum"
 * @type {"sum"|"avg"|"mavg"|"count"}
 * 
 * @typedef AggregationResult
 * @property {Map<MonthString, Array<CategoryAggregate>} months Monthly aggregates per category
 * @property {Array<CategoryAggregate>} total Sums per category for all months
 * @property {CategoryAggregate} meta Aggregate of all categories and all months
 */
