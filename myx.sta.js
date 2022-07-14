/**
 * @namespace myxStatisticsTimerange
 * 
 * @typedef TimerangeMode
 * @type {"month"|"year"|"all"}
 */
const myxStatisticsTimerange = function () 
{
	/** @type {TimerangeMode} */
	let mode = "month";
	/** @type {Array<MonthString>}
	 * @readonly
	 * To set use `setSelectedMonths()`
	 */
	let selectedMonths;

	/**
	 * Sets the given timerange mode. Affects the selected months.
	 * @param {TimerangeMode} newMode Mode to set
	 */
	function setMode (newMode)
	{
		mode = newMode;
		switch (newMode)
		{
			case "month":
				setMonth(myx.expenses.selectedMonth);
				break;
			case "year":
				setYear(myx.expenses.selectedMonth.getFullYear());
				break;
			case "all":
				_setSelectedMonths("*");
				break;
		}
	};

	/**
	 * Set the time range to a single month.
	 * @param {Date} newMonth New month to set.
	 * @param {Boolean} [fromExternal] Wheter setting month was triggered from outside this module (`true`) or not (`false`, default). If this is `false` the selected month in expenses will be updated.
	 */
	function setMonth (newMonth, fromExternal = false)
	{
		if (fromExternal === false)
		{
			myx.expenses.selectedMonth = newMonth;
		}
		_setSelectedMonths(myx.expenses.selectedMonth.toMonthString());
	};

	/**
	 * Sets the time range to a full year.
	 * @param {Number} newYear New year to set
	 */
	function setYear (newYear)
	{
		const actualYear = myx.expenses.selectedMonth.getFullYear();
		let newYearMonth = (newYear === actualYear) ? myx.expenses.selectedMonth.getMonth() : ((newYear < actualYear) ? 11 : 0);
		let actualMonth = new Date(newYear, newYearMonth, 1);
		myx.expenses.selectedMonth = actualMonth;
		_setSelectedMonths(newYear.toString());
	}

	/**
	 * Sets selected time range as array containing actual monts.
	 * This calls the `onTimerangeChange` callback.
	 * @param {"yyyy-mm"|"yyyy"|"*"} value Value to set the months selection. May be either a ISO-month-string, a 4-digit year string or an asterisk for _all availible data_.
	 */
	function _setSelectedMonths (value)
	{
		if (value === "*")
		{
			myx.expenses.selectedMonth = new Date();
			selectedMonths = myx.expenses.availibleMonths;
		}
		else if (/^\d{4}$/.test(value) === true)
		{
			selectedMonths = [];
			selectedTime = value.substring(0, 4);
			for (let month of myx.expenses.availibleMonths)
			{
				if (month.substring(0, 4) === selectedTime)
				{
					selectedMonths.push(month);
				}
			}
		}
		else if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
		{
			selectedMonths = [value];
		}
	}

	/**
	 * Returns the adjacent time range (previous or following) for the current monht/year and mode.
	 * @param {-1|1} direction Whether to calculate the previous (`-1`) or the following (`+1`) time range
	 * @returns {Date}
	 */
	function getAdjacentTimerange (direction)
	{
		let result = myx.expenses.selectedMonth;
		switch (mode)
		{
			case "month":
				result = myx.expenses.selectedMonth.addMonths(direction);
				break;
			case "year":
				result = new Date(myx.expenses.selectedMonth.getFullYear() + direction, (direction > 0) ? 0 : 11, 1);
				break;
		}
		return result;
	}

	/**
	 * Sets the current month/year.
	 * @param {Date} date Date to navigate to.
	 */
	function navigateTo (date)
	{
		switch (mode)
		{
			case "month":
				setMonth(date);
				break;
			case "year":
				setYear(date.getFullYear());
				break;
		}
	}

	return { // publish members
		get selectedMonths () { return selectedMonths; },
		get nextTimerange () { return getAdjacentTimerange(1); },
		get prevTimerange () { return getAdjacentTimerange(-1); },
		get mode () { return mode; },
		set mode (value) { setMode(value); },
		navigateTo: navigateTo,
		/**
		 * Sets time range selection to a single month. Updates the menubox.
		 * @param {Date} month Month to set.
		 */
		selectMonth: (month) => { setMonth(month, true); }
	};
};

/**
 * my-expenses "statistics" module.
 * @namespace myxStatistics
 * 
 * @typedef CalculationMode
 * @type {"sum"|"mavg"}
 */
const myxStatistics = function ()
{
	const MODULE_NAME = "statistics";
	let elements = getNames(document.getElementById(MODULE_NAME));
	let aggregator = myxStatisticAggregator();
	let timerange = myxStatisticsTimerange(performAggregation);
	/**
	 * Prevents calculation while setting modes on module entering.
	 * @type {Boolean}
	 */
	let entering;
	/**
	 * Determinants the statistics mode. Either _sum_ or _monthly average_.
	 * @type {CalculationMode}
	 */
	let calcMode;
	/** @type {Object} */
	let data;
	/** @type {Array<MonthString>} */
	let actualCalculatedMonths;

	let chartMenu = new Menubox("mxy.sta.chart", {
		title: "Chart",
		items: [
			{
				key: "pie",
				label: "Distribution by category",
				iconHtml: htmlBuilder.newElement("i.fas.icon", fa.chart_pie)
			},
			{
				key: "areat",
				label: "Course over time",
				iconHtml: htmlBuilder.newElement("i.fas.icon", fa.chart_area)
			},
			{
				key: "none",
				label: "None",
				iconHtml: htmlBuilder.newElement("i.fas.icon", fa.ban)
			}
		]
	});

	elements.chartSelectButton.onclick = (mouseEvent) => chartMenu.popup(mouseEvent, null, elements.chartSelectButton, "below bottom, center");

	elements.navigatePrevTime.onclick = elements.navigateNextTime.onclick = (mouseEvent) =>
	{
		if (mouseEvent.target.classList.contains("disabled") === false)
		{
			timerange.navigateTo(new Date(mouseEvent.target.dataset.targetDate));
			performAggregation();
		}
	};

	/**
	 * Refreshes the time navigation buttons on whether there can be navigated to the previous/following time range.
	 */
	function _refreshNavigatorButtons ()
	{
		const items = [
			{
				targetDate: timerange.nextTimerange,
				element: elements.navigateNextTime
			},
			{
				targetDate: timerange.prevTimerange,
				element: elements.navigatePrevTime
			}
		];
		for (let item of items)
		{
			if (timerange.mode !== "all")
			{
				item.element.dataset.targetDate = item.targetDate.toISOString();
				item.element.classList[myx.expenses.hasAnyData(item.targetDate) ? "remove" : "add"]("disabled");
			}
			else
			{
				item.element.classList.add("disabled");
			}
		};
	}

	/**
	 * Event handler for setting the timerange mode.
	 * @param {TimerangeMode} choiceKey Timerange mode to set.
	 */
	function onTimerangemodeChosen (choiceKey)
	{
		timerange.mode = choiceKey;
		if ((choiceKey === "month") && (calcMode === "mavg"))
		{
			choices.set("calculation-mode", "sum");
		}
		else
		{
			performAggregation();
		}
	}

	/**
	 * Event handler for setting calculation mode.
	 * @param {CalculationMode} choiceKey Calculation mode to set.
	 */
	function onCalculationmodeChosen (choiceKey)
	{
		calcMode = choiceKey;
		if ((choiceKey === "mavg") && (timerange.mode === "month"))
		{
			choices.set("time-range-mode", "year");
		}
		else
		{
			performAggregation();
		}
	}

	/**
	 * Performs calculation of statistics aggregations.
	 */
	function performAggregation ()
	{
		_refreshNavigatorButtons();
		if (entering === false)
		{
			actualCalculatedMonths = [...timerange.selectedMonths]; // clone array
			/* If calculating averages, exclude the current month (if not on the last day). */
			if (calcMode !== "sum")
			{
				let now = new Date();
				let todayMonth = now.toMonthString();
				if ((now.isLastDayOfMonth() === false) && (actualCalculatedMonths.includes(todayMonth)))
				{
					actualCalculatedMonths.splice(0, actualCalculatedMonths.indexOf(todayMonth) + 1);
				}
			}
			aggregator.calc(actualCalculatedMonths, calcMode).then((aggregates) =>
			{
				data = aggregates;
				console.log("aggregates:", data);
				renderContent();
			});
		}
	}

	/**
	 * Provides a HTML element that draws a progress bar.
	 * @param {String} baseClass CSS class name for percent bar element
	 * @param {Number} ratio Percentage (`0<n<1`) filled on the bar
	 * @param {String} color CSS color value for percentage
	 * @returns {HTMLDivElement}
	 */
	function renderPercentBar (baseClass, ratio, color)
	{
		let ratioPercent = Math.round(ratio * 100);
		let percentAsCssString = ratioPercent + "%;";
		let ratioAsPercentString = ((ratio > 0) && (ratioPercent < 1)) ? "< 1" : ratioPercent.toString();
		let labelPosition = "left:" + ((ratio < 0.9) ? percentAsCssString : "calc(100% - 4.5em)") + ";";
		return htmlBuilder.newElement("div." + baseClass,
			{ style: "position:relative;" },
			htmlBuilder.newElement("div",
				{ style: "width:" + percentAsCssString + "height:100%;background-color:" + color + ";" }),
			htmlBuilder.newElement("div.label",
				{ style: "position:relative;" + labelPosition }, ratioAsPercentString + fa.space + "%")
		);
	}

	function getHeadline ()
	{
		let result = getSupershortMonthText(new Date(actualCalculatedMonths[0]));
		if (actualCalculatedMonths.length > 1)
		{
			result = getSupershortMonthText(new Date(actualCalculatedMonths[actualCalculatedMonths.length - 1])) + "-" + result;
		}
		// TODO
		result += ", all categories, all payment methods";
		return result;
	}

	function getTitle ()
	{
		let result = "";
		let timeRange = (choices.get("time-range-mode") === "all") ? "all time" : (choices.get("time-range-mode") === "month") ? getFullMonthText(myx.expenses.selectedMonth) : myx.expenses.selectedMonth.getFullYear();
		let calculationMode = ((choices.get("calculation-mode") === "sum") ? "total" : (choices.get("time-range-mode") === "month") ? "average" : "monthly average");
		result = [timeRange, calculationMode].join(" ");
		return result[0].toUpperCase() + result.substring(1);
	}

	function renderContent ()
	{
		if (myx.expenses.hasAnyData(myx.expenses.selectedMonth.toMonthString()))
		{
			let k = calcMode;
			htmlBuilder.removeAllChildren(elements.content);
			elements.headline.innerHTML = getHeadline();
			elements.title.innerHTML = getTitle();
			elements.amount.innerHTML = myx.formatAmountLocale(data[k]);
			for (let catAggr of data.totals)
			{
				let subCatDiv = htmlBuilder.newElement("div.hidden", { 'data-cat': catAggr.catId });
				if (catAggr.sum > 0)
				{
					for (let subCat of catAggr.subs)
					{
						if ((subCat.catId !== catAggr.catId) || (subCat.sum > 0))
						{
							subCatDiv.appendChild(htmlBuilder.newElement("div.subcat.wide-flex" + ".grey" + (subCat.sum === 0 ? ".zero-sum" : ""),
								{ 'data-cat': subCat.catId, onclick: onSubcategoryClick },
								myx.categories.renderIcon(subCat.catId),
								htmlBuilder.newElement("div.flex-fill.click",
									myx.categories.getLabel(subCat.catId, false)),
								htmlBuilder.newElement("div.amt", myx.formatAmountLocale(subCat[k])
								)));
						}
					}
				}
				let div = htmlBuilder.newElement(
					"div.item.click" + (catAggr.sum === 0 ? ".zero-sum" : ""),
					{ onclick: () => toggleSubcategoryVisibility(catAggr.catId) },
					myx.categories.renderIcon(catAggr.catId),
					htmlBuilder.newElement(
						"div.flex-fill.high-flex",
						htmlBuilder.newElement(
							"div.flex-fill.wide-flex",
							htmlBuilder.newElement("div.flex-fill.cutoff.big", myx.categories.getLabel(catAggr.catId)),
							htmlBuilder.newElement("div.amount.right.big", myx.formatAmountLocale(catAggr[k]))
						),
						renderPercentBar("percentbar", catAggr[k] / data[k], myx.categories.getColor(catAggr.catId)),
						subCatDiv
					)
				);
				elements.content.appendChild(div);
			}
		}
		else
		{
			htmlBuilder.replaceContent(elements.content, htmlBuilder.newElement("div.fullscreen-msg",
				htmlBuilder.newElement("div.icon.far", fa.smiley_meh),
				htmlBuilder.newElement("div.label", "Nothing here.")
			));
		}
	}

	function enter ()
	{
		console.clear();
		console.log("stats init");
		entering = true;
		choices.set("time-range-mode", "month");
		choices.set("calculation-mode", "sum");
		timerange.selectMonth(myx.expenses.selectMonth);
		entering = false;
		performAggregation();
	}

	/**
	 * Toggles visibility of subcategories on a master category.
	 * @param {String} catId Master category id to show/hide subcategories
	 */
	function toggleSubcategoryVisibility (catId)
	{
		elements._self.querySelector("[data-cat='" + catId + "']").classList.toggle("hidden");
	};

	/**
	 * Handles clicks on subcategory items in the list.
	 * - default: sets the expenses filter to the category and selected time range and switches to expenses
	 * @param {MouseEvent} mouseEvent Mouse event triggered by the click
	 */
	function onSubcategoryClick (mouseEvent)
	{
		mouseEvent.stopPropagation();
		return;
		// TODO!
		let id = mouseEvent.target.closest("[data-cat]").dataset.cat;
		myx.setExpenseFilter({
			cat: id,
			months: settings.selectedTime.months
		}, MODULE_NAME);
	}

	choices.onChoose("time-range-mode", onTimerangemodeChosen);
	choices.onChoose("calculation-mode", onCalculationmodeChosen);

	return { // publish members
		get aggregator () { return aggregator; }, // TODO: debug only
		get timerange () { return timerange; }, // TODO: debug only
		get elements () { return elements; }, // TODO: debug only
		get moduleName () { return MODULE_NAME; },
		enter: enter
		/*
		getMonthsInYear: (year) =>
		{
			let mths = [];
			for (let month of expenses.availibleMonths)
			{
				if (month.startsWith(year))
				{
					mths.push(month);
				}
			}
			return mths.sort();
		}
		*/
	};
};

