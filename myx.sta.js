/**
 * @namespace myxStatisticsTimerange
 * @param {Function} onTimerangeChange Callback function on change `function(selectedMonths: MonthString[])`
 */
const myxStatisticsTimerange = function (onTimerangeChange) 
{
	/** @type {Array<MonthString>}
	 * @readonly
	 * To set use `setSelectedMonths()`
	 */
	let selectedMonths;

	function setMode (mode)
	{
		switch (mode)
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
		console.log("myxStatisticsTimerange.selectedMonths =", selectedMonths);
		if (typeof onTimerangeChange === "function")
		{
			onTimerangeChange(selectedMonths);
		}
	}

	return { // publish members
		get selectedMonths () { return selectedMonths; },
		/**
		 * Sets time range selection to a single month. Updates the menubox.
		 * @param {Date} month Month to set.
		 */
		selectMonth: (month) => { setMonth(month, true); },
		setMode: setMode,
		navigatePrevMonth: () => { setMonth(myx.expenses.selectedMonth.addMonths(-1)); },
		navigateNextMonth: () => { setMonth(myx.expenses.selectedMonth.addMonths(1)); },
		navigatePrevYear: () => { setYear(myx.expenses.selectedMonth.getFullYear() - 1); },
		navigateNextYear: () => { setYear(myx.expenses.selectedMonth.getFullYear() + 1); }
	};
};

/**
 * my-expenses "statistics" module.
 * @namespace myxStatistics
 */
const myxStatistics = function ()
{
	const MODULE_NAME = "statistics";
	let elements = getNames(document.getElementById(MODULE_NAME));
	let aggregator = myxStatisticAggregator();
	let timerange = myxStatisticsTimerange(onTimerageChange);
	/** @type {Object} */
	let data;

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

	elements.navigatePrevTime.onclick = (mouseEvent) =>
	{
		console.log(mouseEvent.target);
		switch (choices.chosen.timeRangeMode)
		{
			case "month":
				timerange.navigatePrevMonth();
				break;
			case "year":
				timerange.navigatePrevYear();
				break;
		}
		_refreshNavigatorButtons();
	};

	elements.navigateNextTime.onclick = (mouseEvent) =>
	{
		console.log(mouseEvent.target);
		switch (choices.chosen.timeRangeMode)
		{
			case "month":
				timerange.navigateNextMonth();
				break;
			case "year":
				timerange.navigateNextYear();
				break;
		}
		_refreshNavigatorButtons();
	};

	function _refreshNavigatorButtons ()
	{
		return;
		let actualMonth = myx.expenses.selectedMonth;
		switch (choices.chosen.timeRangeMode)
		{
			case "month":
				/* month selector */
				elements.navigatePrevTime.style.visibility = (myx.expenses.hasAnyData(actualMonth.addMonths(-1).toMonthString())) ? null : "hidden";
				elements.navigateNextTime.style.visibility = (myx.expenses.hasAnyData(actualMonth.addMonths(1).toMonthString())) ? null : "hidden";
				break;
			case "year":
				/* year selector */
				elements.navigatePrevTime.style.visibility = (myx.expenses.hasAnyData((new Date(actualMonth.addYears(-1).getFullYear(), 11, 1)).toMonthString())) ? null : "hidden";
				elements.navigateNextTime.style.visibility = (myx.expenses.hasAnyData((new Date(actualMonth.addYears(1).getFullYear(), 0, 1)).toMonthString())) ? null : "hidden";
				break;
		}
	}

	function onTimerangeNavigated (direction)
	{
		switch (choices.chosen.timeRangeMode)
		{
			case "month":
				{
					switch (direction)
					{
						case "prev":
							timerange.navigatePrevMonth();
							break;
						case "next":
							timerange.navigateNextMonth();
							break;
					}
				}
		}
		console.log(direction);
	}

	function onTimerangemodeChosen (choiceKey)
	{
		console.log(choiceKey);
		timerange.setMode(choiceKey);
	}

	function onCalculationmodeChosen (choiceKey)
	{
		console.log(choiceKey);
	}

	function onTimerageChange (timerange)
	{
		console.warn(timerange);
		aggregator.calc(timerange, "sum").then((aggregates) =>
		{
			data = aggregates;
			console.log("aggregator:", data);
			renderTotals();
			// settings.selectedTime.set(expenses.selectedMonth.toMonthString());
		});
	}

	/**
	 * Provides a HTML element that draws a progress bar.
	 * @param {String} baseClass CSS class name for percent bar element
	 * @param {Number} percentRatio Percentage (`0<n<1`) filled on the bar
	 * @param {String} color CSS color value for percentage
	 * @returns {HTMLDivElement}
	 */
	function renderPercentBar (baseClass, percentRatio, color)
	{
		let percentAsCssString = Math.round(percentRatio * 100) + "%;";
		let labelPosition = "left:" + ((percentRatio < 0.9) ? percentAsCssString : "calc(100% - 4.5em)") + ";";
		return htmlBuilder.newElement("div." + baseClass,
			{ style: "position:relative;" },
			htmlBuilder.newElement("div",
				{ style: "width:" + percentAsCssString + "height:100%;background-color:" + color + ";" }),
			htmlBuilder.newElement("div.label",
				{ style: "position:relative;" + labelPosition }, Math.round(percentRatio * 100) + fa.space + "%")
		);
	}

	function getTitle ()
	{
		let result = "";
		try
		{
			let calculationMode = ((choices.chosen.calculationMode === "sum") ? "total" : (choices.chosen.timeRangeMode === "month") ? "average" : "monthly average") + " expenses";
			if (choices.chosen.timeRangeMode === "alltime")
			{
				result = ["all time", calculationMode].join(" ");
			}
			else
			{
				let timeRange = (choices.chosen.timeRangeMode === "month") ? getFullMonthText(myx.expenses.selectedMonth) : myx.expenses.selectedMonth.getFullYear();
				result = [calculationMode, "in", timeRange].join(" ");
			}
			return result[0].toUpperCase() + result.substring(1);
		}
		catch (ex)
		{
			console.warn(ex);
			return "--";
		}
	}

	function renderTotals ()
	{
		if (myx.expenses.hasAnyData(myx.expenses.selectedMonth.toMonthString()))
		{
			htmlBuilder.removeAllChildren(elements.content);
			// console.log(selectedTime.months, mode);
			// let data = aggregator.calc(selectedTime.months);

			let title = "//TODO";
			/*
			if (selectedTime.value === "*")
			{
				title = "All logged expenses";
			}
			else if (/\d{4}-\d{2}/.test(selectedTime.value))
			{
				title = getFullMonthText(expenses.selectedMonth) + " total";
			}
			else
			{
				title = "Total expenses in " + settings.selectedTime.value;
			}
			*/
			/*
						let navItem = htmlBuilder.newElement("div.wide-flex");
						for (let year of aggregates.availibleYears.sort())
						{
							navItem.appendChild(htmlBuilder.newElement("div.dateitem",
								year,
								{ onclick: (e) => console.log(e) }));
						}
						// navItem.appendChild(htmlBuilder.newElement("div.monthslist.wide-flex"))
			*/
			elements.title.innerHTML = getTitle();
			elements.amount.innerHTML = myx.formatAmountLocale(data.sum);
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
								htmlBuilder.newElement("div.amt", myx.formatAmountLocale(subCat.sum)
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
							htmlBuilder.newElement("div.amount.right.big", myx.formatAmountLocale(catAggr.sum))
						),
						renderPercentBar("percentbar", catAggr.sum / data.sum, myx.categories.getColor(catAggr.catId)),
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
		choices.choose("time-range-mode", "month");
		choices.choose("calculation-mode", "sum");
		timerange.selectMonth(myx.expenses.selectMonth);
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
