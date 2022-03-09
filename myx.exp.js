const myxExpenses = function (myx, paymentMethods, categories)
{
	const MODULE_NAME = "expenses-list";
	let data = {};
	let filter = {};
	let fileMonthMap = {};
	let availibleMonths = [];
	let elements = getNames(document.getElementById("expenses-list"));
	let modeHandler = new ModuleModeHandler(elements._self);
	let editor;

	elements.cancelSearchButton.onclick = () => { choices.choose("active-tab", filter._origin); };

	function loadFromFile (fileName = "data-1.csv")
	{
		return new Promise((resolve, reject) =>
		{
			const KEYS = ["dat", "amt", "cat", "txt", "pmt"];
			// xhr("GET", "http://christophpc:8800/projekte/my-expenses/~web-mock/" + fileName).then((result) =>
			googleappApi.loadFile(fileName).then((result) =>
			{
				fileMonthMap[fileName] = [];
				for (let line of result.split("\n"))
				{
					if (!!line)
					{
						let vals = line.split("\t");
						let obj = {};
						let monthKey = vals[0].substr(0, 7);
						if (!data[monthKey])
						{
							fileMonthMap[fileName].push(monthKey);
							data[monthKey] = [];
						}
						for (let c = 0, cc = KEYS.length; c < cc; c += 1)
						{
							obj[KEYS[c]] = (c === 0) ? new Date(vals[c]) : ((c === 1) ? Number(vals[c]) : vals[c]);
						}
						data[monthKey].push(obj);
					}
				}
				elements.addExpenseButton.classList.remove("hidden");
				elements.addExpenseButton.onclick = onAddExpenseClick;
				availibleMonths = availibleMonths.concat(fileMonthMap[fileName]).sort((a, b) => (a.localeCompare(b) * -1));
				console.log(fileMonthMap, availibleMonths);
				resolve();
			});
		});
	};

	function getCsv ()
	{
		let text = "";
		for (let month in data)
		{
			for (let item of data[month])
			{
				text += [item.dat.toIsoFormatText("YMD"), item.amt, item.cat, item.txt, item.pmt].join("\t") + "\n";
			}
		}
		return text;
	};

	async function save ()
	{
		myx.xhrBegin();
		googleappApi.saveToFile("data-1.csv", getCsv()).then(myx.xhrSuccess, myx.xhrError);
	};

	function add (obj)
	{
		let month = obj.dat.toIsoFormatText("YM");
		if (!hasAnyData(month))
		{
			data[month] = [];
		}
		data[month].push(Object.assign({}, obj));
		sortItems(month);
	};

	function sortItems (month)
	{
		data[month].sort((a, b) => (a.dat - b.dat));
	};

	/**
	 * @param {string} month check this month for data ("YYYY-MM")
	 * @returns {boolean} wheter there is any data for the month or not
	 */
	function hasAnyData (month)
	{
		return ((!!data[month]) && (data[month].length > 0));
	};

	/**
	 * 
	 * @param {{pmt: {String=}}} filterObj foo
	 * @param {String} originModuleName module name where the filter came from (where to return to)
	 */
	function setFilter (filterObj, originModuleName)
	{
		filter.pmt = filterObj.pmt;
		filter.cats = filterObj.cats || ((!!filterObj.cat) ? [filterObj.cat] : []);
		filter.months = filterObj.months || availibleMonths;
		filter._origin = originModuleName;
		console.log("filter set:", filter);
		if ((filter.cats.length > 0) || !!filter.pmt)
		{
			let searchHint = "";
			if (!!filter.cats)
			{
				searchHint += categories.getLabel(filter.cats[0]);
			}
			else if (!!filter.pmt)
			{
				searchHint += paymentMethods.getLabel(filter.pmt);
			}
			if (filter.months.length === 1)
			{
				searchHint += " in " + getShortMonthText(filter.months[0]);
			}
			elements.searchFilter.innerText = searchHint;
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
	 * Resets the filter. Only filter criteria is the currently selected month.
	 * Calls `setFilter()`.
	 */
	function resetFilter ()
	{
		setFilter({ months: [myx.selectedMonth.asIsoString] });
	}

	function _renderNavItem (navElement, targetMonth)
	{
		navElement.parentElement.onclick = () =>
		{
			myx.selectedMonth = targetMonth.isoString;
			setFilter({ months: [myx.selectedMonth.asIsoString] });
			renderList();
		};
		navElement.innerText = targetMonth.shortName;
		navElement.parentElement.style.visibility = (hasAnyData(myx.selectedMonth.asIsoString) || hasAnyData(targetMonth.isoString)) ? "visible" : "hidden";
	}

	/**
	 * Provides a headline <div> for a date.
	 * @param {Date} date Date to render the headline for
	 * @returns {HTMLDivElement} Headline <div> containing a nice date text
	 */
	function renderHeadline (date)
	{
		return htmlBuilder.newElement("div.headline",
			{ 'data-date': date.toIsoFormatText("YMD") },
			weekdayNames[date.getDay()] + ", " + date.getDate() + ". " + monthNames[date.getMonth()] + " " + date.getFullYear()
		);
	}

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
	};

	/**
	 */
	function renderList ()
	{
		elements.navCurrent.innerText = myx.selectedMonth.asText;
		_renderNavItem(elements.navPrevious, calcRelativeMonth(myx.selectedMonth.asIsoString, -1));
		_renderNavItem(elements.navNext, calcRelativeMonth(myx.selectedMonth.asIsoString, +1));
		htmlBuilder.removeAllChildren(elements.content);
		let items = [];
		elements.content.scrollTop = 0;
		console.log("filter applied:", filter);
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

	function popupEditor (item, dataMonth, dataIndex)
	{
		editor.popup(item, dataMonth, dataIndex, (mode, item, originalMonth, originalIndex) =>
		{
			console.log("onItemEdited", mode, item, originalMonth, originalIndex);
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
				save();
			}
			choices.choose("active-tab", MODULE_NAME);
			setFilter({ months: [itemMonth] });
			renderList();
			elements.content.querySelector("[data-date='" + itemDate + "']").scrollIntoView({ block: "start", behavior: "smooth" });
		});
	}

	function onAddExpenseClick ()
	{
		let nowMonth = (new Date()).toIsoFormatText("YM");
		let itemDate;
		if (myx.selectedMonth.asIsoString > nowMonth)
		{
			itemDate = new Date(myx.selectedMonth.asDate.getFullYear(), myx.selectedMonth.asDate.getMonth(), 1);
		}
		else if (myx.selectedMonth.asIsoString < nowMonth)
		{
			itemDate = new Date(myx.selectedMonth.asDate.getFullYear(), myx.selectedMonth.asDate.getMonth() + 1, 0);
		}
		else
		{
			itemDate = new Date();
		}
		popupEditor({ dat: itemDate });
	};

	/* **** INIT MODULE **** */
	pageSnippets.import("snippets/expenseeditor.xml").then(() =>
	{
		editor = expenseEditor(paymentMethods, categories, myx.client);
	});
	resetFilter();

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		// get data () { return data; },
		// get availibleMonths () { return availibleMonths; },
		hasAnyData: hasAnyData,
		loadFromFile: loadFromFile,
		// saveToFile: save,
		enter: () => { resetFilter(); renderList(); },
		leave: () => { resetFilter(); },
		setFilter: setFilter,
		exportAsCsv: getCsv,
		edit: popupEditor
	};
};
