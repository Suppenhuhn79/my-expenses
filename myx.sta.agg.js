/**
 * Class representing an aggregation of expenses, basicly the `sum` of amount and `count` of items.
 */
class AggregateAtom
{
	/**
	 * @param {Number} [sum] Sum of expenses, default `0`
	 * @param {Number} [count] Count of expenses, default `0`
	 */
	constructor(sum, count)
	{
		this.sum = sum || 0;
		this.count = count || 0;
		this._calcAvg();
	}

	/**
	 * Adds the sum and count of antore aggregate atom.
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
	static compareBySum (a, b)
	{
		return b.sum - a.sum;
	}

	/**
	 * Compares two aggregate atoms by their average value. To use in an `<array>.sort()` context.
	 * @param {AggregateAtom} a First value to compare
	 * @param {AggregateAtom} b Second value to compare
	 * @returns {Number} Number to indicate whether `a` is to sort before, after or equal to `b`
	 * @static
	 */
	static compareByAvg (a, b)
	{
		return b.avg - a.avg;
	}
}

/**
 * @typedef AggregateItem
 * @property {String} catId category id
 * @property {Array<AggregateItem>} [subs] sub-category aggregates
 * @property {Number} sum Sum of expenses
 * @property {Number} count Sount of expenses
 */

/**
 * @typedef MonthAggregate
 * Object having a key for each master category with aggregates of all subcategories within.
 * @type {Object<String, AggregateAtom>}
 */

/**
 * my-expenses expenses aggregation functionality for the "statistics" module.
 */
const myxStatisticAggregator = function ()
{
	/** @type {Object<MonthString, Object>} */
	let data = {};
	/** @type {MonthAggregate} */
	let _aggregates = {};

	/**
	 * Sums up expenses into an object of aggregation atoms. To use in an `<array>.reduce()` only.
	 * @param {MonthAggregate} prev Summed up expenses so far
	 * @param {Expense} curr Current expense to add
	 * @returns {MonthAggregate} Object having category ids as members containing sum and count of this categories expenses
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

	function _reduceAggregateAtoms (prev, curr)
	{
		prev.sum += curr.sum;
		prev.count += curr.count;
		return prev;
	}

	/**
	 * Sums up all expenses per category in the given month.
	 * Target dataset is `_aggregates`.
	 * @param {MonthString} month Month to aggregate expenses
	 * @returns {Promise} Resolves with no data
	 */
	function _calcMonth (month)
	{
		return new Promise((resolve) => 
		{
			_aggregates[month] = {};
			myx.expenses.data[month].reduce(_reduceExpenses, _aggregates[month]);
			data[month] = _aggregatesToArray(_aggregates[month]);
			resolve();
		});
	}

	/**
	 * Converts a {MonthlyAggregates}-Object to an {AggregateAtoms}-Array.
	 * @param {MonthAggregate} monthlyAggs Aggregated to convert to an array
	 * @param {Boolean} [sumupTotals] If `true` (by default), it sums up data into `totals`
	 * @returns {Array<AggregateAtom>} An array of aggregates
	 */
	function _aggregatesToArray (monthlyAggs, sumupTotals = true, sortKey = null)
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
				_aggregates.totals[subcatId] ||= new AggregateAtom();
				masterCatAggregate.add(catAggregate);
				masterCatAggregate.subs.push(catAggregate.extend({ catId: subcatId }));
				if (sumupTotals)
				{
					_aggregates.totals[subcatId].add(catAggregate);
				}
				if (["sum", "avg"].includes(sortKey))
				{
					masterCatAggregate.subs.sort((sortKey === "avg") ? AggregateAtom.compareBySum : AggregateAtom.compareByAvg);
				}
			}
			result.push(Object.assign(masterCatAggregate));
		}
		return result;
	}

	function calc (months, sortKey)
	{
		/** @type {Array<Promise>} */
		let asyncCalcs = [];
		_aggregates = { totals: {} };
		return new Promise((resolve) =>
		{
			for (let month of months)
			{
				asyncCalcs.push(_calcMonth(month));
			}
			Promise.allSettled(asyncCalcs).then(
				() =>
				{
					data.totals = _aggregatesToArray(_aggregates.totals, false, sortKey);
					if (["sum", "avg"].includes(sortKey))
					{
						data.totals.sort((sortKey === "avg") ? AggregateAtom.compareByAvg : AggregateAtom.compareBySum);
					}
					Object.assign(data, data.totals.reduce(_reduceAggregateAtoms, new AggregateAtom()));
					resolve(data);
				}
			);
		});

	}

	return { // public interface
		get data () { return data; }, // TODO: debug only
		calc: calc
	};
};
