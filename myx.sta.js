const myxStatistics = function (myx, expenses, categories, paymentMethods)
{
	const MODULE_NAME = "statistics";
	let elements = getNames(document.getElementById(MODULE_NAME));

	function calcAggs (...months)
	{
		function _sumUp (prev, curr)
		{
			if (paymentMethods.isExcluded(curr.pmt) === false)
			{
				prev[curr.cat] ||= { cat: curr.cat, count: 0, sum: 0 };
				prev[curr.cat].sum += curr.amt;
				prev[curr.cat].count += 1;
			}
			return prev;
		}
		let aggs = {};
		let totals = { sum: 0, count: 0 };
		if (months.length === 0)
		{
			months = Object.keys(expenses.data);
		}
		for (let month of months)
		{
			expenses.data[month].reduce(_sumUp, aggs);
		}
		for (let masterCat of categories.masterCategoryIds)
		{
			aggs[masterCat] ||= { cat: masterCat, count: 0, sum: 0 };
			aggs[masterCat].total_sum = aggs[masterCat].sum;
			aggs[masterCat].total_count = aggs[masterCat].count;
			aggs[masterCat].subCats = [];
			for (let subCat of categories.getSubCategories(masterCat) || [])
			{
				if (aggs[subCat])
				{
					aggs[masterCat].total_sum += aggs[subCat].sum;
					aggs[masterCat].total_count += aggs[subCat].count;
					aggs[masterCat].subCats.push(aggs[subCat]);
				}
				else
				{
					aggs[masterCat].subCats.push({ cat: subCat, sum: 0, count: 0 });
				}
			}
			if (aggs[masterCat].sum > 0)
			{
				aggs[masterCat].subCats.push({ cat: masterCat, sum: aggs[masterCat].sum, count: aggs[masterCat].count });
			}
			aggs[masterCat].subCats.sort((a, b) => (b.sum || 0) - (a.sum || 0));
			totals.sum += aggs[masterCat].total_sum;
			totals.count += aggs[masterCat].total_count;
		}
		return { totals: totals, aggs: Object.values(aggs) };
	}

	/**
	 * 
	 * @param {string} baseClass css class name for percent bar element
	 * @param {number} percentRatio 
	 * @param {css-color-string} color color for percentage
	 * @returns {HTMLDIVElement}
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
				{ style: "position:relative;" + labelPosition }, Math.round(percentRatio * 100) + "&#x00a0;%")
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
		expenses.setFilter({ months: [myx.selectedMonth.asIsoString], cat: id });
		choices.choose("active-tab", myx.expenses.moduleName);
	}

	function _renderNavItem (navElement, targetMonth)
	{
		navElement.parentElement.onclick = () =>
		{
			myx.selectedMonth = targetMonth.isoString;
			expenses.setFilter({ months: [myx.selectedMonth.asIsoString] });
			renderList();
		};
		navElement.innerText = targetMonth.shortName;
		navElement.parentElement.style.visibility = expenses.hasAnyData(myx.selectedMonth.asIsoString) || expenses.hasAnyData(targetMonth.isoString) ? "visible" : "hidden";
	}

	/**
	 * 
	 * @param {iso-string} month
	 */
	function renderList ()
	{
		// myx.selectedMonth = month;
		// let monthAsDate = new Date(month);
		elements.navCurrent.innerText = myx.selectedMonth.asText;
		_renderNavItem(elements.navPrevious, calcRelativeMonth(myx.selectedMonth.asIsoString, -1));
		_renderNavItem(elements.navNext, calcRelativeMonth(myx.selectedMonth.asIsoString, +1));
		if (expenses.hasAnyData(myx.selectedMonth.asIsoString))
		{
			htmlBuilder.removeAllChildren(elements.content);
			elements.content.appendChild(htmlBuilder.newElement("div.headline", "Total expenses per month"));
			let stats = calcAggs(myx.selectedMonth.asIsoString);
			stats.aggs.sort((a, b) => (b.total_sum || 0) - (a.total_sum || 0));
			console.log(stats);
			elements.content.appendChild(htmlBuilder.newElement("div.item", htmlBuilder.newElement("div.flex-fill.big.bold", myx.selectedMonth.asText + " total"), htmlBuilder.newElement("div.amt.big.bold", myx.formatAmountLocale(stats.totals.sum))));
			for (let item of stats.aggs)
			{
				if (item.total_sum !== undefined)
				{
					let subCatDiv = htmlBuilder.newElement("div.hidden", { 'data-cat': item.cat });
					if (item.total_sum > 0)
					{
						for (let subCat of item.subCats)
						{
							subCatDiv.appendChild(htmlBuilder.newElement("div.subcat.wide-flex" + ".grey" + (subCat.sum === 0 ? ".zero-sum" : ""),
								{ 'data-cat': subCat.cat, onclick: onSubcatClick },
								categories.renderIcon(subCat.cat),
								htmlBuilder.newElement("div.flex-fill.click",
									categories.getLabel(subCat.cat, false)),
								htmlBuilder.newElement("div.amt", myx.formatAmountLocale(subCat.sum)
								)));
						}
					}
					let div = htmlBuilder.newElement(
						"div.item.click" + (item.total_sum === 0 ? ".zero-sum" : ""),
						{ onclick: () => toggleDetails(item.cat) },
						categories.renderIcon(item.cat),
						htmlBuilder.newElement(
							"div.flex-fill.high-flex",
							htmlBuilder.newElement(
								"div.flex-fill.wide-flex",
								htmlBuilder.newElement("div.flex-fill.cutoff.big", categories.getLabel(item.cat)),
								htmlBuilder.newElement("div.amount.right.big", myx.formatAmountLocale(item.total_sum))
							),
							renderPercentBar("percentbar", item.total_sum / stats.totals.sum, categories.getColor(item.cat)),
							subCatDiv
						)
					);
					elements.content.appendChild(div);
				}
			}
		}
		else
		{
			htmlBuilder.replaceContent(elements.content, htmlBuilder.newElement("div.fullscreen-msg",
				htmlBuilder.newElement("div.icon.far", "&#xf11a;"),
				htmlBuilder.newElement("div.label", "Nothing here.")
			));
		}
	}

	return { // publish members
		get moduleName () { return MODULE_NAME; },
		calc: calcAggs,
		enter: renderList,
	};
};
