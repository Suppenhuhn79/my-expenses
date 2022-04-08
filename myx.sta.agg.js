/**
 * Class representing an aggregation of expenses, basicly the `sum` of amount and `count` of items.
 */
class AggregateAtom
{
	/**
	 * @param {Number} [sum=0] Sum of expenses
	 * @param {Number} [count=0] Count of expenses
	 */
	constructor(sum = 0, count = 0)
	{
		this.sum = sum;
		this.count = count;
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
		return this;
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
		return (b.sum || 0) - (a.sum || 0);
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
		// TODO: implement compareByAvg()
		throw new Error("Not implemented yet.");
	}
}

/**
 * Object having a key for each master category with aggrefgates of all subcategories within.
 * @typedef MonthlyAggregates
 * @type {Object}
 * @property {AggregateAtom} catId
 */


/**
 * my-expenses expenses aggregation functionality for the "statistics" module.
 * @param {myxExpenses} expenses
 * @param {myxPaymentMethods} paymentMethods 
 * @param {myxCategories} categories 
 * @returns 
 */
const myxStatisticAggregator = function (expenses, categories, paymentMethods)
{
	/** @type {MonthlyAggregates} */
	let monthlyAggs = {};
	/** @type {Array<MonthString>} */
	let availibleYears = [];

	/**
	 * Sums up expenses into an object of aggregation atoms. To use in an `<array>.reduce()` only.
	 * @param {MonthlyAggregates} prev Summed up expenses so far
	 * @param {Expense} curr Current expense to add
	 * @returns {MonthlyAggregates} Object having category ids as members containing sum and count of this categories expenses
	 */
	function _addUpExpenses (prev, curr)
	{
		prev[curr.cat] ||= new AggregateAtom();
		if (paymentMethods.isExcluded(curr.pmt) === false)
		{
			prev[curr.cat].add(new AggregateAtom(curr.amt, 1));
		}
		return prev;
	}

	/**
	 * Sums up all expenses per category in the given month.
	 * @param {MonthString} month Month to aggregate expenses
	 * @returns {Promise<MonthlyAggregates>} Resolves aggregates
	 */
	function sumUpExpenses (month)
	{
		return new Promise((resolve) => 
		{
			let aggs = {};
			let catSums = {};
			expenses.data[month].reduce(_addUpExpenses, aggs);
			for (let masterCat of categories.masterCategoryIds)
			{
				catSums[masterCat] = Object.assign({ cats: {} }, new AggregateAtom());
				let masterTotal = new AggregateAtom();
				for (let subCat of [masterCat].concat(categories.getSubCategories(masterCat)))
				{
					catSums[masterCat].cats[subCat] = aggs[subCat] || new AggregateAtom();
					masterTotal.add(catSums[masterCat].cats[subCat]);
				}
				catSums[masterCat] = Object.assign(catSums[masterCat], masterTotal);
			}
			resolve(catSums);
		});
	}

	/**
	 * Sums up all the aggregates of given months.
	 * @param {MonthsString|Array<MonthString>} months Months to sum up
	 * @param {Function} [sortFunc=AggregateAtom.compareBySum] Compare function for AggregateAtom|s
	 * @returns {{total: AggregateAtom, cats: Array<AggregateAtom>}} Array of aggregates, including a category `id` and a `subCats` array of the master categories sub category aggregations
	 */
	function sumUpMonths (months, sortFunc = AggregateAtom.compareBySum)
	{
		if (typeof months === "string")
		{
			months = [months];
		}
		let total = new AggregateAtom();
		/** @type {Array<AggregateAtom>} */
		let catSums = [];
		for (let masterCat of categories.masterCategoryIds)
		{
			/** @type {AggregateAtom} */
			let catSum = Object.assign(new AggregateAtom(), { id: masterCat, subCats: [] });
			/** @type {MonthlyAggregates} */
			let subCatSums = {};
			for (let month of months)
			{
				for (let subCat of [masterCat].concat(categories.getSubCategories(masterCat)))
				{
					subCatSums[subCat] ||= Object.assign(new AggregateAtom(), { id: subCat });
					subCatSums[subCat].add(monthlyAggs[month][masterCat].cats[subCat]);
					catSum.add(monthlyAggs[month][masterCat].cats[subCat]);
				}
				catSum.subCats = Object.values(subCatSums).sort(sortFunc);
			}
			total.add(catSum);
			catSums.push(catSum);
		}
		return { total: total, cats: catSums.sort(sortFunc) };
	}

	/**
	 * Initializes the module. Calculates the aggregations for all categories by months for faster access is the later use.
	 * @async
	 */
	function init ()
	{
		let asyncCalcs = [];
		return new Promise((resolve) =>
		{
			for (let month of expenses.availibleMonths)
			{
				availibleYears.push(month.substring(0, 4));
				asyncCalcs.push(
					sumUpExpenses(month).then((catSums) => { monthlyAggs[month] = catSums; })
				);
			}
			availibleYears.removeDuplicates();
			Promise.allSettled(asyncCalcs).then(resolve);
		});
	}

	return { // public interface
		get data () { return monthlyAggs; }, // TODO: debug only
		get availibleMonths () { return expenses.availibleMonths; },
		get availibleYears () { return availibleYears; },
		init: init,
		calc: sumUpMonths
	};
};
