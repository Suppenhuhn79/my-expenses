/**
 * @typedef CalculationMode
 * Defines a statistics calculation mode, which can be totals (sum) or monthly averages.
 * @type {"sum"|"mavg"}
 * 
 * @typedef TimerangeMode
 * Defines a time range mode, which can be a single month, a full year or all time.
 * @type {"month"|"year"|"all"}
 */

/**
 * @namespace myxStatisticsTimerange
 */
const myxStatisticsTimerange = function () 
{
	/** @type {TimerangeMode} */
	let mode = "month";
	/**
	 * 
	 * @readonly To set use `setSelectedMonths()`
	 * @type {Array<MonthString>}
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
	 * @param {Boolean} [fromExternal] Whether setting month was triggered from outside this module (`true`) or not (`false`, default). If this is `false` the selected month in the _expenses_ module will be updated.
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
			selectedMonths = myx.expenses.allAvailibleMonths;
		}
		else if (/^\d{4}$/.test(value) === true)
		{
			selectedMonths = [];
			selectedTime = value.substring(0, 4);
			for (let month of myx.expenses.allAvailibleMonths)
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
				result = myx.expenses.selectedMonth.shiftMonths(direction);
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
 * @namespace
 */
function myxStatistics ()
{
	const MODULE_NAME = "statistics-tab";
	let elements = document.getElementById(MODULE_NAME).getNamedChildren();
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
	/** @type {Record<MonthString, MonthAggregate>} */
	let data;
	/** @type {Array<MonthString>} */
	let actualCalculatedMonths;

	let chartMenu = new Menubox("sta.chart", {
		title: "Chart",
		items: [
			{
				key: "pie",
				label: "Distribution by category",
				iconHtml: htmlBuilder.newElement("i.fas.icon", fa.icon("chart-pie"))
			},
			{
				key: "areat",
				label: "Course over time",
				iconHtml: htmlBuilder.newElement("i.fas.icon", fa.icon("chart-area"))
			},
			{
				key: "none",
				label: "None",
				iconHtml: htmlBuilder.newElement("i.fas.icon", fa.icon("ban"))
			}
		]
	});

	elements.get("chart-select-button").onclick = (mouseEvent) => chartMenu.popup(mouseEvent, null, elements.get("chart-select-button"), "below bottom, center");

	elements.get("navigate-prev-time").onclick = elements.get("navigate-next-time").onclick = (mouseEvent) =>
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
				element: elements.get("navigate-next-time")
			},
			{
				targetDate: timerange.prevTimerange,
				element: elements.get("navigate-prev-time")
			}
		];
		for (let item of items)
		{
			if (timerange.mode !== "all")
			{
				item.element.dataset.targetDate = item.targetDate.toISOString();
				item.element.classList[myx.expenses.hasActualData(item.targetDate) ? "remove" : "add"]("disabled");
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
			actualCalculatedMonths = timerange.selectedMonths.clone().reverse();
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
			htmlBuilder.newElement("div",
				{ style: "width:" + percentAsCssString + "height:100%;background-color:" + color + ";" }),
			htmlBuilder.newElement("div.label",
				{ style: "position:relative;" + labelPosition }, ratioAsPercentString + "\u00a0" + "%")
		);
	}

	function getHeadline ()
	{
		let result = (new Date(actualCalculatedMonths[0])).format("mmmyy");
		if (actualCalculatedMonths.length > 1)
		{
			result = (new Date(actualCalculatedMonths[actualCalculatedMonths.length - 1])).format("mmmyy") + "-" + result;
		}
		// TODO: filters
		result += ", all categories, all payment methods";
		return result;
	}

	function getTitle ()
	{
		let result = "";
		let timeRange = (choices.get("time-range-mode") === "all") ? "all time" : myx.expenses.selectedMonth.format((choices.get("time-range-mode") === "month") ? "mmmm yyyy" : "yyyy");
		let calculationMode = ((choices.get("calculation-mode") === "sum") ? "total" : (choices.get("time-range-mode") === "month") ? "average" : "monthly average");
		result = [timeRange, calculationMode].join(" ");
		return result[0].toUpperCase() + result.substring(1);
	}

	function renderContent ()
	{
		if (myx.expenses.hasActualData(myx.expenses.selectedMonth.toMonthString()))
		{
			let k = calcMode;
			htmlBuilder.removeAllChildren(elements.get("content"));
			elements.get("headline").innerHTML = getHeadline();
			elements.get("title").innerHTML = getTitle();
			elements.get("amount").innerHTML = myx.formatAmountLocale(data[k]);
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
				elements.get("content").appendChild(div);
			}
		}
		else
		{
			htmlBuilder.replaceContent(elements.get("content"), htmlBuilder.newElement("div.fullscreen-msg",
				htmlBuilder.newElement("div.icon.far", fa.icon("smiley-meh")),
				htmlBuilder.newElement("div.label", "Nothing here.")
			));
		}
	}

	function enter ()
	{
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
		elements.get().querySelector("[data-cat='" + catId + "']").classList.toggle("hidden");
	};

	/**
	 * Handles clicks on subcategory items in the list.
	 * - default: sets the expenses filter to the category and selected time range and switches to expenses
	 * @param {MouseEvent} mouseEvent Mouse event triggered by the click
	 */
	function onSubcategoryClick (mouseEvent)
	{
		mouseEvent.stopPropagation();
		let catId = mouseEvent.target.closest("[data-cat]").dataset.cat;
		let masterId = myx.categories.data[catId].masterCategory || catId;
		for (let aggregate of data.totals)
		{
			if (aggregate.catId === masterId)
			{
				for (let sub of aggregate.subs)
				{
					if (sub.catId === catId)
					{
						// console.log(sub, timerange.selectedMonths);
						console.log(sub.count / timerange.selectedMonths.length + " times per month, " + sub.sum / sub.count + "€ per time, " + sub.mavg + "€ per month");
						break;
					}
				}
			}
		}
		return;
		// TODO: on subcategory click
		myx.setExpenseFilter({
			cat: catId,
			months: settings.selectedTime.months
		}, MODULE_NAME);
	}

	choices.onChoose("time-range-mode", onTimerangemodeChosen);
	choices.onChoose("calculation-mode", onCalculationmodeChosen);

	return { // publish members
		get aggregator () { return aggregator; }, // debug_only
		get timerange () { return timerange; }, // debug_only
		get elements () { return elements; }, // debug_only
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

