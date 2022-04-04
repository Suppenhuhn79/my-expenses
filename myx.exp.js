/**
 * my-expenses "expenses" module.
 * @namespace myxExpenses
 * @param {myxPaymentMethods} paymentMethods 
 * @param {myxCategories} categories 
 */
const myxExpenses = function (paymentMethods, categories)
{
	/** 
	 * Represents an expense.
	 * @typedef ExpenseObject
	 * @type {Object}
	 * @property {Date} dat Expense date
	 * @property {Number} amt Expense amount
	 * @property {String} cat Expense category - id reference to categories
	 * @property {String} pmt Used payment method - id referenc to payment methods
	 * @property {String} [txt] Additional text 
	 */
	/**
	 * Defines filter for listing expenses.
	 * @typedef ExpenseFilterObject
	 * @type {Object}
	 * @property {String} [pmt] Payment method id
	 * @property {String} [cat] Category id (if sole)
	 * @property {Array<String>} [cats] Category ids (if many)
	 * @property {Array<MonthString>} [months] Months; set to all availibe months if ommited
	 */
	const MODULE_NAME = "expenses-list";
	let data = {};
	let dataIndex = myxDataindex();
	let filter = {};
	let availibleMonths = [];
	let elements = getNames(document.getElementById("expenses-list"));
	let modeHandler = new ModuleModeHandler(elements._self);
	/** @type {expenseEditor} */
	let editor;
	/** @type {Date} */
	let selectedMonth = new Date();

	elements.backSearchButton.onclick = () => { choices.choose("active-tab", filter._origin); };
	elements.cancelSearchButton.onclick = () => { resetFilter(); renderList(); };

	elements.navCurrent.onclick = (mouseEvent) =>
	{
		popupAvalibleMonthsMenu(mouseEvent, elements.navCurrent, (month) =>
		{
			selectedMonth = month;
			resetFilter();
			renderList();
		});
	};

	/**
	 * Loads data from a file. Converts the CSV data to an object and adds it to `data`.
	 * @param {Number} fileIndex Index (`1..x`) of file to load
	 * @returns {Promise<void>} Returns a Promise `resolve()`
	 */
	function loadFromFile (fileIndex = 1)
	{
		return new Promise((resolve) =>
		{
			const KEYS = ["dat", "amt", "cat", "txt", "pmt"];
			let fileName = "data-" + fileIndex.toString() + ".csv";
			googleappApi.loadFileEx(fileName).then((result) =>
			{
				for (let line of result.split("\n"))
				{
					if (!!line)
					{
						let vals = line.split("\t");
						let month = vals[0].substr(0, 7);
						let obj = {};
						dataIndex.register(month, fileIndex);
						for (let c = 0, cc = KEYS.length; c < cc; c += 1)
						{
							obj[KEYS[c]] = (c === 0) ? new Date(vals[c]) : ((c === 1) ? Number(vals[c]) : vals[c]);
						}
						add(obj, fileIndex);
					}
				}
				elements.addExpenseButton.classList.remove("hidden");
				elements.addExpenseButton.onclick = onAddExpenseClick;
				resolve();
			});
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
			text += [item.dat.toIsoFormatText("YMD"), item.amt, item.cat, item.txt, item.pmt].join("\t") + "\n";
		}
		return text;
	}

	/**
	 * **(async)** Saves expenses to a file.
	 * More exactly: saves expenses of all months, that are in the same files as the given months.
	 * @param {MonthString|Array<MonthString>} months Months to save data
	 */
	async function save (months)
	{
		let fileIndexes = [];
		let ops = [];
		myx.xhrBegin();
		if (typeof months === "string")
		{
			months = [months];
		}
		months = [...new Set(months)].sort(); // remove all duplicates and sort
		for (let month of months)
		{
			fileIndexes.push(dataIndex.fileindexOfMonth(month));
		}
		fileIndexes = [...new Set(fileIndexes)]; // remove all duplicates
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
	 * @param {ExpenseObject} obj Expense to add
	 * @param {Number} [fileIndex] Index (`1..x`) of file that contains the expense month. **Use only** when adding data on file load.
	 */
	function add (obj, fileIndex = null)
	{
		let month = obj.dat.toIsoFormatText("YM");
		if (!hasAnyData(month))
		{
			data[month] = [];
		}
		data[month].push(Object.assign({}, obj));
		dataIndex.register(month, fileIndex);
		sortItems(month);
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
	 * Checks whether there are expenses in a certain month or not.
	 * @param {MonthString} month Month to check for data
	 * @returns {Boolean} `true` if there is any data for the month, `false` if there is no data
	 */
	function hasAnyData (month)
	{
		return ((!!data[month]) && (data[month].length > 0));
	}

	/**
	 * Sets the current filter and renders the list. Also the title will get a _seach hint_.
	 * Mode will be set to `search` if there is at least a pmt or a cat filter. Otherwise the mode will be `default`.
	 * 
	 * @param {ExpenseFilterObject} filterObj Filters to set
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
				searchHint += categories.getLabel(filter.cats[0]);
			}
			else if (!!filter.pmt)
			{
				searchHint += paymentMethods.getLabel(filter.pmt);
			}
			elements.searchHint.appendChild(htmlBuilder.newElement("div.cutoff", "\u00a0", searchHint));
			if (filter.months.length === 1)
			{
				elements.searchHint.appendChild(htmlBuilder.newElement("div", "\u00a0", "in " + getShortMonthText(filter.months[0])));
			}
			modeHandler.setMode("search");
			choices.choose("active-tab", myx.expenses.moduleName);
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
		setFilter({ months: [selectedMonth.asIsoString] });
	}

	/**
	 * Updates a navigation element in the module's title.
	 * If the current month has no data and the target month has no data, too, the element gets hidden.
	 * @param {HTMLDivElement} navElement HTML element to update
	 * @param {Date} targetMonth Month to be represented by the nav element
	 */
	function _renderNavItem (navElement, targetMonth)
	{
		navElement.parentElement.onclick = () =>
		{
			selectedMonth = targetMonth.date;
			console.log(targetMonth, selectedMonth);
			setFilter({ months: [selectedMonth.asIsoString] });
			renderList();
		};
		navElement.innerText = targetMonth.shortName;
		navElement.parentElement.style.visibility = (hasAnyData(selectedMonth.asIsoString) || hasAnyData(targetMonth.isoString)) ? "visible" : "hidden";
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
	 * @param {ExpenseObject} item Expense to render
	 * @param {Number} dataIndex Array index (`0..x`) of the current month subset of `data`
	 * @returns {HTMLDivElement} `<div>` element
	 */
	function renderItem (item, dataIndex)
	{
		let catLabel = categories.getLabel(item.cat);
		let div = htmlBuilder.newElement("div.item.click",
			{ onclick: () => popupEditor(item, calcRelativeMonth(item.dat, 0).isoString, dataIndex) },
			categories.renderIcon(item.cat),
			htmlBuilder.newElement("div.flex-fill.cutoff",
				htmlBuilder.newElement("div.cutoff.big", item.txt || catLabel),
				htmlBuilder.newElement("div.cutoff.grey", (!!item.txt) ? catLabel : "")),
			htmlBuilder.newElement("div.amount.right.big", myx.formatAmountLocale(item.amt)),
			paymentMethods.renderIcon(item.pmt)
		);
		if (paymentMethods.isExcluded(item.pmt))
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
		elements.navCurrent.innerText = selectedMonth.asText;
		_renderNavItem(elements.navPrevious, calcRelativeMonth(selectedMonth, -1));
		_renderNavItem(elements.navNext, calcRelativeMonth(selectedMonth, +1));
		htmlBuilder.removeAllChildren(elements.content);
		let items = [];
		elements.content.scrollTop = 0;
		for (let month of filter.months)
		{
			if (hasAnyData(month))
			{
				let currentDay = 0;
				let headline;
				for (let i = data[month].length - 1; i >= 0; i -= 1)
				{
					let item = data[month][i];
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
							items.push(headline);
							headline = null;
						}
						items.push(renderItem(item, i));
					}
				}
			}
		}
		if (items.length > 0)
		{
			for (let item of items)
			{
				elements.content.appendChild(item);
			}
			if (((filter.cats.length > 0) || (!!filter.pmt)) && (filter.months.length === 1))
			{
				elements.content.appendChild(htmlBuilder.newElement("button",
					"Find more",
					{ onclick: () => setFilter(Object.assign({}, filter, { months: null }), filter._origin) }));
			}
			if (modeHandler.currentMode === "default")
			{
				elements.content.appendChild(htmlBuilder.newElement("div.spacer"));
			}
		}
		else
		{
			elements.content.appendChild(htmlBuilder.newElement("div.fullscreen-msg",
				htmlBuilder.newElement("div.icon.far", "&#xf11a;"),
				htmlBuilder.newElement("div.label", "Nothing here.")
			));
		}
	}

	/**
	 * Pops up an ExpenseEditor to modify an expense or create a new one. Renders the expenses list afterwards.
	 * @param {ExpenseObject} item Expense to edit
	 * @param {MonthString} [dataMonth] Month of the expense; required if editing existing data, otherwise prohibited
	 * @param {Number} [dataIndex] Array index (`0..x`) of the current month subset of `data`; required if editing existing data, otherwise prohibited
	 */
	function popupEditor (item, dataMonth, dataIndex)
	{
		editor.popup(item, dataMonth, dataIndex, (mode, item, originalMonth, originalIndex) =>
		{
			let itemDate = item.dat.toIsoFormatText("YMD");
			let itemMonth = itemDate.substr(0, 7);
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
				case "delete":
					data[originalMonth].splice(originalIndex, 1);
					break;
			}
			if (mode !== "not_modified")
			{
				save([originalMonth, itemMonth]);
			}
			choices.choose("active-tab", MODULE_NAME);
			setFilter({ months: [itemMonth] });
			renderList();
			elements.content.querySelector("[data-date='" + itemDate + "']")?.scrollIntoView({ block: "start", behavior: "smooth" });
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
		let currentYear = (new Date(availibleMonths[0])).getFullYear();
		for (let month of availibleMonths)
		{
			let monthAsDate = new Date(month);
			let monthYear = monthAsDate.getFullYear();
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
		let menubox = new Menubox("months-selection", { items: menuItems }, (event) =>
		{
			if (typeof callback === "function")
			{
				callback(new Date(event.itemKey));
			}
		});
		menubox.popup(event, null, alignElement, "center, below bottom");
	}

	/**
	 * Handler for "add expense" button click. Pops up ExpenseEditor for new expense.
	 */
	function onAddExpenseClick ()
	{
		let nowMonth = (new Date()).toIsoFormatText("YM");
		let itemDate;
		if (selectedMonth.asIsoString > nowMonth)
		{
			itemDate = new Date(selectedMonth.asDate.getFullYear(), selectedMonth.asDate.getMonth(), 1);
		}
		else if (selectedMonth.asIsoString < nowMonth)
		{
			itemDate = new Date(selectedMonth.asDate.getFullYear(), selectedMonth.asDate.getMonth() + 1, 0);
		}
		else
		{
			itemDate = new Date();
		}
		popupEditor({ dat: itemDate });
	}

	/* **** INIT MODULE **** */
	pageSnippets.import("snippets/expenseeditor.xml").then(() =>
	{
		editor = expenseEditor(paymentMethods, categories, myx.client);
	});
	resetFilter();

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		get data () { return data; }, // TODO: debug only
		get index () { return dataIndex; }, // TODO: debug only
		getCsv: getCsv, // TODO: debug only
		save: save, // TODO: debug only
		get selectedMonth () { return selectedMonth; },
		set selectedMonth (value) { selectedMonth = value; },
		get availibleMonths () { return availibleMonths; },
		hasAnyData: hasAnyData,
		loadFromFile: loadFromFile,
		enter: () => { resetFilter(); renderList(); },
		leave: () => { resetFilter(); },
		setFilter: setFilter,
		edit: popupEditor,
		popupAvalibleMonthsMenu: popupAvalibleMonthsMenu
	};
};
