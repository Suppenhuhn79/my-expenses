/**
 * Aggregation of expenses, basicly the `sum` of amount and `count` of items.
 */
class AggregateAtom
{
	/**
	 * @param {Number} [sum] Sum of expenses, default `0`
	 * @param {Number} [count] Count of expenses, default `0`
	 */
	constructor(sum, count)
	{
		/**
		 * Sum of all items added to this aggregate atom.
		 * @type {Number} */
		this.sum = sum || 0;

		/**
		 * Count of all items added to this aggregate atom.
		 * @type {Number} */
		this.count = count || 0;
	}

	/**
	 * Average value of all items added to this aggregate atom.
	 * @type {Number}
	 */
	get avg ()
	{
		return (this.count > 0) ? this.sum / this.count : 0;
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
		return this;
	}
}

/**
 * Aggregate atom that has information about what category it is and how many months are in it.
 */
class CategoryAggregate extends AggregateAtom
{
	/**
	 * Property to use for comparing category aggregates.
	 * @type {AggregatesCompareProperty} */
	static compareKey = "sum";

	/**
	 * Compares two aggregate atoms by the property that is defined in `CategoryAggregate.compareKey`.
	 * 
	 * To use in an `<array>.sort()` context.
	 * 
	 * @static
	 * @param {CategoryAggregate} a First value to compare
	 * @param {CategoryAggregate} b Second value to compare
	 * @returns {Number} Number to indicate whether `a` is to sort before, after or equal to `b`
	 */
	static compare (a, b)
	{
		const k = CategoryAggregate.compareKey;
		return b[k] - a[k];
	}

	/**
	 * Adds two category aggregates.
	 * 
	 * To use in an `<array>.reduce()` context.
	 * 
	 * @static
	 * @param {CategoryAggregate} prev Previuos object
	 * @param {CategoryAggregate} curr Current object to add to the previous one
	 * @returns {CategoryAggregate} Result of the addition
	 */
	static reduce (prev, curr)
	{
		prev.sum += curr.sum;
		prev.count += curr.count;
		return prev;
	}

	/**
	 * @param {String} catId Category id of which category this aggregate is
	 * @param {Number} monthCount Count of months of this aggregate
	 * @param {AggregateAtom} [agg] Aggregate atom to get initial values
	 */
	constructor(catId, monthCount, agg)
	{
		super(agg?.sum, agg?.count);

		/**
		 * Category id.
		 * @type {IdString} */
		this.catId = catId;

		/**
		 * Count of months aggregated in this.
		 * @type {Number} */
		this.monthCount = monthCount;

		/**
		 * Aggregates of sub-categories, if this is a master category.
		 * @type {Array<CategoryAggregate>?} */
		this.subs = [];
	}

	/**
	 * Average sum per month.
	 * @type {Number}
	 */
	get mavg ()
	{
		return this.sum / this.monthCount;
	}
}

/**
 * my-expenses expenses aggregation functionality for the "statistics" module.
 * @namespace
 */
function myxStatisticAggregator ()
{
	/**
	 * Filter to exclude categories or payment methods.
	 * @type {ExpensesFilter} */
	let _filter;

	/**
	 * Count of months to aggregate; used to calculate monthly averages.
	 * @type {Number}
	 */
	let _monthsCount;

	/**
	 * Map of category aggregates for each month.
	 * @type {Map<MonthString, Array<CategoryAggregate>>} */
	let categoriesPerMonth = new Map();

	/**
	 * Map of totals (for all months) per category.
	 * @type {Map<IdString, AggregateAtom>} */
	let totalsPerCategory = new Map();

	/**
	 * Sums up expenses into a map of aggregation atoms per category.
	 * 
	 * To use in an `<array>.reduce()` only.
	 * 
	 * @param {AggregatesMap} prev Summed up expenses so far
	 * @param {Expense} curr Current expense to add
	 * @returns {AggregatesMap} Record with aggregated expenses per caetgory
	 */
	function reduceExpenses (prev, curr)
	{
		if (prev.has(curr.cat) === false)
		{
			prev.set(curr.cat, new AggregateAtom());
		}
		// TODO: implement filter
		if (_filter.pmts.has(curr.pmt) === false)
		{
			prev.get(curr.cat).add(new AggregateAtom(curr.amt, 1));
		}
		return prev;
	}

	/**
	 * Converts an `AggregatesMap` object to a `CategoryAggregate` array.
	 * @param {AggregatesMap} categoriesAggregates Aggregates to convert to an array
	 * @param {Boolean} sumupTotals If `true`, it also sums up data into `totalsPerCategory`
	 * @returns {Array<CategoryAggregate>} An array of aggregates
	 */
	function aggregatesToSortedArray (categoriesAggregates, sumupTotals)
	{
		/** @type {Array<CategoryAggregate>} */
		let result = [];
		for (let masterCat of myx.categories.masters)
		{
			/**
			 * Total of all sub-catergories including master category. */
			let masterCatAggregate = new CategoryAggregate(masterCat.id, _monthsCount);
			for (let catId of [masterCat.id].concat(masterCat.subCategoriesIds))
			{
				/** 
				 * Not-null aggregate
				 * @type {CategoryAggregate} */
				let catAggregate = new CategoryAggregate(catId, _monthsCount, categoriesAggregates.get(catId));
				masterCatAggregate.add(catAggregate);
				masterCatAggregate.subs.push(catAggregate);
				if (sumupTotals)
				{
					if (totalsPerCategory.has(catId) === false)
					{
						totalsPerCategory.set(catId, new CategoryAggregate(catId, _monthsCount));
					}
					totalsPerCategory.get(catId).add(catAggregate);
				}
				masterCatAggregate.subs.sort(CategoryAggregate.compare);
			}
			result.push(masterCatAggregate);
		}
		return result.sort(CategoryAggregate.compare);
	}

	/**
	 * Sums up all expenses per category in the given month.
	 * 
	 * Puts the calculation result as an array of `CategoryAggreagte` into `categoriesPerMonth` for this month.
	 * 
	 * @async
	 * @param {MonthString} month Month to aggregate expenses
	 * @returns {Promise} Promise
	 */
	function calcMonth (month)
	{
		return new Promise((resolve) =>
		{
			/** @type {AggregatesMap} */
			let catAggregates = new Map();
			myx.expenses.data[month].reduce(reduceExpenses, catAggregates);
			categoriesPerMonth.set(month, aggregatesToSortedArray(catAggregates, true));
			resolve();
		});
	}

	/**
	 * Calculates aggregations for all expenses of the given months.
	 * 
	 * Returns an `AggregationResult` object with all data sorted by the given sort key.
	 * 
	 * @async
	 * @param {ExpensesFilter} filter Filter to exclude payment methods or categories
	 * @param {Array<MonthString>} months Months to calculate
	 * @param {AggregatesCompareProperty} sortKey Whether to sort results by sum (default) or average
	 * @returns {Promise<AggregationResult>} Promise
	 */
	function calc (filter, months, sortKey)
	{
		/** @type {Array<Promise>} */
		let asyncCalcs = [];
		categoriesPerMonth.clear();
		totalsPerCategory.clear();
		_filter = filter;
		_monthsCount = months.length;
		CategoryAggregate.compareKey = sortKey;
		return new Promise((resolve) =>
		{
			for (let month of months)
			{
				asyncCalcs.push(calcMonth(month));
			}
			Promise.allSettled(asyncCalcs).then(() =>
			{
				let totals = aggregatesToSortedArray(totalsPerCategory, true);
				let sum = totals.reduce(CategoryAggregate.reduce, new CategoryAggregate("", _monthsCount));
				resolve({
					months: categoriesPerMonth,
					total: totals,
					meta: sum
				});
			}
			);
		});
	}

	return { // public interface
		get data () { return categoriesPerMonth; }, // debug_only
		get categoriesPerMonthata () { return categoriesPerMonth; }, // debug_only
		get totalsPerCategory () { return totalsPerCategory; },  // debug_only
		aggregatesToSortedArray: aggregatesToSortedArray, // debug_only
		calc: calc
	};
};
