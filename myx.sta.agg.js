/**
 * @typedef AggregateItem
 * @property {IdString} catId category id
 * @property {Array<AggregateItem>} [subs] sub-category aggregates
 * @property {Number} sum Sum of expenses
 * @property {Number} count Sount of expenses
 *
 * @typedef MonthAggregate
 * Object having a key for each master category with aggregates of all subcategories within.
 * @type {Object<IdString, AggregateAtom>}
 */

/**
 * Class representing an aggregation of expenses, basicly the `sum` of amount and `count` of items.
 */
class AggregateAtom
{
	static compareField = "sum";

	/**
	 * @param {Number} sum Sum of expenses, default `0`
	 * @param {Number} count Count of expenses, default `0`
	 * @param {Number} avg Average
	 */
	constructor(sum, count)
	{
		this.sum = sum || 0;
		this.count = count || 0;
		this._calcAvg();
	}

	/**
	 * Adds the sum and count of an other aggregate atom.
	 * @param {AggregateAtom} agg Aggregate atom to add
	 * @returns {AggregateAtom} Returns this aggregate atom
	 */
	add (agg)
	{
		this.sum += agg.sum;
		this.count += agg.count;
		this._calcAvg();
		return this;
	}

	/**
	 * Adds properties to the aggregate atom object.
	 * @param {Map<String, any>} map Map of properties to attach to the aggregate atom
	 * @returns {AggregateAtom} Current aggregate extendet with the objects properties
	 */
	extend (map)
	{
		for (let mem in map)
		{
			this[mem] = map[mem];
		}
		return this;
	}

	/**
	 * Calculates the agerage value (`avg`).
	 */
	_calcAvg ()
	{
		this.avg = (this.count > 0) ? this.sum / this.count : 0;
	}

	/**
	 * Compares two aggregate atoms by their sum. To use in an `<array>.sort()` context.
	 * @param {AggregateAtom} a First value to compare
	 * @param {AggregateAtom} b Second value to compare
	 * @returns {Number} Number to indicate whether `a` is to sort before, after or equal to `b`
	 * @static
	 */
	static compare (a, b)
	{
		const k = AggregateAtom.compareField;
		return b[k] - a[k];
	}

	/**
	 * Adds two aggregate atoms. To use in an `<array>.reduce()` context.
	 * @param {AggregateAtom} prev Previuos object
	 * @param {AggregateAtom} curr Current object to add to the previous one
	 * @returns {AggregateAtom} Result of the addition
	 * @static
	 */
	static reduce (prev, curr)
	{
		prev.sum += curr.sum;
		prev.count += curr.count;
		return prev;
	}
}

/**
 * @namespace myxStatisticAggregator
 * my-expenses expenses aggregation functionality for the "statistics" module.
 */
const myxStatisticAggregator = function ()
{
	/**
	 * Count of months selected for aggregation. Required for calculating monthly agerages.
	 * @type {Number}
	 */
	let _monthCount;
	/** @type {Object<MonthString, MonthAggregate>} */
	let _aggregates = {};

	/**
	 * //TODO: JsDoc
	 * Sums up expenses into an object of aggregation atoms. To use in an `<array>.reduce()` only.
	 * @param {MonthAggregate} prev Summed up expenses so far
	 * @param {Expense} curr Current expense to add
	 * @returns {AggregateAtom} Object having category ids as members containing sum and count of this categories expenses
	 */
	function _reduceExpenses (prev, curr)
	{
		prev[curr.cat] ||= new AggregateAtom();
		// TODO: implement filter
		{
			prev[curr.cat].add(new AggregateAtom(curr.amt, 1));
		}
		return prev;
	}

	/**
	 * Converts a {MonthlyAggregates}-Object to an {AggregateAtoms}-Array.
	 * @param {MonthAggregate} monthlyAggs Aggregates to convert to an array
	 * @param {Boolean} [sumupTotals] If `true` (by default), it sums up data into `totals`
	 * @returns {Array<AggregateAtom>} An array of aggregates
	 */
	function _aggregatesToArray (monthlyAggs, sumupTotals = true)
	{
		/** @type {Array<AggregateItem>} */
		let result = [];
		for (let masterCat of myx.categories.masterCategoryIds)
		{
			/**
			 * Total of all sub-catergories including master category.
			 * @type {AggregateAtom}
			 */
			let masterCatAggregate = (new AggregateAtom()).extend({ catId: masterCat, subs: [] });
			for (let subcatId of [masterCat].concat(myx.categories.getSubCategories(masterCat)))
			{
				/** 
				 * Not-null aggregate atom
				 * @type {AggregateAtom}
				 */
				let catAggregate = monthlyAggs[subcatId] || new AggregateAtom();
				masterCatAggregate.add(catAggregate);
				masterCatAggregate.subs.push(catAggregate.extend({ catId: subcatId, mavg: catAggregate.sum / _monthCount }));
				if (sumupTotals)
				{
					_aggregates.totals[subcatId] ||= new AggregateAtom();
					_aggregates.totals[subcatId].add(catAggregate);
				}
				masterCatAggregate.subs.sort(AggregateAtom.compare);
			}
			masterCatAggregate.extend({ mavg: masterCatAggregate.sum / _monthCount });
			result.push(Object.assign(masterCatAggregate));
		}
		return result;
	}

	/**
	 * Sums up all expenses per category in the given month.
	 * Target dataset is `_aggregates`.
	 * @async
	 * @param {MonthString} month Month to aggregate expenses
	 * @returns {Promise} Promise
	 */
	function _calcMonth (month)
	{
		return new Promise((resolve) => 
		{
			let aggregate = {};
			myx.expenses.data[month].reduce(_reduceExpenses, aggregate);
			_aggregates[month] = _aggregatesToArray(aggregate);
			resolve();
		});
	}

	/**
	 * 
	 * @async
	 * @param {Array<MonthString>} months Months to calculate
	 * @param {"sum"|"avg"} sortKey Whether to sort results by sum (default) or average
	 * @returns {Promise} Promise
	 */
	function calc (months, sortKey)
	{
		/** @type {Array<Promise>} */
		let asyncCalcs = [];
		_aggregates = {
			totals: {},
		};
		_monthCount = months.length;
		AggregateAtom.sortKey = sortKey;
		return new Promise((resolve) =>
		{
			for (let month of months)
			{
				asyncCalcs.push(_calcMonth(month));
			}
			Promise.allSettled(asyncCalcs).then(
				() =>
				{
					_aggregates.totals = _aggregatesToArray(_aggregates.totals, false);
					_aggregates.totals.sort(AggregateAtom.compare);
					Object.assign(_aggregates, _aggregates.totals.reduce(AggregateAtom.reduce, new AggregateAtom()));
					_aggregates.mavg = _aggregates.sum / _monthCount;
					resolve(_aggregates);
				}
			);
		});
	}

	return { // public interface
		get data () { return _aggregates; }, // TODO: debug only
		calc: calc
	};
};
