const repFile = {
	"2c495feb": {
		"expense": {
			"dat": "2022-01-31",
			"inf": "last of month"
		},
		"interval": {
			"months": 1,
			"originalDate": 31
		}
	},
	"64b5e2c0": {
		"expense": {
			"dat": "2022-01-01",
			"inf": "first of month"
		},
		"interval": {
			"months": 1,
			"originalDate": 1
		}
	},
	"947ac085": {
		"expense": {
			"dat": "2022-07-01",
			"inf": "weekly"
		},
		"interval": {
			"weeks": 1
		}
	}
};

/**
 * @typedef RepeatingIntervall
 * A repeating intervall may be either a count of `weeks` or a count of `months`.
 * @type {Object}
 * @property {Number} [weeks] Count of weeks between intervall points
 * @property {Number} [months] Count of months between interval points
 * @property {Number} [originalDate] Initial execution day of month (for preserving execution on last-of-month)
 * 
 * @typedef RepeatingExpense
 * Expense that repeats in defined intervals.
 * @type {Object}
 * @property {Expense} expense
 * @property {RepeatingIntervall} interval
 */

let repeatingExpenses = function ()
{
	const FILE_NAME = "rep.json";

	/**
	 * @type {Object<IdString, RepeatingExpense>}
	 */
	let data = {};

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
			interval.originalDate ||= 1;
			result = date.shiftMonths(interval.months);
			result.setDate(Math.min(interval.originalDate, result.endOfMonth().getDate()));
		}
		return result;
	}

	/**
	 * Processes all repeating expenses. Checks if a due date has passed (creates an actual expense, if so) and returns a list of all upcoming expenses.
	 * @param {Date} month
	 * @returns {Array<Expense>} List of all upcoming expenses; **note:** every expense has an additional `rep` member providing the repeating expense id.
	 */
	function process (month)
	{
		/** @type {Array<Expense>} */
		let result = [];
		/** @type {Date} */
		let now = new Date();
		/** @type {String} */
		let requestedMonth = month.toMonthString();
		/** @type {Date} */
		let endOfPreview = month.endOfMonth();
		console.debug("preview until:", endOfPreview.toIsoFormatText());
		for (let id in data)
		{
			/** @type {RepeatingExpense} */
			let item = data[id];
			let itemPreviewDate = nextIntervalDate(item.expense.dat, item.interval);
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
					item.expense.dat = itemPreviewDate;
					data[id] = item;
					console.debug("myx.expenses.add", Object.assign({ rep: id }, item.expense)); // TODO
				}
				itemPreviewDate = nextIntervalDate(itemPreviewDate, item.interval);
				if ((itemPreviewDate > now) && (itemPreviewDate.toMonthString() === requestedMonth))
				{
					result.push(Object.assign({ rep: id }, item.expense, { dat: itemPreviewDate }));
				}
			}
		}
		return result.sort((a, b) => (a.dat - b.dat));
	}

	/**
	 * Initializes the module by loading repeating expenses from file on Google Drive.
	 * @returns {Promise<void>}
	 */
	function init ()
	{
		return new Promise((resolve) =>
		{
			googleappApi.loadFileEx(FILE_NAME).then((obj) =>
			{
				data = obj || {};
				for (let id in data)
				{
					/** @type {Expense} */
					let expense = data[id].expense;
					expense.dat = new Date(expense.dat); // convert String to Date
				}
				resolve();
			});
		});
	}

	/**
	 * Saves changes to file.
	 * @async
	 */
	async function saveToFile ()
	{
		myx.xhrBegin();
		googleappApi.saveToFile(FILE_NAME, data).then(myx.xhrSuccess, myx.xhrError);
	}

	/**
	 * //TODO
	 * @param {Expense} expense Origin expense to set as repeating expense
	 * @param {IdString} [id] Id of already exisintg repeating expense
	 */
	function promptEditor (expense, id)
	{
		id ||= myx.newId();
		if (data[id] === undefined)
		{
			data[id] = { interval: { months: 1 } };
		}
		data[id].expense = expense;
		// TODO: Do shit & saveToFile();
	}

	return {
		get data () { return data; }, // TODO: debug only
		init: init,
		promptEditor: promptEditor,
		get: process,
		/**
		 * Returns the next due date of a repeating expense.
		 * @param {IdString} id Repeating expense id
		 * @returns {Date}
		 */
		nextDueDateOf: (id) => { return nextIntervalDate(data[id].expense.dat, data[id].interval); }
	};
};

// let r = repeatingExpenses();
// r.init().then(() => { console.log("Repeating expenses have loaded.", r.data); });
