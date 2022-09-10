const myxHome = function ()
{
	const MODULE_NAME = "home-tab";

	let elements = document.getElementById("home-tab").getNamedChildren();

	/**
	 * Current date.
	 */
	let now = new Date();

	/**
	 * Action for clicking the this months total filter icon.
	 * Switches to statistics tab.
	 */
	elements.get("filter-sum-button").onclick = function onFilterSumButtonClick (event)
	{
		let filterMenu = new FilterMenu();
		filterMenu.popup(event, elements.get("filter-sum-button"), "end right, below bottom");
		myx.showNotification("Not implemented yet.");
	};

	/**
	 * Action for clicking the this months total number.
	 * Switches to statistics tab.
	 */
	elements.get("this-month-total").onclick = function onThisMonthTotalClick ()
	{
		choices.set("active-tab", myx.statistics.moduleName, new Event("dummy, required for interactivity"));
	};

	/**
	 * Action for clicking the "forward to expenses" icon.
	 * Switches to expenses tab.
	 */
	elements.get("goto-expenses-button").onclick = elements.get("latest-expense-wrapper").onclick = function onGotoExpensesButtonClick ()
	{
		choices.set("active-tab", myx.expenses.moduleName, new Event("dummy, required for interactivity"));
	};

	/**
	 * Action for clicking the "edit categories" icon.
	 * Switches to categories tab.
	 */
	elements.get("goto-categories-button").onclick = function onGotoCategoriesButtonClick ()
	{
		choices.set("active-tab", myx.categories.moduleName, new Event("dummy, required for interactivity"));
	};

	/**
	 * Initializes the module.
	 */
	async function init ()
	{
		// May be required by interface.
	}

	/**
	 * Renders the "Expenses this month so far" content.
	 */
	function renderMonthTotal ()
	{
		let thisMonth = now.toMonthString();
		elements.get("headline").innerHTML = now.format("dddd, d. mmmm yyyy");
		myx.repeatings.process(thisMonth);
		myx.statistics.aggregator.calc([thisMonth]).then((aggs) =>
		{
			elements.get("this-month-total").innerText = myx.formatAmountLocale(aggs.meta.sum);
		});
	}

	/**
	 * Renders the month and budget progress bars.
	 */
	function renderProgress ()
	{
		let bom = new Date(now.getFullYear(), now.getMonth(), 0);
		let eom = now.endOfMonth();
		let monthProgress = (now - bom) / (eom - bom);
		htmlBuilder.replaceContent(
			elements.get("progress-bar-month"),
			myx.statistics.renderPercentBar("percentbar", monthProgress, "var(--primary-color)")
		);
		// TODO: Budget
		htmlBuilder.replaceContent(
			elements.get("progress-bar-budget"),
			myx.statistics.renderPercentBar("percentbar", 0, "var(--complementary-color)")
		);
	}

	/**
	 * Renders the last expense panel.
	 * // TODO: Handle no expenses.
	 */
	function renderLastExpense ()
	{
		let thisMonthsExpenses = myx.expenses.data[now.toMonthString()];
		let lastExpenseIndex = thisMonthsExpenses.length - 1;
		let lastExpense = thisMonthsExpenses[lastExpenseIndex];
		let lastExpenseElement = myx.expenses.renderItem(lastExpense, lastExpenseIndex);
		lastExpenseElement.setStyles({
			border: "none",
			padding: "0",
			backgroundColor: "transparent"
		});
		lastExpenseElement.assginProperties({
			onpointerdown: null,
			onpointerup: null
		});
		let lastExpenseDaysAgo = Date.daysBetween(lastExpense.dat, new Date());
		elements.get("latest-expense-date").innerText = Date.locales.relativeDayNames[lastExpenseDaysAgo] || lastExpense.dat.format("dddd, d. mmmm");
		htmlBuilder.replaceContent(elements.get("latest-expense-item"), lastExpenseElement);
	}

	/**
	 * Renders the category selection panel to quick add an expense.
	 */
	function renderAddExpensePanel ()
	{
		let selectorContainer = elements.get("category-selector");
		htmlBuilder.removeAllChildren(selectorContainer);
		for (let item of CategorySelector.getMasters().values())
		{
			selectorContainer.appendChild(htmlBuilder.newElement("div.item.labeled-icon.click",
				{ 'data-id': item.id, onclick: onCategoryItemClick },
				item.renderIcon(),
				htmlBuilder.newElement("div.label", item.label))
			);
		}
	}

	/**
	 * Actions on setting the module the active tab.
	 */
	function enter ()
	{
		now = new Date();
		renderMonthTotal();
		renderProgress();
		renderLastExpense();
		renderAddExpensePanel();
		elements.get("content").scrollTo({ top: 0 });
	};

	/**
	 * Event handler for selecting a category.
	 * 
	 * Pops up the ExpenseEditor with the selected category pre-set.
	 * 
	 * @param {IdString} catId Id of selected category
	 */
	function onCategoryItemClick (event)
	{
		myx.addExpense(new Expense(null, { cat: event.target.closest("[data-id]").dataset.id }));
	}

	return {
		get moduleName () { return MODULE_NAME; },
		init: init,
		enter: enter
	};
};