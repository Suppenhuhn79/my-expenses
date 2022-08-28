/** 
 * @typedef Expense
 * Expense object. Represents a single expense.
 * @type {Object}
 * @property {Date} dat Expense date
 * @property {Number} amt Expense amount
 * @property {IdString} cat Expense category - id reference to categories
 * @property {IdString} pmt Used payment method - id reference to payment methods
 * @property {String} txt Additional text 
 * @property {IdString} rep Repeating expense - id reference to repeating expenses
 *
 * @typedef ExpensesFilter
 * Defines filter for listing expenses.
 * @type {Object}
 * @property {IdString} [pmt] Payment method id
 * @property {IdString} [cat] Category id (if sole)
 * @property {Array<IdString>} [cats] Category ids (if many)
 * @property {Array<MonthString>} [months] Months; set to all availibe months if ommited
 */

/**
 * Creates an instance of an `Expense` object.
 * @constructor
 * @param {Expense|String} [src] Csv string to parse or expense to copy
 * @param {Object} [override] Optional values to override default/source value
 * @returns {Expense} New expense object
 */
function Expense (src, override)
{
	/**
	 * Order of keys for conversion from/to csv
	 * @type {Array<String>}
	 */
	const KEY_ORDER = ["dat", "amt", "cat", "txt", "pmt", "rep"];

	this.dat = new Date();
	this.amt = 0;
	this.cat = "";
	this.txt = "";
	this.pmt = "";
	this.rep = "";

	switch (typeof src)
	{
		case "string":
			let vals = src.split("\t");
			for (let c = 0, cc = KEY_ORDER.length; c < cc; c += 1)
			{
				this[KEY_ORDER[c]] = (c === 0) ? new Date(vals[c]) : ((c === 1) ? Number(vals[c]) : vals[c] || "");
			}
			break;
		case "object":
			if (typeof override === "object")
			{
				src = Object.assign({}, src, override);
			}
			for (let key of KEY_ORDER)
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
	// TODO: this.pmt_ = new PaymentMethod(myx.paymentMethods.get(this.pmt));

	/**
	 * Compares two expenses if they are equal (date, amount, category, etc.)
	 * @param {Expense} otherExpense Second expense to compare
	 * @returns {Boolean} `true` if both expenses are equal, otherwise `false`
	 */
	this.equals = function (otherExpense)
	{
		let result = true;
		for (let key of KEY_ORDER)
		{
			result &&= (this[key].valueOf() === otherExpense[key].valueOf());
		}
		return result;
	};

	/**
	 * Gives a csv line for the expense.
	 * @returns {String}
	 */
	this.toString = function ()
	{
		return [this.dat.format("yyyy-mm-dd"), this.amt, this.cat, this.txt, this.pmt, this.rep].join("\t");
	};
}

const ExpensesTabMode = {
	DEFAULT: "default",
	SEARCH: "search",
	MULTISELECT: "multiselect"
};

/**
 * @namespace myxExpenses
 * my-expenses "expenses" module.
 */
let myxExpenses = function ()
{
	const MODULE_NAME = "expenses-tab";
	const LONG_MOUSEDOWN_TIMEOUT_MS = 750;
	/** @type {Record<MonthString, Array<Expense>>} */
	let data = {};
	let dataIndex = myxExpensesDataindex();
	/** @type {ExpensesFilter} */
	let filter = {};
	let elements = document.getElementById(MODULE_NAME).getNamedChildren();
	let tabMode = new ModuleModeHandler(elements.get());
	let repeatings = myxRepeatingExpenses();
	/** @type {expenseEditor} */
	let editor;
	/** @type {Date} */
	let selectedMonth = new Date();
	/**
	 * Tab mode that was active before multiselect.
	 * @type {String} */
	let preMultiselectTabMode;
	/**
	 * Id of the long-mousedown timeout.
	 * @type {Number} */
	let longMousedownTimeoutId;
	/**
	 * For ignoring mouseup on long-mousedown.
	 * @type {Boolean} */
	let ignoreMouseup = false;

	elements.get("back-search-button").onclick = () => { choices.set("active-tab", filter._origin); };
	elements.get("cancel-search-button").onclick = resetFilter;
	elements.get("cancel-multiselect-button").onclick = exitMultiselectMode;
	elements.get("add-expense-button").onclick = onAddExpenseClick;
	elements.get("nav-current").onclick = onNavCurrentClick;

	/**
	 * Initializes the module.
	 * @async
	 * @returns {Promise<void>} Promise
	 */
	function init ()
	{
		return new Promise((resolve) => 
		{
			Promise.allSettled([
				pageSnippets.import("snippets/expenseeditor.xml")
			]).then(() =>
			{
				editor = expenseEditor(repeatings, document.getElementById("client"));
				window.exd = editor; // debug_only
				// resetFilter();
				window.r = repeatings; // debug_only
				console.log("Repeating expenses (`r`) have loaded.", window.r.data); // debug_only
				resolve();
			});
		});
	};

	/**
	 * Loads _expenses_ and _repeating expenses_ from cache or remote files (if modified).
	 * @async
	 * @returns {Promise<void>} Promise
	 */
	function fetchData ()
	{
		return new Promise((resolve) => 
		{
			/**
			 * Iterable promises of all file load actions
			 * @type {Array<Promise>} */
			let asyncCalls = [];
			asyncCalls.push(repeatings.fetchData());
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
	 * Imports the content of a _data-n.csv_ file. This does replace all data of the imported months.
	 * Also registers months and file numbers.
	 * @param {Number} fileIndex Index (`1..x`) of the file where the data came from
	 * @param {String} csvString Native csv data (as in a file)
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
		for (let month of dataIndex.allMonthsInFile(fileIndex))
		{
			sortItems(month);
		}
	}

	/**
	 * Provides all expenses of a month as CSV.
	 * @param {MonthString} month Month to get data
	 * @returns {String} All expenses in given month as CSV
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
	 * More exactly: saves expenses of all months, that are in the same files as the given dates.
	 * @param {Expense|Array<Expense>} expenses Months to save data
	 * @async
	 */
	async function saveToFile (expenses)
	{
		/** 
		 * Months to be saved
		 * @type {Array<MonthString>} */
		let months = [];
		/**
		 * Indexes of affected files
		 * @type {Array<Number>} */
		let fileIndexes = [];
		/**
		 * XHR operation promises
		 * @type {Array<Promise>} */
		let ops = [];
		myx.xhrBegin();
		if (!(expenses instanceof Array))
		{
			expenses = [expenses];
		}
		for (let exp of expenses)
		{
			months.push(exp.dat.toMonthString());
		}
		months.removeDuplicates().sort();
		for (let month of months)
		{
			fileIndexes.push(dataIndex.fileindexOfMonth(month));
		}
		fileIndexes.removeDuplicates();
		for (let fileIndex of fileIndexes)
		{
			let csv = "";
			for (let month of dataIndex.allMonthsInFile(fileIndex))
			{
				console.log("saving " + month + " to '" + fileIndex + "'");
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
	 * Adds a expenses to `data`.
	 * @param {Expense|Array<Expense>} expense Expense to add
	 */
	function add (expense)
	{
		if ((expense instanceof Array) === false)
		{
			expense = [expense];
		}
		for (let item of expense)
		{
			let month = item.dat.toMonthString();
			data[month] ||= [];
			data[month].push(new Expense(item));
		}
		saveToFile(expense);
	}

	/**
	 * Sorts expenses of a month, descending by date.
	 * @param {MonthString} month Months to sort expenses
	 */
	function sortItems (month)
	{
		data[month].sort((a, b) => (a.dat - b.dat));
	}

	/**
	 * Checks whether there are actual expenses in a certain month or not.
	 * @param {MonthString|Date} month Month to check for data
	 * @returns {Boolean} `true` if there is any actual data for the month, `false` if there is no data
	 */
	function hasActualData (month)
	{
		if (month.constructor.name === "Date")
		{
			month = month.toMonthString();
		}
		return ((!!data[month]) && (data[month].length > 0));
	};

	/**
	 * Sets the current filter and renders the list. Also the title will get a _seach hint_.
	 * Mode will be set to `search` if there is at least a pmt or a cat filter. Otherwise the mode will be `default`.
	 * 
	 * @param {ExpensesFilter} filterObj Filters to set
	 * @param {String} originModuleName Module name where the filter came from (where to return to)
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
				searchHint += myx.categories.getLabel(filter.cats[0]);
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
	 * Calls `setFilter()`.
	 */
	function resetFilter ()
	{
		setFilter({ months: [selectedMonth.toMonthString()] });
	}

	/**
	 * Exits the "multiselect" mode back to the mode that was active before multiselect.
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
	 * Sets the current Month with no further action.
	 * @param {Date} month Month to set
	 */
	function setMonth (month)
	{
		selectedMonth = month;
		setFilter({ months: [month.toMonthString()] }, MODULE_NAME);
	}

	/**
	 * Updates a navigation element in the module's title.
	 * If the current month has no data and the target month has no data, too, the element gets hidden.
	 * @param {HTMLDivElement} navElement HTML element to update
	 * @param {Date} targetMonth Month to be represented by the nav element
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
	 * @param {Date} date Date to render the headline for
	 * @returns {HTMLDivElement} Headline `<div>` containing a nice date text
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
	 * @param {Expense} item Expense to render
	 * @param {Number} dataIndex Array index (`0..x`) of the current month subset of `data`
	 * @returns {HTMLDivElement} `<div>` element
	 */
	function renderItem (item, dataIndex)
	{
		let catLabel = myx.categories.getLabel(item.cat);
		let div = htmlBuilder.newElement("div.item.click" + ((item.dat > new Date()) ? ".preview" : ""),
			{
				"data-index": dataIndex,
				"data-month": item.dat.toMonthString(),
				onpointerdown: onItemPointerDown,
				onpointermove: () => { window.clearTimeout(longMousedownTimeoutId); },
				onpointerup: onItemPointerUp
			},
			// dataIndex,
			myx.categories.renderIcon(item.cat),
			htmlBuilder.newElement("div.flex-fill.cutoff",
				htmlBuilder.newElement("div.cutoff.big", item.txt || catLabel),
				htmlBuilder.newElement("div.cutoff.grey", (!!item.txt) ? catLabel : "")),
			htmlBuilder.newElement("div.amount.right.big", myx.formatAmountLocale(item.amt)),
			myx.paymentMethods.get(item.pmt).renderIcon()
		);
		return div;
	}

	/**
	 * Puts a list of all expenses matching the current filter to the "content"-element.
	 * For each day with an expense there will be a _headline_ and an _item_ element fo each expense.
	 * Item elements will contain all functionality for all modes.
	 * 
	 * Also navigation items will be updated.
	 * 
	 * @param {Date} [scrollToDate] Date to be scrolled to.
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
			/** @type {Number} */
			let currentDay = 0;
			/** @type {HTMLElement} */
			let headline;
			/** @type {Array<Expense>} */
			let repeatingExpenses = (tabMode.is(ExpensesTabMode.DEFAULT)) ? repeatings.process(month) : [];
			/** @type {Array<Expense>} */
			let actualExpenses = data[month] || [];
			/** @type {Array<Expense>} */
			let items = actualExpenses.concat(repeatingExpenses);
			/** @type {Number} */
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
							fa.applyOn(marker);
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
					renders.push(renderItem(item, (i < actualCount) ? i : -1 /* actualCount - i - 1 */));
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
				htmlBuilder.newElement("div.icon.far", fa.smiley_meh),
				htmlBuilder.newElement("div.label", "Nothing here.")
			));
		}
	}

	/**
	 * Scrolls to a given date; or at last as as close as possible - if the given date does not have any entries,
	 * it will scrol to the next (following) date with entries.
	 * @param {Date} date Date to scroll to
	 */
	function scrollTo (date)
	{
		/**
		 * Find the closest header element for a date.
		 * @param {Date} forDate 
		 * @returns {HTMLElement}
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
	 * Pops up an ExpenseEditor to modify an expense or create a new one. Renders the expenses list afterwards.
	 * @param {Expense} expense Expense to edit
	 * @param {Number} [dataIndex] Array index (`0..x`) of the current month subset of `data`; required if editing existing data, otherwise empty
	 */
	function popupEditor (expense, dataIndex)
	{
		/** @type {Expense}*/
		let originalItem = new Expense(expense);
		/** @type {MonthString} */
		let originalMonth = originalItem.dat.toMonthString();
		editor.popup(originalItem, dataIndex,
			/**
			 * Expense editor callback
			 * @param {Expense} editedItem Edited expense
			 * @param {ExpenseEditorAction} action
			 */
			(editedItem, action) =>
			{
				/** @type {Date} */
				let scrollToDate = (action !== ExpenseEditorAction.NONE) ? editedItem?.dat : originalItem.dat;
				if (action === ExpenseEditorAction.ADD)
				{
					add(editedItem);
					setMonth(editedItem.dat);
					saveToFile(editedItem);
				}
				else if ((action === ExpenseEditorAction.MODIFY) && (originalItem.equals(editedItem) === false))
				{
					if (editedItem.dat.toMonthString() === originalMonth)
					{
						data[originalMonth][dataIndex] = new Expense(editedItem);
						sortItems(originalMonth);
					}
					else
					{
						data[originalMonth].splice(dataIndex, 1);
						add(editedItem);
						setMonth(editedItem.dat);
					}
					saveToFile([originalItem, editedItem]);
				}
				else if (action === ExpenseEditorAction.DELETE)
				{
					data[originalMonth].splice(dataIndex, 1);
					scrollToDate = originalItem.dat;
					saveToFile(originalItem);
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
	 * @param {Event} event Event that triggered the popup (required to stop propagation)
	 * @param {HTMLElement} alignElement Element to align the menu to (centered below bottom)
	 * @param {Function} callback `function(selectedMonth: Date)` to call on month selection
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
		let menubox = new Menubox("exp.months-selection", { items: menuItems }, (event) =>
		{
			if (typeof callback === "function")
			{
				callback(new Date(event.itemKey));
			}
		});
		menubox.popup(event, null, alignElement, "center, below bottom");
	}

	/**
	 * Handler for clicks on the "current month" nav item.
	 * @param {MouseEvent} mouseEvent Event that was fired by click/tap.
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
	 * Handler for "add expense" button click. Pops up ExpenseEditor for new expense.
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
	 * Event handler for pointer down-on list items.
	 * 
	 * Starts timeout for long-mousedown switching to "multiselect" mode.
	 * 
	 * @param {Event} event Triggering event
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
	 * Redirects to `pnItemClick()` event handler if necessary.
	 * 
	 * @param {Event} event Triggering event
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
	 * Event handler for clicks on lilst items. Actually it is triggered by the mouseup event.
	 * 
	 * - In "default" mode, it pops up the expensde editor.
	 * - In "multiselect" mode, is selects/deselects the expense.
	 * 
	 * @param {Event} event Triggering event
	 */
	function onItemClick (event)
	{
		/** @type {HTMLElement} */
		let itemElement = event.target.closest("[data-index][data-month]");
		let dataIndex = Number(itemElement.dataset.index);
		let expense = data[itemElement.dataset.month][dataIndex];
		switch (tabMode.get())
		{
			case ExpensesTabMode.MULTISELECT:
				itemElement.classList.toggle("multiselect-chosen");
				let selecteCount = 0;
				let selectedAmoutSum = 0;
				for (let selectedElement of elements.get("content").querySelectorAll(".multiselect-chosen"))
				{
					selecteCount += 1;
					selectedAmoutSum += data[selectedElement.dataset.month][selectedElement.dataset.index].amt;
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
				popupEditor(expense, dataIndex);
		}
	}

	return { // publish members
		get data () { return data; }, // debug_only
		get index () { return dataIndex; }, // debug_only
		scrollTo: scrollTo, // debug_only
		getCsv: getCsv, // debug_only
		save: saveToFile, // debug_only
		get moduleName () { return MODULE_NAME; },
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
		edit: popupEditor
	};
};
