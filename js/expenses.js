/**
 * An expense.
 */
class Expense
{
	/**
	 * Order of keys for conversion from/to csv.
	 * @type {Array<string>}
	 */
	static KEY_ORDER = ["dat", "amt", "cat", "txt", "pmt", "rep"];

	/**
	 * @param {Expense|string} [src] Csv string to parse or expense to copy.
	 * @param {Object} [override] Optional values to override default/source value.
	 */
	constructor(src, override)
	{
		/**
		 * Expense date.
		 * @type {Date} */
		this.dat = new Date();

		/**
		 * Expense amount.
		 * @type {number} */
		this.amt = 0;

		/**
		 * Expense category - id reference to categories.
		 * @type {IdString} */
		this.cat = "";

		/**
		 * Additional descriptive text.
		 * @type {string} */
		this.txt = "";

		/**
		 * Used payment method - id reference to payment methods.
		 * @type {IdString} */
		this.pmt = "";

		/**
		 * Repeating expense - id reference to repeating expenses.
		 * @type {IdString} */
		this.rep = "";

		switch (typeof src)
		{
			case "string":
				let vals = src.split("\t");
				for (let c = 0, cc = Expense.KEY_ORDER.length; c < cc; c += 1)
				{
					this[Expense.KEY_ORDER[c]] = (c === 0) ? new Date(vals[c]) : ((c === 1) ? Number(vals[c]) : vals[c] || "");
				}
				break;
			case "object":
				if (typeof override === "object")
				{
					src = Object.assign({}, src, override);
				}
				for (let key of Expense.KEY_ORDER)
				{
					switch (key)
					{
						case "dat":
							this.dat = new Date(src.dat || Date.now());
							break;
						case "amt":
							this.amt = Number(src.amt) || 0;
							break;
						case "pmt":
							this.pmt = src.pmt || myx.paymentMethods.default;
							break;
						default:
							this[key] = src[key] || "";
					}
				}
				break;
		}
	};

	/**
	 * Compares two expenses if they are equal (date, amount, category, etc.)
	 * @param {Expense} otherExpense Second expense to compare.
	 * @returns {boolean} `true` if both expenses are equal, otherwise `false`.
	 */
	equals (otherExpense)
	{
		let result = true;
		for (let key of Expense.KEY_ORDER)
		{
			result &&= (this[key].valueOf() === otherExpense[key].valueOf());
		}
		return result;
	};

	/**
	 * Returns a serializable object of this expense.
	 * @returns {Object} Serializable object.
	 */
	toJSON ()
	{
		let json = {
			dat: this.dat.toIsoDate(),
			amt: this.amt,
			cat: this.cat,
			pmt: this.pmt
		};
		for (let nullableProp of ["txt", "rep"])
		{
			if (!!this[nullableProp])
			{
				json[nullableProp] = this[nullableProp];
			}
		}
		return json;
	};

	/**
	 * Gives a CSV line for the expense.
	 * @returns {string} CSV string.
	 */
	toString ()
	{
		return [this.dat.format("yyyy-mm-dd"), this.amt, this.cat, this.txt, this.pmt, this.rep].join("\t");
	};
}

/*
 * Categories and payment methotds to exclude, and months to include in expenses selection or aggregation.
 */
class ExpensesFilter
{
	static DEFAULT_NAME = "New expenses filter";

	/**
	 * Returns an unordered set of all categories ids.
	 * @returns {Set<IdString>} All categoies ids.
	 */
	static get allCategories ()
	{
		return new Set(myx.categories.data.keys());
	}

	/**
	 * Returns an unordered set of all (active and disabled) payment methods ids.
	 * @returns {Set<IdString>} All payment methods ids.
	 */
	static get allPaymentMethods ()
	{
		return new Set(myx.paymentMethods.data.keys());
	}

	constructor()
	{
		/**
		 * This filters name.
		 * @type {string} */
		this.name = ExpensesFilter.DEFAULT_NAME;

		/**
		 * Ids of categories to be excluded.
		 * @type {Set<IdString>} */
		this.cats = new Set();

		/**
		 * Ids of payment methods to be excluded.
		 * @type {Set<IdString>} */
		this.pmts = new Set();
	}

	/**
	 * Sets categories to be excluded.
	 * @param {Iterable<IdString>} categories Category ids to add to filter to be excluded.
	 * @returns {ExpensesFilter} This filter.
	 */
	excludeCategories (categories)
	{
		this.cats = new Set(categories);
		return this;
	}

	/**
	 * Sets payment methods to be excluded.
	 * @param {Iterable<IdString>} paymentMethods Payment method ids to add to filter to be excluded.
	 * @returns {ExpensesFilter} This filter.
	 */
	excludePaymentMethods (paymentMethods)
	{
		this.pmts = new Set(paymentMethods);
		return this;
	}

	/**
	 * Imports categories and payment methods from an object.
	 * @param {{name: string?, cats: Iterable<IdString>?, pmts: Iterable<IdString>?}} obj Object to be imported.
	 * @returns {ExpensesFilter} This filter.
	 */
	from (obj)
	{
		this.name = obj.name || ExpensesFilter.DEFAULT_NAME;
		this.cats = new Set(obj.cats) || [];
		this.pmts = new Set(obj.pmts) || [];
		return this;
	}

	/**
	 * Returns a serializable object of this expense.
	 * @returns {Object} Serializable object.
	 */
	toJSON ()
	{
		return {
			name: this.name,
			cats: Array.from(this.cats),
			pmts: Array.from(this.pmts)
		};
	}
}

const ExpensesTabMode = {
	DEFAULT: "default",
	SEARCH: "search",
	MULTISELECT: "multiselect"
};

/**
 * my-expenses "expenses" module.
 */
function myxExpenses ()
{
	const MODULE_NAME = "expenses-tab";
	/** Time in milliseconds of mousedown hold to switch to "multiselect" mode. */
	const LONG_MOUSEDOWN_TIMEOUT_MS = 750;
	/** Key in `data` where the preview expenses are stored temporary. */
	const PREVIEW = "preview";
	/** @type {Record<MonthString, Array<Expense>>} */
	let data = {};
	let dataIndex = myxExpensesDataindex();
	/** @type {ExpensesFilter} */
	let filter = {};
	let elements = document.getElementById(MODULE_NAME).getNamedChildren();
	let tabMode = new TabModeHandler(elements.get());
	/** @type {expenseEditor} */
	let editor;
	/** @type {Date} */
	let selectedMonth = new Date();
	/**
	 * Tab mode that was active before multiselect.
	 * @type {string} */
	let preMultiselectTabMode;
	/**
	 * Id of the long-mousedown timeout.
	 * @type {number} */
	let longMousedownTimeoutId;
	/**
	 * For ignoring mouseup on long-mousedown.
	 * @type {boolean} */
	let ignoreMouseup = false;

	elements.get("back-search-button").onclick = onSearchButtonClick = () => { choices.set("active-tab", filter._origin); };
	elements.get("cancel-search-button").onclick = resetFilter;
	elements.get("cancel-multiselect-button").onclick = exitMultiselectMode;
	elements.get("add-expense-button").onclick = onAddExpenseClick;
	elements.get("nav-current").onclick = onNavCurrentClick;
	elements.get("edit-multiselect-button").onclick = onMultiselectEditButtonClick = (event) =>
	{
		let selecteCount = elements.get("content").querySelectorAll(".multiselect-chosen").length;
		let multiselectMenubox = myxMenuboxes.get("exp-multiselect-edits", onMultiselectMenuboxClick);
		multiselectMenubox.setTitle("Edit " + selecteCount + " expenses");
		multiselectMenubox.popup(event, null, event.target, "below bottom, end right");
	};

	/**
	 * Initializes the module.
	 * @async
	 * @returns {Promise<void>} Void promise.
	 */
	function init ()
	{
		return new Promise((resolve) =>
		{
			Promise.allSettled([
				pageSnippets.import("js/expenseeditor.xml")
			]).then(() =>
			{
				editor = expenseEditor();
				myx.exEditor = editor; // debug_only
				resolve();
			});
		});
	};

	/**
	 * Loads _expenses_ and _repeating expenses_ from cache or remote files (if modified).
	 * @async
	 * @returns {Promise<void>} Void promise.
	 */
	function fetchData ()
	{
		return new Promise((resolve) =>
		{
			/**
			 * Iterable promises of all file load actions.
			 * @type {Array<Promise>} */
			let asyncCalls = [];
			asyncCalls.push(myx.repeatings.fetchData());
			for (let fileIndex = googleAppApi.files.size; fileIndex > 0; fileIndex -= 1)
			{
				let fileName = "data-" + fileIndex + ".csv";
				if (googleAppApi.files.get(fileName) !== undefined)
				{
					asyncCalls.push(myx.loadFile(fileName, "", (str) => importFileContent(fileIndex, str)));
				}
			}
			Promise.allSettled(asyncCalls).then(resolve);
		});
	};

	/**
	 * Imports the content of a _data-n.csv_ file.
	 *
	 * This does replace all data of the imported months.
	 *
	 * Also registers months and file numbers.
	 *
	 * @param {number} fileIndex Index (`1..x`) of the file where the data came from.
	 * @param {string} csvString Native csv data (as in a file).
	 */
	function importFileContent (fileIndex, csvString)
	{
		/**
		 * Collection of already loaded months so we can clear the `data` for this month.
		 * @type {Array<MonthString>} */
		let monthsLoaded = [];
		for (let line of csvString.split("\n"))
		{
			if (!!line)
			{
				/*
				 * Note: We can not use `add()` here, because we need to clear the `data[month]` array to avoid
				 * duplicated, which `add()` doesn't.
				 */
				let exp = new Expense(line);
				let month = exp.dat.toMonthString();
				if (monthsLoaded.includes(month) === false)
				{
					data[month] = [];
					dataIndex.register(month, fileIndex);
					monthsLoaded.push(month);
				}
				data[month].push(exp);
			}
		}
		for (let month of monthsLoaded.removeDuplicates())
		{
			sortItems(month);
		}
	}

	/**
	 * Provides all expenses of a month as CSV.
	 * @param {MonthString} month Month to get data.
	 * @returns {string} All expenses in given month as CSV.
	 */
	function getCsv (month)
	{
		let text = "";
		for (let item of data[month])
		{
			text += item.toString() + "\n";
		}
		return text;
	}

	/**
	 * Saves expenses to a file.
	 *
	 * More exactly: saves expenses of all months, that are in the same files as the given dates.
	 *
	 * @async
	 * @param {MonthString|Date|Array<MonthString>|Array<Date>} months Months to save data. May contain duplicates, theses will be removed automatically.
	 */
	async function saveToFile (months)
	{
		/**
		 * Months to be saved.
		 * @type {Array<MonthString>} */
		let months_ = (months instanceof Array) ? months : [months];
		months_ = months_.map((v) => (v.constructor.name === "Date") ? v.toMonthString() : v);
		months_.removeDuplicates().sort();
		window.dataIndex = dataIndex;
		/**
		 * Indexes of affected files.
		 * @type {Array<number>} */
		let fileIndexes = [];
		/**
		 * XHR operation promises.
		 * @type {Array<Promise<void>>} */
		let ops = [];
		myx.xhrBegin();
		for (let month of months_)
		{
			data[month] = data[month].filter((v) => v instanceof Expense);
			fileIndexes.push(dataIndex.fileindexOfMonth(month));
		}
		fileIndexes.removeDuplicates();
		for (let fileIndex of fileIndexes)
		{
			let csv = "";
			for (let month of dataIndex.allMonthsInFile(fileIndex))
			{
				console.debug("Saving " + month + " to '" + fileIndex + "'");
				csv += getCsv(month);
			}
			ops.push(googleAppApi.saveToFile("data-" + fileIndex + ".csv", csv));
		}
		Promise.allSettled(ops).then((results) =>
		{
			let allFulfilled = true;
			for (let result of results)
			{
				allFulfilled &&= (result.status === "fulfilled");
			}
			(allFulfilled) ? myx.xhrSuccess() : myx.xhrError();
		});
	}

	/**
	 * Adds expenses to `data` and saves files.
	 * @param {Expense|Array<Expense>} expenses Expenses to add.
	 */
	function add (expenses)
	{
		let expenses_ = (expenses instanceof Array) ? expenses : [expenses];
		/**
		 * Collection of all months that have been affected by adding expenses.
		 * @type {Array<MonthString>} */
		let monthsAffected = [];
		for (let item of expenses_)
		{
			let month = item.dat.toMonthString();
			data[month] ||= [];
			data[month].push(new Expense(item));
			monthsAffected.push(month);
		}
		for (let month of monthsAffected.removeDuplicates())
		{
			sortItems(month);
		}
		saveToFile(monthsAffected);
	}

	/**
	 * @typedef ExpenseRef
	 * @property {Date} date
	 * @property {number} index
	 */;
	/**
	* Deletes expenses from `data` and saves files.
	* @param {ExpenseRef|Array<ExpenseRef>} expenseRefs References of expenses to be deleted.
	*/
	function remove (expenseRefs)
	{
		let expenseRefs_ = (expenseRefs instanceof Array) ? expenseRefs : [expenseRefs];
		/**
		 * Collection of all months that have been affected by adding expenses.
		 * @type {Array<MonthString>} */
		let monthsAffected = [];
		for (let expenseRef of expenseRefs_)
		{
			let month = expenseRef.date.toMonthString();
			data[month][expenseRef.index] = null;
			monthsAffected.push(month);
		}
		monthsAffected.removeDuplicates().sort();
		for (let month of monthsAffected)
		{
			data[month] = data[month].filter((v) => v instanceof Expense);
		}
		saveToFile(monthsAffected);
	}

	/**
	 * Sorts expenses of a month, descending by date.
	 * @param {MonthString} month Month to get expenses sorted.
	 */
	function sortItems (month)
	{
		data[month].sort((a, b) => (a.dat - b.dat));
	}

	/**
	 * Checks whether there are actual expenses in a certain month or not.
	 * @param {MonthString|Date} month Month to check for data.
	 * @returns {boolean} `true` if there is any actual data for the month, `false` if there is no or only preview data.
	 */
	function hasActualData (month)
	{
		if (month instanceof Date)
		{
			month = month.toMonthString();
		}
		return ((!!data[month]) && (data[month].length > 0));
	};

	/**
	 * Returns the expense that is bound to a list element.
	 * @param {HTMLElement} element HTML element of the expenses list.
	 * @returns {Expense} Expense that is bound to the element.
	 */
	function getExpenseOfElement (element)
	{
		let dataIndex = Number(element.dataset.index);
		let dataMonth = element.dataset.month;
		if (dataIndex < 0)
		{
			dataIndex = (dataIndex + 1) * -1;
			dataMonth = PREVIEW;
		}
		return data[dataMonth][dataIndex];
	}

	/**
	 * Sets the current filter and renders the list.
	 *
	 * Mode will be set to "search" if there is at least a _pmt_ or a _cat_ filter. Also the title will get a seach hint.
	 * Otherwise the mode will be "default".
	 *
	 * @param {ExpensesFilter} filterObj Filters to set.
	 * @param {string} originModuleName Module name where the filter came from (where to return to).
	 */
	function setFilter (filterObj, originModuleName)
	{
		filter.pmt = filterObj.pmt;
		filter.cats = filterObj.cats || ((!!filterObj.cat) ? [filterObj.cat] : []);
		filter.months = filterObj.months || dataIndex.allAvailibleMonths;
		filter._origin = originModuleName;
		htmlBuilder.removeAllChildren(elements.get("search-hint"));
		if ((filter.cats.length > 0) || !!filter.pmt)
		{
			let searchHint = "";
			if (filter.cats.length > 0)
			{
				searchHint += myx.categories.get(filter.cats[0]).fullQualifiedLabel;
			}
			else if (!!filter.pmt)
			{
				searchHint += myx.paymentMethods.get(filter.pmt).label;
			}
			elements.get("search-hint").appendChild(htmlBuilder.newElement("div.cutoff", "\u00a0", searchHint));
			if (filter.months.length === 1)
			{
				elements.get("search-hint").appendChild(htmlBuilder.newElement("div", "\u00a0", "in " + (new Date(filter.months[0])).format("mmm yyyy")));
			}
			tabMode.set(ExpensesTabMode.SEARCH);
			choices.set("active-tab", MODULE_NAME);
		}
		else
		{
			tabMode.set(ExpensesTabMode.DEFAULT);
		}
		renderList();
	}

	/**
	 * Resets the filter. Only filter criteria will be the currently selected month.
	 *
	 * Calls `setFilter()`.
	 */
	function resetFilter ()
	{
		setFilter({ months: [selectedMonth.toMonthString()] });
	}

	/**
	 * Exits the "multiselect" mode back to the mode that was active before multiselect.
	 *
	 * Deselects all selected items.
	 */
	function exitMultiselectMode ()
	{
		{
			for (let selectedElement of elements.get("content").querySelectorAll(".multiselect-chosen"))
			{
				selectedElement.classList.remove("multiselect-chosen");
			}
			tabMode.set(preMultiselectTabMode);
		}
	}

	/**
	 * Sets the current month and also filters on the current month and renders the list via `setFilter()`.
	 * @param {Date} month Month to set.
	 */
	function setMonth (month)
	{
		selectedMonth = month;
		setFilter({ months: [month.toMonthString()] }, MODULE_NAME);
	}

	/**
	 * Updates a navigation element in the module's title.
	 *
	 * If the current month has no data and the target month has no data, too, the element gets hidden.
	 *
	 * @param {HTMLDivElement} navElement HTML element to update.
	 * @param {Date} targetMonth Month to be represented by the nav element.
	 */
	function renderNavItem (navElement, targetMonth)
	{
		navElement.parentElement.onclick = () =>
		{
			selectedMonth = targetMonth;
			setFilter({ months: [selectedMonth.toMonthString()] });
			renderList();
		};
		navElement.innerText = targetMonth.format("mmm");
		navElement.parentElement.style.visibility = (hasActualData(selectedMonth) || hasActualData(targetMonth)) ? "visible" : "hidden";
	}

	/**
	 * Provides a headline `<div>` element for a date.
	 * @param {Date} date Date to render the headline for.
	 * @returns {HTMLDivElement} Headline `<div>` containing a nice date text.
	 */
	function renderHeadline (date)
	{
		return htmlBuilder.newElement("div.headline",
			{ 'data-date': date.toIsoDate() },
			date.format("dddd, d. mmmm yyyy")
		);
	}

	/**
	 * Provides a HTML element representing an expense.
	 * @param {Expense} item Expense to render.
	 * @param {number} dataIndex Array index (`0..x`) of the current month subset of `data`.
	 * @returns {HTMLDivElement} `<div>` element.
	 */
	function renderItem (item, dataIndex)
	{
		let category = myx.categories.get(item.cat);
		let div = htmlBuilder.newElement("div.item.click" + ((item.dat > new Date()) ? ".preview" : ""),
			{
				'data-index': dataIndex,
				'data-month': item.dat.toMonthString(),
				onpointerdown: onItemPointerDown,
				onpointermove: () => { window.clearTimeout(longMousedownTimeoutId); },
				onpointerup: onItemPointerUp
			},
			// dataIndex,
			category.renderIcon(),
			htmlBuilder.newElement("div.flex-fill.cutoff",
				htmlBuilder.newElement("div.cutoff.big", item.txt || category.fullQualifiedLabel),
				htmlBuilder.newElement("div.cutoff.grey", (!!item.txt) ? category.fullQualifiedLabel : "")),
			htmlBuilder.newElement("div.amount.right.big", myx.formatAmountLocale(item.amt)),
			myx.paymentMethods.get(item.pmt).renderIcon()
		);
		return div;
	}

	/**
	 * Puts a list of all expenses matching the current filter to the "content"-element.
	 *
	 * For each day with an expense there will be a _headline_.
	 * Item elements will contain all functionality for all modes.
	 *
	 * Also navigation items will be updated.
	 *
	 * @param {Date} [scrollToDate] Date to be scrolled to; if omitted, list will try to scroll to _today_.
	 */
	function renderList (scrollToDate)
	{
		/** @type {Array<HTMLElement>} */
		let renders = [];
		/** @type {date} */
		let today = new Date();
		/** @type {Date} */
		let lastRenderedDate;// = new Date();
		/** @type {MonthString} */
		let lastRenderedMonth = "";
		elements.get("nav-current").innerText = selectedMonth.format("mmmm yyyy");
		renderNavItem(elements.get("nav-previous"), selectedMonth.shiftMonths(-1));
		renderNavItem(elements.get("nav-next"), selectedMonth.shiftMonths(+1));
		htmlBuilder.removeAllChildren(elements.get("content"));
		elements.get("content").scrollTop = 0;
		for (let month of filter.months.sort().reverse())
		{
			data[PREVIEW] = (tabMode.is(ExpensesTabMode.DEFAULT)) ? myx.repeatings.process(month) : [];
			/** @type {number} */
			let currentDay = 0;
			/** @type {HTMLElement} */
			let headline;
			/** @type {Array<Expense>} */
			let actualExpenses = data[month] || [];
			/** @type {Array<Expense>} */
			let items = actualExpenses.concat(data[PREVIEW]);
			/** @type {number} */
			let actualCount = actualExpenses.length;
			for (let i = items.length - 1; i >= 0; i -= 1)
			{
				let item = items[i];
				if (item.dat.getDate() !== currentDay)
				{
					currentDay = item.dat.getDate();
					headline = renderHeadline(item.dat);
				}
				if (((filter.cats.length === 0) || (filter.cats.includes(item.cat)))
					&& ((!filter.pmt) || (item.pmt === filter.pmt)))
				{
					if (!!headline)
					{
						if ((tabMode.is(ExpensesTabMode.DEFAULT)) && (lastRenderedDate > today) && (item.dat <= today))
						{
							let marker = htmlBuilder.newElement("div#previewmarker.headline.center",
								{ onclick: () => { elements.get("content").scrollTo({ top: 0, behavior: "smooth" }); } },
								htmlBuilder.newElement("i.fas", { 'data-icon': "angle-double-up" }),
								"&#x00a0;Upcoming expenses preview&#x00a0;",
								htmlBuilder.newElement("i.fas", { 'data-icon': "angle-double-up" })
							);
							// marker.addEventListener("animationend", () => { console.log("animation ended"); marker.style.animation = null; });
							scrollToDate ||= today;
							FA.applyOn(marker);
							renders.push(marker);
						}
						if ((filter.months.length > 1) && (lastRenderedMonth !== item.dat.toMonthString()))
						{
							renders.push(htmlBuilder.newElement("div.headline.month", item.dat.format("mmmm yyyy")));
							lastRenderedMonth = item.dat.toMonthString();
						}
						renders.push(headline);
						headline = null;
					}
					renders.push(renderItem(item, (i < actualCount) ? i : actualCount - i - 1));
				}
				lastRenderedDate = item.dat;
			}
		}
		if (renders.length > 0)
		{
			for (let render of renders)
			{
				elements.get("content").appendChild(render);
			}
			if (((filter.cats.length > 0) || (!!filter.pmt)) && (filter.months.length < dataIndex.allAvailibleMonths.length))
			{
				elements.get("content").appendChild(htmlBuilder.newElement("button",
					"Find more",
					{ onclick: () => setFilter(Object.assign({}, filter, { months: null }), filter._origin) }));
			}
			if (tabMode.is(ExpensesTabMode.DEFAULT))
			{
				elements.get("content").appendChild(htmlBuilder.newElement("div.spacer"));
			}
			scrollTo(scrollToDate);
		}
		else
		{
			elements.get("content").appendChild(htmlBuilder.newElement("div.fullscreen-msg",
				htmlBuilder.newElement("div.icon.far", FA.toHTML("smiley-meh")),
				htmlBuilder.newElement("div.label", "Nothing here.")
			));
		}
	}

	/**
	 * Scrolls to a given date; or at last as as close as possible - if the given date does not have any entries,
	 * it will scrrol to the next (later) date with entries.
	 * @param {Date} date Date to scroll to
	 */
	function scrollTo (date)
	{
		/**
		 * Find the closest header element for a date.
		 * @param {Date} forDate Date for which to get to closest header.
		 * @returns {HTMLElement} Closest header element for the given date.
		 */
		function findClosestHeader (forDate)
		{
			/** @type {HTMLElement} */
			let result = elements.get("content").querySelector("[data-date='" + forDate.toIsoDate() + "']");
			if (!result)
			{
				for (let closestDate = forDate, lastOfMonth = forDate.endOfMonth(); closestDate < lastOfMonth; closestDate = closestDate.addDays(1))
				{
					result = elements.get("content").querySelector("[data-date='" + closestDate.toIsoDate() + "']");
					if (!!result)
					{
						break;
					}
				}
			}
			return result;
		}
		if (date instanceof Date)
		{
			if (date.toIsoDate() === (new Date()).toIsoDate())
			{
				scrollElement = document.getElementById("previewmarker") || findClosestHeader(date);
			}
			else
			{
				scrollElement = findClosestHeader(date);
			}
			scrollElement?.scrollIntoView({ block: "start", behavior: "auto" });
		}
	}

	/**
	 * Pops up an ExpenseEditor to modify an expense or create a new one.
	 *
	 * Renders the expenses list afterwards.
	 *
	 * @param {Expense} [expense] Expense to edit; if omitted, a new expense will be created.
	 * @param {number} [dataIndex] Array index (`0..x`) of the current month subset of `data`; required if editing existing data, otherwise to be omitted.
	 */
	function popupEditor (expense, dataIndex)
	{
		/** @type {Expense}*/
		let originalItem = new Expense(expense);
		/** @type {MonthString} */
		let originalMonth = originalItem.dat.toMonthString();
		editor.popup(originalItem, dataIndex,
			/**
			 * Expense editor callback.
			 * @param {Expense} editedItem Edited expense.
			 * @param {ExpenseEditorAction} action Action of the expense editor.
			 */
			function onExpenseEditorEnd (editedItem, action)
			{
				/** @type {Date} */
				let scrollToDate = (action !== ExpenseEditorAction.NONE) ? editedItem?.dat : originalItem.dat;
				if (action === ExpenseEditorAction.ADD)
				{
					add(editedItem);
					setMonth(editedItem.dat);
				}
				else if ((action === ExpenseEditorAction.MODIFY) && (originalItem.equals(editedItem) === false))
				{
					if (editedItem.dat.toMonthString() === originalMonth)
					{
						data[originalMonth][dataIndex] = new Expense(editedItem);
						sortItems(originalMonth);
						saveToFile(originalMonth);
					}
					else
					{
						data[originalMonth].splice(dataIndex, 1);
						add(editedItem);
						setMonth(editedItem.dat);
					}
				}
				else if (action === ExpenseEditorAction.DELETE)
				{
					remove({ date: originalItem.dat, index: dataIndex });
					scrollToDate = originalItem.dat;
				}
				else if (action === ExpenseEditorAction.REPEATING)
				{
					null; // nothing to do here; repeating expenses are saved on editor.apply() that does set() the rep changes.
				}
				choices.set("active-tab", MODULE_NAME);
				renderList(scrollToDate);
			}
		);
	}

	/**
	 * Pops up a `Menubox` to select a month from all availible months.
	 * @param {Event} event Event that triggered the popup (required to stop propagation).
	 * @param {HTMLElement} alignElement Element to align the menu to (centered below bottom).
	 * @param {function(Date): void} callback `function(selectedMonth: Date)` to call on month selection.
	 */
	function popupAvalibleMonthsMenu (event, alignElement, callback)
	{
		let menuItems = [];
		let currentYear = null;
		for (let month of dataIndex.allAvailibleMonths.reverse())
		{
			let monthAsDate = new Date(month);
			let monthYear = monthAsDate.getFullYear();
			currentYear ||= (new Date()).getFullYear();
			if (monthYear !== currentYear)
			{
				menuItems.push({ separator: {} });
				currentYear = monthYear;
			}
			menuItems.push({
				key: month,
				label: monthAsDate.format("mmmm yyyy")
			});
		}
		let menubox = new Menubox("exp-months-selection", { items: menuItems }, (event) =>
		{
			if (typeof callback === "function")
			{
				callback(new Date(event.itemKey));
			}
		});
		menubox.popup(event, null, alignElement, "center, below bottom");
	}

	/**
	 * Event handler for clicks on the "current month" nav item.
	 * @param {MouseEvent} mouseEvent Triggering event.
	 */
	function onNavCurrentClick (mouseEvent)
	{
		popupAvalibleMonthsMenu(mouseEvent, elements.get("nav-current"), (month) =>
		{
			selectedMonth = month;
			resetFilter();
		});
	};

	/**
	 * Event handler for clicking the "add expense" button.
	 *
	 * Pops up the ExpenseEditor for new expense.
	 */
	function onAddExpenseClick ()
	{
		let nowMonth = (new Date()).toMonthString();
		let itemDate;
		if (selectedMonth.toMonthString() > nowMonth)
		{
			itemDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
		}
		else if (selectedMonth.toMonthString() < nowMonth)
		{
			itemDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
		}
		else
		{
			itemDate = new Date();
		}
		popupEditor(new Expense(null, { dat: itemDate }));
	}

	/**
	 * Event handler for pointer-down on list items.
	 *
	 * Starts timeout for long-mousedown switching to "multiselect" mode.
	 *
	 * @param {Event} event Triggering event.
	 */
	function onItemPointerDown (event)
	{
		longMousedownTimeoutId = window.setTimeout(() =>
		{
			preMultiselectTabMode = tabMode.get();
			tabMode.set(ExpensesTabMode.MULTISELECT);
			onItemClick(event);
			ignoreMouseup = true;
		}, LONG_MOUSEDOWN_TIMEOUT_MS);
	}

	/**
	 * Event handler for pointer-up on list items.
	 *
	 * Redirects to `onItemClick()` event handler if necessary.
	 *
	 * @param {Event} event Triggering event.
	 */
	function onItemPointerUp (event)
	{
		window.clearTimeout(longMousedownTimeoutId);
		if (ignoreMouseup === false)
		{
			onItemClick(event);
		}
		ignoreMouseup = false;
	}

	/**
	 * Event handler for clicks on list items. Actually it is triggered by the pointer-up event.
	 *
	 * - In "default" mode, it pops up the ExpenseEditor.
	 * - In "multiselect" mode, is selects/deselects the expense.
	 *
	 * @param {Event} event Triggering event.
	 */
	function onItemClick (event)
	{
		/** @type {HTMLElement} */
		let itemElement = event.target.closest("[data-index][data-month]");
		let expense = getExpenseOfElement(itemElement);
		switch (tabMode.get())
		{
			case ExpensesTabMode.MULTISELECT:
				itemElement.classList.toggle("multiselect-chosen");
				let selecteCount = 0;
				let selectedAmoutSum = 0;
				for (let selectedElement of elements.get("content").querySelectorAll(".multiselect-chosen"))
				{
					selecteCount += 1;
					selectedAmoutSum += getExpenseOfElement(selectedElement).amt;
				}
				if (selecteCount > 0)
				{
					elements.get("multiselect-hint").innerText = selecteCount + " items selected";
					elements.get("multiselect-sum").innerHTML = myx.formatAmountLocale(selectedAmoutSum);
				}
				else
				{
					exitMultiselectMode();
				}
				break;
			default:
				window.setTimeout(() => // Prevents triggering the pointer-event at the expenses editor.
				{
					popupEditor(expense, Number(itemElement.dataset.index));
				}, 100);
		}
	}

	/**
	 * Event handler for selecting an action from the multiselect menu.
	 * This is a dummy by now.
	 *
	 * // TODO: implement all events.
	 *
	 * @param {MenuboxEvent} menuboxEvent Triggering event.
	 */
	function onMultiselectMenuboxClick (menuboxEvent)
	{
		function _buildMenuboxItems (/** @type {Array<MenuboxItem>} */ menuboxItems)
		{
			menuboxItems.clear().push(
				{
					html: new PaymentMethodSelector(console.log, { class: "wide-flex" }, false).element
				}
			);
		}
		let expenseRefs = [];
		for (let selectedElement of elements.get("content").querySelectorAll(".multiselect-chosen"))
		{
			expenseRefs.push({
				date: new Date(selectedElement.dataset.month),
				index: Number(selectedElement.dataset.index)
			});
		}
		switch (menuboxEvent.itemKey)
		{
			case "edit-pmt":
				myxMenuboxes.get("exp-change-payment-method", confirm.log, _buildMenuboxItems, tabMode).popup(null, null, document.body, "center, middle");
				myx.showNotification("Not implemented yet.");
				break;
			case "delete":
				Menubox.dialogBox("Confirm deletion of " + expenseRefs.length + " expenses",
					"",
					[
						{ key: "delete" },
						{ key: "cancel" }
					])
					.then((buttonKey) =>
					{
						console.log(buttonKey);
						if (buttonKey === "delete")
						{
							remove(expenseRefs);
							exitMultiselectMode();
							renderList();
						}
					});
				break;
			default:
				myx.showNotification("Not implemented yet.");
		}
	}

	return { // publish members
		dataIndex: dataIndex, // debug_only
		get moduleName () { return MODULE_NAME; },
		get data () { return data; },
		init: init,
		fetchData: fetchData,
		enter: resetFilter,
		leave: resetFilter,
		get selectedMonth () { return selectedMonth; },
		set selectedMonth (value) { setMonth(value); },
		get allAvailibleMonths () { return dataIndex.allAvailibleMonths; },
		hasActualData: hasActualData,
		setFilter: setFilter,
		add: add,
		edit: popupEditor,
		renderItem: renderItem
	};
};
