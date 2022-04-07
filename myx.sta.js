/**
 * @typedef AggregateAtom
 * @type {Object}
 * @property {Number} sum
 * @property {Number} count
 */
/**
 * @typedef MonthAggregate
 * @type {Object}
 * @property {MonthString} month
 * @property {Number} sum
 * @property {Number} count
 */
/**
 * @typedef CategoryAggregate
 * @type {Object}
 * @property {String} id
 * @property {Number} sum
 * @property {Number} count
 * @property {Array<MonthAggregate>} month
 * @property {Array<CategoryAggregate>} [subCats]
 */

/**
 * my-expenses "expenses" module.
 * @param {myxExpenses} expenses
 * @param {myxPaymentMethods} paymentMethods 
 * @param {myxCategories} categories 
 * @returns 
 */
const myxStatistics = function (expenses, categories, paymentMethods)
{
	const MODULE_NAME = "statistics";
	let elements = getNames(document.getElementById(MODULE_NAME));

	elements.navCurrent.onclick = (mouseEvent) =>
	{
		expenses.popupAvalibleMonthsMenu(mouseEvent, elements.navCurrent, (month) =>
		{
			expenses.selectedMonth = month;
			renderList();
		});
	};

	function _sortBySum (a, b)
	{
		return (b.sum || 0) - (a.sum || 0);
	}

	/**
	 * Adds values (sum and count) of two aggregate atoms.
	 * @param {AggregateAtom} target Target object to add the values to; this will be modified
	 * @param {AggregateAtom} valueObject Object to add to target
	 */
	function add (target, valueObject)
	{
		target.sum += valueObject.sum;
		target.count += valueObject.count;
	}

	/**
	 * Sums up all expenses of given months. Provides sum and count per category and month.
	 * @param {MonthString|Array<MonthString>} months Months to aggregate
	 * @returns {{total: AggregateAtom, cats: Array<CategoryAggregate>}}
	 */
	function calcAggs (months)
	{
		if (typeof months === "string")
		{
			months = [months];
		}
		// first of all, build an temporary object that can take all data; aggs_ := { <cat>: { <month>: { sum, count } } }
		let aggs_ = {};
		let aggs = {
			total: {
				sum: 0,
				count: 0
			},
			cats: []
		};
		for (let masterCat of categories.masterCategoryIds)
		{
			for (let subCat of [masterCat].concat(categories.getSubCategories(masterCat)))
			{
				aggs_[subCat] = {};
				for (let month of months)
				{
					aggs_[subCat][month] = {
						sum: 0,
						count: 0
					};
				}
			}
		}
		// fill the temporary object with values
		for (let month of months)
		{
			for (let item of expenses.data[month])
			{
				if (paymentMethods.isExcluded(item.pmt) === false)
				{
					add(aggs_[item.cat][month], { sum: item.amt, count: 1 });
				}
			}
		}
		// reformat
		for (let masterCat of categories.masterCategoryIds)
		{
			let masterCatItem = {
				id: masterCat,
				sum: 0,
				count: 0,
				months: [],
				subCats: []
			};
			let catMonthly_ = {};
			for (let subCat of [masterCat].concat(categories.getSubCategories(masterCat)))
			{
				let subCatTotal = { id: subCat, sum: 0, count: 0, months: [] };
				for (let month of months)
				{
					catMonthly_[month] ||= { month: month, sum: 0, count: 0 };
					subCatTotal.months.push(Object.assign({ month: month }, aggs_[subCat][month]));
					add(subCatTotal, aggs_[subCat][month]);
					add(catMonthly_[month], aggs_[subCat][month]);
				}
				add(masterCatItem, subCatTotal);
				masterCatItem.subCats.push(subCatTotal);
			}
			masterCatItem.months = Object.values(catMonthly_);
			aggs.cats.push(masterCatItem);
			add(aggs.total, masterCatItem);
		}
		return (aggs);
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

	function toggleDetails (catId)
	{
		elements._self.querySelector("[data-cat='" + catId + "']").classList.toggle("hidden");
	};

	function onSubcatClick (mouseEvent)
	{
		mouseEvent.stopPropagation();
		let id = mouseEvent.target.closest("[data-cat]").dataset.cat;
		myx.setExpenseFilter({
			cat: id,
			months: [expenses.selectedMonth.asIsoString]
		}, MODULE_NAME);
	}

	function _renderNavItem (navElement, targetMonth)
	{
		navElement.parentElement.onclick = () =>
		{
			expenses.selectedMonth = targetMonth.date;
			expenses.setFilter({ months: [expenses.selectedMonth.asIsoString] });
			renderList();
		};
		navElement.innerText = targetMonth.shortName;
		navElement.parentElement.style.visibility = expenses.hasAnyData(targetMonth.isoString) ? "visible" : "hidden";
	}

	/**
	 * 
	 * @param {iso-string} month
	 */
	function renderList ()
	{
		elements.navCurrent.innerText = expenses.selectedMonth.asText;
		_renderNavItem(elements.navPrevious, calcRelativeMonth(expenses.selectedMonth, -1));
		_renderNavItem(elements.navNext, calcRelativeMonth(expenses.selectedMonth, +1));
		if (expenses.hasAnyData(expenses.selectedMonth.asIsoString))
		{
			htmlBuilder.removeAllChildren(elements.content);
			elements.content.appendChild(htmlBuilder.newElement("div.headline", "Total expenses per month"));
			let stats = calcAggs(expenses.selectedMonth.asIsoString);
			stats.cats.sort(_sortBySum);
			console.log(stats);
			elements.content.appendChild(htmlBuilder.newElement("div.item", htmlBuilder.newElement("div.flex-fill.big.bold", expenses.selectedMonth.asText + " total"), htmlBuilder.newElement("div.amt.big.bold", myx.formatAmountLocale(stats.total.sum))));
			for (let catAggr of stats.cats)
			{
				let subCatDiv = htmlBuilder.newElement("div.hidden", { 'data-cat': catAggr.id });
				if (catAggr.sum > 0)
				{
					catAggr.subCats.sort(_sortBySum);
					for (let subCat of catAggr.subCats)
					{
						if ((subCat.id !== catAggr.id) || (subCat.sum > 0))
						{
							subCatDiv.appendChild(htmlBuilder.newElement("div.subcat.wide-flex" + ".grey" + (subCat.sum === 0 ? ".zero-sum" : ""),
								{ 'data-cat': subCat.id, onclick: onSubcatClick },
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
					{ onclick: () => toggleDetails(catAggr.id) },
					categories.renderIcon(catAggr.id),
					htmlBuilder.newElement(
						"div.flex-fill.high-flex",
						htmlBuilder.newElement(
							"div.flex-fill.wide-flex",
							htmlBuilder.newElement("div.flex-fill.cutoff.big", categories.getLabel(catAggr.id)),
							htmlBuilder.newElement("div.amount.right.big", myx.formatAmountLocale(catAggr.sum))
						),
						renderPercentBar("percentbar", catAggr.sum / stats.total.sum, categories.getColor(catAggr.id)),
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

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		calc: calcAggs, // TODO: debug only
		enter: renderList,
	};
};
