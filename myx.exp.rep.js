/**
 * @typedef RepeatingIntervall
 * A repeating interval; may be either a count of `weeks` or a count of `months`.
 * @type {Object}
 * @property {Number} [weeks] Count of weeks between interval points
 * @property {Number} [months] Count of months between interval points
 * @property {Number} [originalDate] Initial execution day of month (for preserving execution on last-of-month)
 * 
 * @typedef RepeatingExpense
 * Expense that repeats in defined intervals.
 * @type {Object}
 * @property {Expense} expense
 * @property {RepeatingIntervall} interval
 * @property {Date} nextDueDate
 */

/**
 * @namespace myxRepeatingExpenses
 * my-expenses repeating expenses functionality for the "expenses" module.
 */
let myxRepeatingExpenses = function ()
{
	const FILE_NAME = "rep.json";
	const DEFAULTS = {
		items: {},
		order: []
	};

	/** @type {Object<IdString, RepeatingExpense>} */
	let data = {};
	/** @type {Array<IdString>} */
	let order = [];

	/**
	* Loads _repeating expenses_ from cache or remote file (if modified).
	* @returns {Promise<void>}
	*/
	function fetchData ()
	{
		return new Promise((resolve) =>
		{
			if (googleappApi.isModified(FILE_NAME))
			{
				googleappApi.loadFileEx(FILE_NAME).then((obj = DEFAULTS) =>
				{
					data = obj.items;
					order = obj.order;
					for (let id in data)
					{
						/** @type {Expense} */
						let expense = data[id].expense;
						expense.dat = new Date(expense.dat); // convert String to Date
						data[id].nextDueDate = new Date(data[id].nextDueDate); // convert String to Date
					}
					resolve();
				});
			}
			else
			{
				resolve();
			}
		});
	}

	/**
	 * Saves changes to file.
	 * @async
	 */
	async function saveToFile ()
	{
		myx.xhrBegin();
		googleappApi.saveToFile(FILE_NAME, { order: order, items: data }).then(myx.xhrSuccess, myx.xhrError);
	}

	/**
	 * Calculates the next date in an interval.
	 * @param {Date} date Origin date to calculate next next interval date
	 * @param {RepeatingIntervall} interval
	 * @returns {Date} Next date in given interval
	 */
	function nextIntervalDate (date, interval)
	{
		/** @type {Date} */
		let result;
		if (interval.weeks > 0)
		{
			result = date.addDays(interval.weeks * 7);
		}
		else
		{
			interval.months ||= 1;
			interval.originalDate ||= date.getDate();
			result = date.shiftMonths(interval.months);
			result.setDate(Math.min(interval.originalDate, result.endOfMonth().getDate()));
		}
		return result;
	}

	/**
	 * Adds or modifies a repeating expense.
	 * @param {IdString} [id] Id of repeating expense; if ommited and an interval is given, an new repeating expense is added
	 * @param {Expense} expense Expense data
	 * @param {RepeatingIntervall} [interval] New repeating interval for the expense; if ommited, the repeating expense is deleted
	 * @returns {IdString|null} Id of the modified/added expense or `undefined` if repeating expense hab been deleted
	 */
	function modify (id, expense, interval)
	{
		console.log("repExps BEFORE modification:", order, Object.assign({}, data));
		console.group("setting repeating expense");
		console.log("id:", id);
		console.log("expense:", expense);
		console.log("interval:", interval);
		if (!!interval)
		{
			id ||= myx.newId();
			if (order.includes(id) === false)
			{
				order.push(id);
			}
			data[id] = {
				expense: {
					dat: expense.dat,
					amt: expense.amt,
					cat: expense.cat,
					pmt: expense.pmt,
					txt: expense.txt
				},
				interval: Object.assign({}, interval, { originalDate: expense.dat.getDate() }),
				nextDueDate: (expense.dat < new Date()) ? nextIntervalDate(expense.dat, interval) : expense.dat
			};
			console.log("data[id]:", data[id]);
		}
		else
		{
			if (!!data[id])
			{
				delete data[id];
				order.splice(order.indexOf(id), 1);
			}
			id = null;
		}
		console.groupEnd();
		console.log("repExps AFTER modification:", order, data);
		saveToFile();
		return id;
	}

	/**
	 * Adds an repeating expense as an actual expense.
	 * @param {RepeatingExpense} repeatingExpense Repeating expense to add as actual expense
	 * @param {Date} executionDate Actual execution date of expense to add
	 * @returns {RepeatingExpense} repeating expense with updated `nextDueDate`
	 */
	function addExpense (repeatingExpense, executionDate)
	{
		repeatingExpense.expense.dat = executionDate;
		repeatingExpense.nextDueDate = nextIntervalDate(executionDate, repeatingExpense.interval);
		console.warn("ADD:", executionDate.toIsoFormatText("YMD"), myx.categories.getLabel(repeatingExpense.expense.cat), repeatingExpense.expense.amt);
		return repeatingExpense;
	}

	/**
	 * Processes all repeating expenses. Checks if a due date has passed (creates an actual expense, if so) and returns a list of all upcoming expenses.
	 * @param {MonthString} month
	 * @returns {Array<Expense>} List of all upcoming expenses; **note:** every expense has an additional `rep` member providing the repeating expense id.
	 */
	function process (month)
	{
		/** @type {Array<Expense>} */
		let result = [];
		/** @type {Date} */
		let now = new Date();
		/** @type {Date} */
		let endOfPreview = (new Date(month)).endOfMonth();
		for (let id of order)
		{
			/** @type {RepeatingExpense} */
			let item = data[id];
			let itemPreviewDate = item.nextDueDate;
			let i = 0;
			while (itemPreviewDate <= endOfPreview)
			{
				if (i++ > 10)
				{
					console.error("inifinite loop detected");
					break;
				}
				if (itemPreviewDate < now)
				{
					data[id] = addExpense(item, itemPreviewDate);
				}
				else if ((itemPreviewDate > now) && (itemPreviewDate.toMonthString() === month))
				{
					result.push(Object.assign({ rep: id }, item.expense, { dat: itemPreviewDate }));
				}
				itemPreviewDate = nextIntervalDate(itemPreviewDate, item.interval);
			}
		}
		return result.sort((a, b) => (a.dat - b.dat));
	}

	/**
	 * //TODO
	 * @param {Expense} expense Origin expense to set as repeating expense
	 * @param {IdString} [id] Id of already exisintg repeating expense
	 */
	function promptEditor (expense, id)
	{
		console.warn("NOT IMPLEMENTED YET: promptEditor()");
		id ||= myx.newId();
		if (data[id] === undefined)
		{
			data[id] = { interval: { months: 1 } };
		}
		data[id].expense = expense;
		// TODO: Do shit & saveToFile();
	}

	/**
	 * Returns a super short interval text, which is basicly the interval count and an indicator whether its months or weeks.
	 * @param {RepeatingIntervall} interval Interval to get the text for
	 * @returns {String}
	 */
	function getSupershortIntervalText (interval)
	{
		return (interval.weeks > 0) ? interval.weeks.toString() + "/w" : interval.months.toString() + "/m";
	}

	return {
		get data () { return data; }, // TODO: debug only
		nextIntervalDate: nextIntervalDate, // TODO: debug only
		fetchData: fetchData,
		promptEditor: promptEditor,
		get: process,
		set: modify,
		/**
		 * Returns the interval of a repeating expense.
		 * @param {IdString} id Repeating expense id
		 * @returns {RepeatingIntervall} Interval of the repeating expense
		 */
		intervalOf: (id) => { return data[id]?.interval || {}; },
		getSupershortIntervalText: getSupershortIntervalText
	};
};
