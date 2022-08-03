/** 
 * @typedef Expense
 * Expense object. Represents a single expense.
 * @type {Object}
 * @property {Date} dat Expense date
 * @property {Number} amt Expense amount
 * @property {IdString} cat Expense category - id reference to categories
 * @property {IdString} pmt Used payment method - id reference to payment methods
 * @property {String} [txt] Additional text 
 * @property {IdString} [rep] Repeating expense - id reference to repeating expenses
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
 * @namespace myxExpenses
 * my-expenses "expenses" module.
 */
let myxExpenses = function ()
{
	const MODULE_NAME = "expenses-tab";
	let data = {};
	let dataIndex = myxExpensesDataindex();
	/** @type {ExpensesFilter} */
	let filter = {};
	/** @type {Array<MonthString>} */
	let availibleMonths = [];
	let elements = getNames(document.getElementById("expenses-tab"));
	let modeHandler = new ModuleModeHandler(elements._self);
	let repeatings = myxRepeatingExpenses();
	/** @type {expenseEditor} */
	let editor;
	/** @type {Date} */
	let selectedMonth = new Date();
	/**
	 * Memorizing currently loading file, so so file is loaded twice.
	 * @type {Map<Number, Boolan>} */
	let currentlyLoadingFiles = new Map();

	elements.backSearchButton.onclick = () => { choices.set("active-tab", filter._origin); };
	elements.cancelSearchButton.onclick = () => { resetFilter(); renderList(); };
	elements.addExpenseButton.onclick = onAddExpenseClick;
	elements.navCurrent.onclick = onNavCurrentClick;

	/**
	 * Initializes the module.
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
				doFontAwesome(document.getElementById("expense-editor"));
				resetFilter();
				window.r = repeatings; // TODO: debug only
				console.log("Repeating expenses (`r`) have loaded.", window.r.data); // TODO: debug only
				resolve();
			});
		});
	};

	/**
	 * Loads _expenses_ and _repeating expenses_ from cache or remote files (if modified).
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
			for (let fileIndex = Object.keys(googleappApi.files).length; fileIndex > 0; fileIndex -= 1)
			{
				let fileName = "data-" + fileIndex + ".csv";
				if (googleappApi.files[fileName] !== undefined)
				{
					asyncCalls.push(loadFromFile(fileIndex));
				}
			}
			Promise.allSettled(asyncCalls).then(() =>
			{
				resolve();
			});
		});
	};

	/**
	 * Loads data from a file. Converts the CSV data to an object and adds it to `data`.
	 * @param {Number} fileIndex Index (`1..x`) of file to load
	 * @returns {Promise<void>} Promise
	 */
	function loadFromFile (fileIndex = 1)
	{
		return new Promise((resolve) =>
		{
			/**
			 * Mapping of CSV columns to `Expense` object memebers
			 * @type {Array<String>} */
			const KEYS = ["dat", "amt", "cat", "txt", "pmt", "rep"];
			/**
			 * Collection of already loaded months so we can clear the `data[<month>]` array.
			 * @type {Array<MonthString>} */
			let monthsLoaded = [];
			let fileName = "data-" + fileIndex.toString() + ".csv";
			if ((currentlyLoadingFiles.get(fileIndex) !== true) && (googleappApi.isModified(fileName)))
			{
				currentlyLoadingFiles.set(fileIndex, true);
				googleappApi.loadFileEx(fileName).then((result) =>
				{
					for (let line of result.split("\n"))
					{
						if (!!line)
						{
							let vals = line.split("\t");
							let obj = {};
							let month = vals[0].substr(0, 7);
							if (monthsLoaded.includes(month) === false)
							{
								dataIndex.register(month, fileIndex);
								data[month] = [];
								monthsLoaded.push(month);
							}
							for (let c = 0, cc = KEYS.length; c < cc; c += 1)
							{
								obj[KEYS[c]] = (c === 0) ? new Date(vals[c]) : ((c === 1) ? Number(vals[c]) : vals[c]);
							}
							dataIndex.register(obj.dat.toMonthString(), fileIndex);
							add(obj, true);
						}
					}
					for (let month of dataIndex.allMonthsInFile(fileIndex))
					{
						sortItems(month);
					}
					currentlyLoadingFiles.set(fileIndex, false);
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
	 * Provides all expenses of a month as CSV.
	 * @param {MonthString} month Month to get data
	 * @returns {String} All expenses in given month as CSV
	 */
	function getCsv (month)
	{
		let text = "";
		for (let item of data[month])
		{
			text += [item.dat.toIsoFormatText("YMD"), item.amt, item.cat, item.txt, item.pmt, item.rep].join("\t") + "\n";
		}
		return text;
	}

	/**
	 * Saves expenses to a file.
	 * More exactly: saves expenses of all months, that are in the same files as the given months.
	 * @param {MonthString|Array<MonthString>} months Months to save data
	 * @async
	 */
	async function saveToFile (months)
	{
		/** @type {Array<Number>} */
		let fileIndexes = [];
		/** @type {Array<Promise>} */
		let ops = [];
		myx.xhrBegin();
		if (typeof months === "string")
		{
			months = [months];
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
				csv += getCsv(month);
			}
			ops.push(googleappApi.saveToFile("data-" + fileIndex + ".csv", csv));
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
	 * Adds an expense to `data`.
	 * @param {Expense} expense Expense to add
	 * @param {Boolean} [bulk] Whether this call is part of a bulk operation, or not. If bulk, then **you must** call sortItems() at the end of the bulk operation. Default `false`
	 */
	function add (expense, bulk = false)
	{
		let month = expense.dat.toIsoFormatText("YM");
		data[month] ||= [];
		data[month].push(Object.assign({}, expense));
		if (bulk === false)
		{
			sortItems(month);
			dataIndex.register(month);
		}
		availibleMonths = dataIndex.allAvailibleMonths.sort((a, b) => (a.localeCompare(b) * -1));
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
		filter.months = filterObj.months || availibleMonths;
		filter._origin = originModuleName;
		htmlBuilder.removeAllChildren(elements.searchHint);
		if ((filter.cats.length > 0) || !!filter.pmt)
		{
			let searchHint = "";
			if (filter.cats.length > 0)
			{
				searchHint += myx.categories.getLabel(filter.cats[0]);
			}
			else if (!!filter.pmt)
			{
				searchHint += myx.paymentMethods.getLabel(filter.pmt);
			}
			elements.searchHint.appendChild(htmlBuilder.newElement("div.cutoff", "\u00a0", searchHint));
			if (filter.months.length === 1)
			{
				elements.searchHint.appendChild(htmlBuilder.newElement("div", "\u00a0", "in " + getShortMonthText(new Date(filter.months[0]))));
			}
			modeHandler.setMode("search");
			choices.set("active-tab", MODULE_NAME);
			renderList();
		}
		else
		{
			modeHandler.setMode("default");
		}
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
		navElement.innerText = monthNames[targetMonth.getMonth()].substring(0, 3);
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
			{ 'data-date': date.toIsoFormatText("YMD") },
			weekdayNames[date.getDay()] + ", " + date.getDate() + ". " + monthNames[date.getMonth()] + " " + date.getFullYear()
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
			{ onclick: () => popupEditor(item, item.dat.toMonthString(), dataIndex) },
			// dataIndex,
			myx.categories.renderIcon(item.cat),
			htmlBuilder.newElement("div.flex-fill.cutoff",
				htmlBuilder.newElement("div.cutoff.big", item.txt || catLabel),
				htmlBuilder.newElement("div.cutoff.grey", (!!item.txt) ? catLabel : "")),
			htmlBuilder.newElement("div.amount.right.big", myx.formatAmountLocale(item.amt)),
			myx.paymentMethods.renderIcon(item.pmt)
		);
		if (myx.paymentMethods.isExcluded(item.pmt))
		{
			div.classList.add("exclude");
		}
		return div;
	}

	/**
	 * Puts a list of all expenses matching the current filter to the "content"-element.
	 * For each day with an expense there will be a _headline_ and an _item_ element fo each expense.
	 * Item elements will contain all functionality for all modes.
	 * 
	 * Also navigation items will be updated.
	 */
	function renderList ()
	{
		/** @type {Array<HTMLElement>} */
		let renders = [];
		/** @type {date} */
		let today = new Date();
		/** @type {Date} */
		let lastRenderedDate;// = new Date();
		/** @type {MonthString} */
		let lastRenderedMonth = "";
		elements.navCurrent.innerText = getFullMonthText(selectedMonth);
		renderNavItem(elements.navPrevious, selectedMonth.shiftMonths(-1));
		renderNavItem(elements.navNext, selectedMonth.shiftMonths(+1));
		htmlBuilder.removeAllChildren(elements.content);
		elements.content.scrollTop = 0;
		for (let month of filter.months.sort().reverse())
		{
			/** @type {Number} */
			let currentDay = 0;
			/** @type {HTMLElement} */
			let headline;
			/** @type {Array<Expense>} */
			let repeatingExpenses = (modeHandler.currentMode === "default") ? repeatings.get(month) : [];
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
						if ((modeHandler.currentMode === "default") && (lastRenderedDate > today) && (item.dat <= today))
						{
							let marker = htmlBuilder.newElement("div#previewmarker.headline.center",
								{ onclick: () => { elements.content.scrollTo({ top: 0, behavior: "smooth" }); } },
								htmlBuilder.newElement("i.fas", { 'data-icon': "angle-double-up" }),
								"&#x00a0;Upcoming expenses preview&#x00a0;",
								htmlBuilder.newElement("i.fas", { 'data-icon': "angle-double-up" })
							);
							doFontAwesome(marker);
							renders.push(marker);
						}
						if ((filter.months.length > 1) && (lastRenderedMonth !== item.dat.toMonthString()))
						{
							renders.push(htmlBuilder.newElement("div.headline.month", getFullMonthText(item.dat)));
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
				elements.content.appendChild(render);
			}
			if (((filter.cats.length > 0) || (!!filter.pmt)) && (filter.months.length < availibleMonths.length))
			{
				elements.content.appendChild(htmlBuilder.newElement("button",
					"Find more",
					{ onclick: () => setFilter(Object.assign({}, filter, { months: null }), filter._origin) }));
			}
			if (modeHandler.currentMode === "default")
			{
				elements.content.appendChild(htmlBuilder.newElement("div.spacer"));
			}
			document.getElementById("previewmarker")?.scrollIntoView({ block: "start", behavior: "auto" });
		}
		else
		{
			elements.content.appendChild(htmlBuilder.newElement("div.fullscreen-msg",
				htmlBuilder.newElement("div.icon.far", fa.smiley_meh),
				htmlBuilder.newElement("div.label", "Nothing here.")
			));
		}
	}

	/**
	 * Pops up an ExpenseEditor to modify an expense or create a new one. Renders the expenses list afterwards.
	 * @param {Expense} item Expense to edit
	 * @param {MonthString} [dataMonth] Month of the expense; required if editing existing data, otherwise prohibited
	 * @param {Number} [dataIndex] Array index (`0..x`) of the current month subset of `data`; required if editing existing data, otherwise prohibited
	 */
	function popupEditor (item, dataMonth, dataIndex)
	{
		/** @type {Expense}*/
		let editorItem = Object.assign({}, item);
		if (!!item.rep)
		{
			editorItem.interval = repeatings.intervalOf(editorItem.rep);
		}
		editor.popup(editorItem, dataMonth, dataIndex, (mode, item, originalMonth, originalIndex) =>
		{
			console.log("got edited:", item, originalMonth, originalIndex);
			let itemDate = item.dat.toIsoFormatText("YMD");
			let itemMonth = itemDate.substr(0, 7);
			if (mode === "delete")
			{
				data[originalMonth].splice(originalIndex, 1);
				repeatings.set(item.rep, null, null);
			}
			else
			{
				item.rep = repeatings.set(item.rep, item, item.interval);
				switch (mode)
				{
					case "append":
						add(item);
						break;
					case "modify":
						if (itemMonth === originalMonth)
						{
							data[originalMonth][originalIndex] = Object.assign({}, item);
							sortItems(originalMonth);
						}
						else
						{
							data[originalMonth].splice(originalIndex, 1);
							add(item);
						}
						break;
				}
			}
			if (mode !== "not_modified")
			{
				saveToFile([originalMonth, itemMonth]);
			}
			choices.set("active-tab", MODULE_NAME);
			setMonth(new Date(itemMonth));
			renderList();
			elements.content.querySelector("[data-date='" + itemDate + "']")?.scrollIntoView({ block: "start", behavior: "auto" });
		});
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
		for (let month of availibleMonths.sort().reverse())
		{
			let monthAsDate = new Date(month);
			let monthYear = monthAsDate.getFullYear();
			currentYear ||= (new Date(availibleMonths[0])).getFullYear();
			if (monthYear !== currentYear)
			{
				menuItems.push({ separator: {} });
				currentYear = monthYear;
			}
			menuItems.push({
				key: month,
				label: monthNames[monthAsDate.getMonth()] + "\u00a0" + monthYear
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
		popupAvalibleMonthsMenu(mouseEvent, elements.navCurrent, (month) =>
		{
			selectedMonth = month;
			resetFilter();
			renderList();
		});
	};

	/**
	 * Handler for "add expense" button click. Pops up ExpenseEditor for new expense.
	 */
	function onAddExpenseClick ()
	{
		let nowMonth = (new Date()).toIsoFormatText("YM");
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
		popupEditor({ dat: itemDate });
	}

	return { // publish members
		get data () { return data; }, // TODO: debug only
		get index () { return dataIndex; }, // TODO: debug only
		getCsv: getCsv, // TODO: debug only
		save: saveToFile, // TODO: debug only
		get moduleName () { return MODULE_NAME; },
		init: init,
		fetchData: fetchData,
		get selectedMonth () { return selectedMonth; },
		set selectedMonth (value) { setMonth(value); },
		get availibleMonths () { return availibleMonths; },
		hasActualData: hasActualData,
		enter: renderList,
		leave: resetFilter,
		setFilter: setFilter,
		edit: popupEditor
	};
};
