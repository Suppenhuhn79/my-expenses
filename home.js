const myxHome = function ()
{
	const MODULE_NAME = "home-tab";

	let elements = document.getElementById("home-tab").getNamedChildren();
	let categorySelector = new CategorySelector(elements.get("category-selector"), onCategoryChosen, true);

	/**
	 * Action for clicking the this months total filter icon.
	 * Switches to statistics tab.
	 */
	elements.get("filter-sum-button").onclick = function onFilterSumButtonClick ()
	{
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
	function init ()
	{
		// May be required by interface.
	}

	/**
	 * Actions on setting the module the active tab.
	 */
	function enter ()
	{
		elements.get("headline").innerHTML = (new Date()).format("dddd, d. mmmm yyyy");
		myx.statistics.aggregator.calc([(new Date()).toMonthString()]).then((aggs) =>
		{
			elements.get("this-month-total").innerText = myx.formatAmountLocale(aggs.sum);
		});
		let thisMonthsExpenses = myx.expenses.data[(new Date()).toMonthString()];
		// TODO: Handle no expenses.
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
		categorySelector.refresh();
		elements.get("content").scrollTo({ top: 0 });
	};

	/**
	 * Event handler for selecting a category.
	 * 
	 * Pops up the ExpenseEditor with the selected category pre-set.
	 * 
	 * @param {IdString} catId Id of selected category
	 */
	function onCategoryChosen (catId)
	{
		myx.addExpense(new Expense(null, { cat: catId }));
		categorySelector.refresh(); // deselect selected category
	}

	return {
		get moduleName () { return MODULE_NAME; },
		init: init,
		enter: enter
	};
};