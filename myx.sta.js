/**
 * my-expenses "statistics" module.
 * @param {myxExpenses} expenses
 * @param {myxPaymentMethods} paymentMethods 
 * @param {myxCategories} categories 
 * @returns 
 */
const myxStatistics = function (expenses, categories, paymentMethods)
{
	const MODULE_NAME = "statistics";
	const MODE = {
		sumPerMonth: "sumPerMonth",
		sumPerYear: "sumPerYear",
		avg: "avg"
	};
	let aggregates = myxStatisticAggregator(expenses, categories, paymentMethods);
	let elements = getNames(document.getElementById(MODULE_NAME));
	/** 
	 * Represents the current statistics mode. Must be a value of `MODE`.
	 * @type {String} */
	let mode;

	/**
	 * Handles the currently selected time range, whicht is either
	 * - a single month
	 * - all months in a year or
	 * - all time data.
	 */
	let selectedTime = function ()
	{
		/** @type {"yyyy-mm"|"yyyy"|"*"} */
		let selectedTime;
		/** @type {Array<MonthString>} */
		let selectedMonths;
		/**
		 * @param {"yyyy-mm"|"yyyy"|"*"} value 
		 */
		function set (value)
		{
			console.log("set selectedTime", value);
			selectedTime = value;
			/** @type {Array<MonthString>} */
			if (value === "*")
			{
				selectedMonths = aggregates.availibleMonths;
			}
			else if ((/^\d{4}$/.test(value) === true) || (mode === MODE.sumPerYear))
			{
				selectedMonths = [];
				selectedTime = value.substring(0, 4);
				for (let month of aggregates.availibleMonths)
				{
					if (month.substring(0, 4) === selectedTime)
					{
						selectedMonths.push(month);
					}
				}
			}
			else if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
			{
				expenses.selectedMonth = new Date(value);
				selectedMonths = [value];
			}
			renderList();
		}
		return {
			set: set,
			get value () { return selectedTime; },
			get months () { return selectedMonths; }
		};
	}();

	let statisticsModeMenu = new Menubox("statistics-type", {
		items: [
			{
				key: MODE.sumPerMonth,
				iconHtml: htmlBuilder.newElement("i.fas.icon", fa.calendar_day),
				label: "Total expenses per month"
			},
			{
				key: MODE.sumPerYear,
				iconHtml: htmlBuilder.newElement("i.fas.icon", fa.calendar_alt),
				label: "Total expenses per year",
			}
			/*,{
				key: MODE.avg,
				label: "Monthly averages"
			}*/
		]
	}, (menuboxEvent) => setMode(menuboxEvent.itemKey));

	elements.navCurrent.onclick = (mouseEvent) =>
	{
		switch (mode)
		{
			case MODE.sumPerMonth:
				expenses.popupAvalibleMonthsMenu(mouseEvent, elements.navCurrent, (month) =>
				{
					selectedTime.set(month.toMonthString());
				});
				break;
			case MODE.sumPerYear:
				popupAvailibleYearsMenu(mouseEvent, elements.navCurrent, (year) =>
				{
					selectedTime.set(year);
				});
				break;
		}
	};
	elements.headline.onclick = (mouseEvent) =>
	{
		statisticsModeMenu.popup(mouseEvent, null, mouseEvent.target.closest(".headline"), "below bottom, start left");
	};

	/**
	 * Pops up a menu with all availible years (and an "all time" item).
	 * @param {Event} event Event that triggered the menu request
	 * @param {HTMLElement} alignElement Element to align the menu to (alignment is "start left, below bottom")
	 * @param {Function} callback `function(year: String)` to call on selection
	 */
	function popupAvailibleYearsMenu (event, alignElement, callback)
	{
		let menuItems = [];
		for (let year of aggregates.availibleYears.sort().reverse())
		{
			menuItems.push({ key: year });
		}
		menuItems.push(
			{ separator: {} },
			{ key: "*", label: "All time" }
		);
		let menubox = new Menubox("years-selection", { items: menuItems }, (event) =>
		{
			callback(event.itemKey);
		});
		menubox.popup(event, null, alignElement, "center, below bottom");
	}

	/**
	 * Sets the statistics mode. Automatically selects time range and renders client.
	 * @param {MODE} newMode New mode to set
	 */
	function setMode (newMode)
	{
		if (newMode !== mode)
		{
			mode = newMode;
			htmlBuilder.replaceContent(elements.headline, htmlBuilder.newElement("div.click",
				htmlBuilder.newElement("span.fas", fa.bars),
				htmlBuilder.newElement("span", fa.space + statisticsModeMenu.items[newMode].label)
			));
			console.log("mode:", mode);
			switch (mode)
			{
				case MODE.sumPerMonth:
					selectedTime.set((/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedTime.value)) ? selectedTime.value : expenses.selectedMonth.toMonthString());
					break;
				case MODE.sumPerYear:
					selectedTime.set(selectedTime.value.substring(0, 4));
					break;
			}
		}
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

	function _renderNavItem (navElement, targetSelection)
	{
		navElement.parentElement.onclick = () =>
		{
			selectedTime.set(targetSelection);
		};
		navElement.innerText = (mode === MODE.sumPerMonth) ? getShortMonthText(new Date(targetSelection)) : targetSelection;
		navElement.parentElement.style.visibility = ((mode === MODE.sumPerMonth) ? aggregates.availibleMonths.includes(targetSelection) : aggregates.availibleYears.includes(targetSelection)) ? "visible" : "hidden";
	}

	function _renderNavBar ()
	{
		console.log("_renderNavBar()", mode, selectedTime.value, selectedTime.months);
		if (mode === MODE.sumPerMonth)
		{
			elements.navCurrent.innerText = getFullMonthText(expenses.selectedMonth);
			_renderNavItem(elements.navPrevious, expenses.selectedMonth.addMonths(-1).toMonthString());
			_renderNavItem(elements.navNext, expenses.selectedMonth.addMonths(+1).toMonthString());
		}
		else
		{
			if (selectedTime.value === "*")
			{
				elements.navCurrent.innerText = "All time";
				elements.navPrevious.parentElement.style.visibility = "hidden";
				elements.navNext.parentElement.style.visibility = "hidden";
			}
			else
			{
				elements.navCurrent.innerText = selectedTime.value;
				_renderNavItem(elements.navPrevious, (Number(selectedTime.value) - 1).toString());
				_renderNavItem(elements.navNext, (Number(selectedTime.value) + 1).toString());
			}
		}
	}

	function renderList ()
	{
		_renderNavBar();
		if (expenses.hasAnyData(expenses.selectedMonth.toMonthString()))
		{
			htmlBuilder.removeAllChildren(elements.content);
			console.log(selectedTime.months, mode);
			let data = aggregates.calc(selectedTime.months);

			let title = "";
			if (mode === MODE.sumPerMonth)
			{
				title = getFullMonthText(expenses.selectedMonth) + " total";
			}
			else if (mode === MODE.sumPerYear)
			{
				if (selectedTime.value === "*")
				{
					title = "All logged expenses";
				}
				else
				{
					title = "Total expenses in " + selectedTime.value;
				}
			}
			elements.content.appendChild(htmlBuilder.newElement("div.item",
				htmlBuilder.newElement("div.flex-fill.big.bold", title),
				htmlBuilder.newElement("div.amt.big.bold", myx.formatAmountLocale(data.total.sum)))
			);
			for (let catAggr of data.cats)
			{
				let subCatDiv = htmlBuilder.newElement("div.hidden", { 'data-cat': catAggr.id });
				if (catAggr.sum > 0)
				{
					for (let subCat of catAggr.subCats)
					{
						if ((subCat.id !== catAggr.id) || (subCat.sum > 0))
						{
							subCatDiv.appendChild(htmlBuilder.newElement("div.subcat.wide-flex" + ".grey" + (subCat.sum === 0 ? ".zero-sum" : ""),
								{ 'data-cat': subCat.id, onclick: onSubcategoryClick },
								categories.renderIcon(subCat.id),
								htmlBuilder.newElement("div.flex-fill.click",
									categories.getLabel(subCat.id, false)),
								htmlBuilder.newElement("div.amt", myx.formatAmountLocale(subCat.sum)
								)));
						}
					}
				}
				let div = htmlBuilder.newElement(
					"div.item.click" + (catAggr.sum === 0 ? ".zero-sum" : ""),
					{ onclick: () => toggleSubcategoryVisibility(catAggr.id) },
					categories.renderIcon(catAggr.id),
					htmlBuilder.newElement(
						"div.flex-fill.high-flex",
						htmlBuilder.newElement(
							"div.flex-fill.wide-flex",
							htmlBuilder.newElement("div.flex-fill.cutoff.big", categories.getLabel(catAggr.id)),
							htmlBuilder.newElement("div.amount.right.big", myx.formatAmountLocale(catAggr.sum))
						),
						renderPercentBar("percentbar", catAggr.sum / data.total.sum, categories.getColor(catAggr.id)),
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
		aggregates.init().then(() =>
		{
			selectedTime.set(expenses.selectedMonth.toMonthString());
			if (mode === undefined)
			{
				setMode(MODE.sumPerMonth);
			}
		});
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
			months: selectedTime.months
		}, MODULE_NAME);
	}

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		get aggregates () { return aggregates; }, // TODO: debug only
		get selectedTime () { return selectedTime; }, //TODO: debug only
		enter: enter

		,
		getApexchartData: (months) =>
		{
			let apexSeries = [];
			let monthlyTranspose = {};
			for (let cat of categories.masterCategoryIds)
			{
				monthlyTranspose[cat] = [];
			}
			for (let month of months)
			{
				let aggs = aggregates.calc([month]);
				{
					for (let cat of aggs.cats)
					{
						monthlyTranspose[cat.id].push(Math.ceil(cat.sum));
					}
				}
			}
			console.log(monthlyTranspose);
			for (let cat in monthlyTranspose)
			{
				apexSeries.push({ name: categories.getLabel(cat), id: cat, data: monthlyTranspose[cat] });
			}
			return apexSeries;
		},
		getApexchartDountData: (months) =>
		{
			let apexSeries = [];
			console.log(months);
			let aggs = aggregates.calc(months);
			{
				for (let cat of aggs.cats)
				{
					apexSeries.push(Math.ceil(cat.sum));
				}
			}
			return apexSeries;
		}
	};
};
