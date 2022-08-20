/**
 * @typedef RepeatingInterval
 * @type {Object}
 * @property {Number} [months]
 * @property {Number} [dayOfMonth]
 * @property {Number} [weeks]
 *
 * @typedef RepeatingExpense
 * @type {Object}
 * @property {IdString} id
 * @property {Expense} expense
 * @property {RepeatingInterval} interval
 */

/**
 * A repeating interval; may be either a count of `weeks` or a count of `months`.
 * @constructor
 * @param {RepeatingInterval} [src] Repeating interval to copy. If ommitted, the interval is set to "every month"
 * @returns {RepeatingInterval} New repeating interval object
 */
function RepeatingInterval (src)
{
	/**
	 * Count of months between interval points
	 * @type {Number}
	 */
	this.months = (src?.months > 0) ? src.months : undefined;

	/**
	* Day of month for a monthly interval to trigger (for preserving execution on last-of-month)
	* @type {Number}
	*/
	this.dayOfMonth = (src?.months > 0) ? src?.originalDate || src?.originalDay || src?.dayOfMonth || 1 : undefined; // TODO: remove deprecated property names

	/**
	 * Count of weeks between interval points
	 * @type {Number}
	 */
	this.weeks = src?.weeks || undefined;

	/**
	 * Checks if this interval is valid. Valid intervals do have eithter _months_ or _weeks_ set to a positive integer.
	 * @returns {Boolean} Whether this is a valid interval or not
	 */
	this.isValid = function ()
	{
		return (((this.months > 0) && (this.dayOfMonth > 0)) || (this.weeks > 0));
	};

	/**
	 * Sets the count of months for this interval. Weeks will be set to `undefined`.
	 * @param {Number} count Count of months between interval points
	 * @param {Number} dayOfMonth Day of months on that the expense is executed
	 * @returns {RepeatingInterval} This interval
	 */
	this.setMonths = function (count, dayOfMonth)
	{
		this.clear();
		this.months = count;
		this.dayOfMonth = dayOfMonth || this.dayOfMonth || 1;
		return this;
	};

	/**
	 * Sets the count of weeks for this interval. Months will be set to `undefined`.
	 * @param {Number} count Count of weeks between interval points
	 * @returns {RepeatingInterval} This interval
	 */
	this.setWeeks = function (count)
	{
		this.clear();
		this.weeks = count;
		return this;
	};

	/**
	 * Clears the interval (months and weeks are set to `undefined`).
	 * @returns {RepeatingInterval} This interval
	 */
	this.clear = function ()
	{
		this.weeks = undefined;
		this.months = undefined;
		this.dayOfMonth = undefined;
		return this;
	};

	/**
	 * Gives a super short text hat describes this interval.
	 * @returns {String} Super short interval text
	 */
	this.getSupershortText = function ()
	{
		return (this.weeks > 0) ? this.weeks.toString() + "w" : this.months.toString() + "m";
	};
};

/**
 * Expense that repeats in defined intervals.
 * @constructor
 * @param {IdString} [id]
 * @param {Expense} [expense]
 * @param {RepeatingInterval} [interval]
 */
function RepeatingExpense (id, expense, interval)
{
	/** @type {IdString} */
	this.id = id || myx.newId();
	/** @type {Expense} */
	this.expense = new Expense(expense, { rep: this.id });
	/** @type {RepeatingInterval} */
	this.interval = new RepeatingInterval(interval);

	/**
	 * Calculates the next execution date for this repeating expense.
	 * @returns {Date} Next date in interval
	 */
	this.nextDate = function (date = this.expense.dat)
	{
		/** @type {Date} */
		let result;
		if (this.interval.isValid())
		{
			if (this.interval.weeks > 0)
			{
				result = date.addDays(this.interval.weeks * 7);
			}
			else
			{
				result = date.shiftMonths(this.interval.months);
				result.setDate(Math.min(this.interval.dayOfMonth, result.endOfMonth().getDate()));
			}
		}
		else
		{
			console.warn("No valid interval for", this);
			result = new Date(2999, 1, 1);
		}
		return result;
	};
};

/**
 * @namespace myxRepeatingExpenses
 * my-expenses repeating expenses functionality for the "expenses" module.
 */
function myxRepeatingExpenses ()
{
	const FILE_NAME = "rep.json";
	const DEFAULTS = {
		items: {},
		order: []
	};
	/** @type {Map<IdString, RepeatingExpense>} */
	let data = new Map();
	/** @type {Array<IdString>} */
	let order = [];

	/**
	* Loads _repeating expenses_ from cache or remote file (if modified).
	 * @async
	 * @returns {Promise<void>} Promise
	 */
	function fetchData ()
	{
		return new Promise((resolve) => 
		{
			myx.loadFile(FILE_NAME, DEFAULTS, (obj) =>
			{
				order = obj.order;
				for (let key of Object.keys(obj.items))
				{
					data.set(key, new RepeatingExpense(key, obj.items[key].expense, obj.items[key].interval));
				}
			}).then(resolve);
		});
	}

	/**
	 * Saves changes to file.
	 * @async
	 */
	async function saveToFile ()
	{
		myx.xhrBegin();
		googleAppApi.saveToFile(FILE_NAME, { order: order, items: Object.fromEntries(data) }).then(myx.xhrSuccess, myx.xhrError);
	}

	/**
	 * Adds or modifies a repeating expense.
	 * @param {IdString} [id] Id of repeating expense; if ommited and an interval is given, an new repeating expense is added
	 * @param {Expense} expense Expense data
	 * @param {RepeatingInterval} [interval] New repeating interval for the expense; if ommited, the repeating expense is deleted
	 * @param {Boolean} [autosave] Whether to save repeating expenses to file, or not. Default `true`, set to `false` when performing bulk operations
	 * @returns {IdString} Id of the modified/added expense; empty string if repeating expense has been deleted or does not exist
	 */
	function modify (id, expense, interval, autosave = true)
	{
		// console.log("repExps BEFORE modification:", order, Object.assign({}, data));
		// console.group("setting repeating expense");
		// console.log("id:", id);
		// console.log("expense:", expense);
		// console.log("interval:", interval);
		if (interval?.isValid())
		{
			id ||= myx.newId();
			if (order.includes(id) === false)
			{
				order.push(id);
			}
			// TODO: How to modify interval.originalDay? Not here, I guess, but in promptEditor??
			data.set(id, new RepeatingExpense(id, expense, interval));
			console.log("data[id]:", data.get(id));
		}
		else
		{
			if (data.delete(id))
			{
				order.splice(order.indexOf(id), 1);
			}
			id = "";
		}
		if (autosave)
		{
			saveToFile();
		}
		// console.groupEnd();
		// console.log("repExps AFTER modification:", order, data);
		return id;
	}

	/**
	 * Processes all repeating expenses. Checks if a due date has passed (creates an actual expense, if so) and returns a list of all upcoming expenses.
	 * @param {MonthString} month
	 * @returns {Array<Expense>} List of all upcoming expenses; **note:** every expense has an additional `rep` member providing the repeating expense id.
	 */
	function process (month)
	{
		// return [];
		/** @type {Array<Expense>} */
		let result = [];
		/** @type {Date} */
		let now = new Date();
		/** @type {Date} */
		let endOfPreview = (new Date(month)).endOfMonth();
		/** @type {Array<Expense>} */
		let triggeredExpenses = [];
		for (let id of order)
		{
			/** @type {RepeatingExpense} */
			let item = data.get(id);
			let itemPreviewDate = item.nextDate();
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
					console.warn("ADD:", id, itemPreviewDate.toIsoDate(), myx.categories.getLabel(item.expense.cat), item.expense.amt);
					item.expense.dat = itemPreviewDate;
					triggeredExpenses.push(item.expense);
					data.set(id, item);
				}
				else if ((itemPreviewDate > now) && (itemPreviewDate.toMonthString() === month))
				{
					result.push(new Expense(item.expense, { rep: id, dat: itemPreviewDate }));
				}
				itemPreviewDate = item.nextDate(itemPreviewDate);
			}
		}
		console.log("triggered expenses:", triggeredExpenses);
		if (triggeredExpenses.length > 0)
		{
			myx.expenses.add(triggeredExpenses);
			saveToFile();
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
		// TODO: implement an editor
		console.warn("NOT IMPLEMENTED YET: promptEditor()");
		/*
		id ||= myx.newId();
		if (data.has(id) === false)
		{
			data.set(id, expense, null);
		}
		data.get(id).expense = expense;
		*/
	}

	return {
		get data () { return data; }, // debug_only
		// get: (id) => { return data.get(id); }, // debug_only
		saveToFile: saveToFile, // debug_only
		fetchData: fetchData,
		promptEditor: promptEditor,
		process: process,
		set: modify,
		/**
		 * Returns the interval of a repeating expense.
		 * @param {IdString} id Repeating expense id
		 * @returns {RepeatingInterval} Interval of the repeating expense
		 */
		intervalOf: (id) => { return data.get(id)?.interval || new RepeatingInterval(); },
		lastExecutionDateOf: (id) => { return data.get(id)?.expense.dat; }
	};
};
